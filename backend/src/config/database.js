const dns = require("dns");
const { Resolver } = require("dns").promises;
const mongoose = require("mongoose");

const DEFAULT_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];
let lifecycleLoggingRegistered = false;

function redactMongoUri(uri) {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

function getMongoDriverVersion() {
  try {
    return require("mongoose/node_modules/mongodb/package.json").version;
  } catch {
    try {
      return require("mongodb/package.json").version;
    } catch {
      return "unknown";
    }
  }
}

function registerConnectionLifecycleLogs() {
  if (lifecycleLoggingRegistered) return;
  lifecycleLoggingRegistered = true;

  mongoose.connection.on("connecting", () => console.log("[db] mongoose connecting"));
  mongoose.connection.on("connected", () => console.log("[db] mongoose connected"));
  mongoose.connection.on("disconnected", () => console.log("[db] mongoose disconnected"));
  mongoose.connection.on("reconnected", () => console.log("[db] mongoose reconnected"));
  mongoose.connection.on("error", (error) => console.error(`[db] mongoose error: ${error.message}`));
}

function parseDnsServers() {
  return (process.env.MONGO_DNS_SERVERS || DEFAULT_DNS_SERVERS.join(","))
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
}

function isLoopbackDnsServer(server = "") {
  const normalized = String(server).replace(/^\[|\]$/g, "");
  return normalized === "127.0.0.1" || normalized === "::1" || normalized === "localhost";
}

function configureMongoDnsServers() {
  const currentServers = dns.getServers();
  const shouldUsePublicDns =
    process.env.MONGO_USE_SYSTEM_DNS !== "true" &&
    (!currentServers.length || currentServers.some(isLoopbackDnsServer));

  if (!shouldUsePublicDns) return;

  const fallbackServers = parseDnsServers();
  dns.setServers(fallbackServers);
  console.warn(
    `[db] system DNS servers (${currentServers.join(", ") || "none"}) cannot resolve Atlas SRV reliably; using ${fallbackServers.join(", ")} for Mongo lookups.`,
  );
}

function parseMongoUri(rawUri) {
  const mongoUri = rawUri.trim();

  if (rawUri !== mongoUri) {
    console.warn("[db] MONGO_URI had leading or trailing whitespace; using trimmed value.");
  }

  let parsedUri;
  try {
    parsedUri = new URL(mongoUri);
  } catch (error) {
    throw new Error(`MONGO_URI is malformed: ${error.message}`);
  }

  if (!["mongodb:", "mongodb+srv:"].includes(parsedUri.protocol)) {
    throw new Error("MONGO_URI must start with mongodb:// or mongodb+srv://");
  }

  return { mongoUri, parsedUri };
}

async function logSrvDiagnostics(hostname) {
  const srvName = `_mongodb._tcp.${hostname}`;
  console.log(`[db] default DNS servers: ${dns.getServers().join(", ") || "none"}`);

  try {
    const records = await dns.promises.resolveSrv(srvName);
    console.log(`[db] default SRV lookup ok: ${records.length} record(s)`);
  } catch (error) {
    console.warn(`[db] default SRV lookup failed: ${error.code || error.message} ${srvName}`);
  }
}

async function resolveAtlasRecordsWithFallbackDns(hostname) {
  const dnsServers = parseDnsServers();
  const srvName = `_mongodb._tcp.${hostname}`;
  const resolver = new Resolver();
  resolver.setServers(dnsServers);

  console.log(`[db] fallback DNS servers: ${dnsServers.join(", ")}`);

  const srvRecords = await resolver.resolveSrv(srvName);
  let txtParams = new URLSearchParams();

  try {
    const txtRecords = await resolver.resolveTxt(hostname);
    txtParams = new URLSearchParams(txtRecords.flat().join("&"));
  } catch (error) {
    console.warn(`[db] fallback TXT lookup failed: ${error.code || error.message}; defaulting authSource=admin.`);
  }

  return { srvRecords, txtParams };
}

async function buildSeedListUriFromSrv(mongoUri, parsedUri) {
  const { srvRecords, txtParams } = await resolveAtlasRecordsWithFallbackDns(parsedUri.hostname);
  const hosts = srvRecords
    .sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name))
    .map((record) => `${record.name.replace(/\.$/, "")}:${record.port}`);

  if (!hosts.length) {
    throw new Error("Atlas SRV fallback did not return any hosts.");
  }

  const params = new URLSearchParams(parsedUri.searchParams);
  txtParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  if (!params.has("tls") && !params.has("ssl")) params.set("tls", "true");
  if (!params.has("authSource")) params.set("authSource", "admin");
  if (!params.has("retryWrites")) params.set("retryWrites", "true");
  if (!params.has("w")) params.set("w", "majority");

  const auth = parsedUri.username
    ? `${parsedUri.username}${parsedUri.password ? `:${parsedUri.password}` : ""}@`
    : "";
  const pathname = parsedUri.pathname || "/";
  const query = params.toString();
  const fallbackUri = `mongodb://${auth}${hosts.join(",")}${pathname}${query ? `?${query}` : ""}`;

  console.log(`[db] Atlas SRV fallback built seed list with ${hosts.length} host(s).`);
  console.log(`[db] Atlas SRV fallback URI: ${redactMongoUri(fallbackUri)}`);

  return fallbackUri;
}

function isSrvResolutionError(error) {
  return (
    error?.code === "ECONNREFUSED" ||
    error?.syscall === "querySrv" ||
    /querySrv|SRV/i.test(error?.message || "")
  );
}

async function connectWithFallback(mongoUri, parsedUri) {
  const connectionOptions = {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 15000),
  };

  try {
    return await mongoose.connect(mongoUri, connectionOptions);
  } catch (error) {
    if (parsedUri.protocol !== "mongodb+srv:" || !isSrvResolutionError(error)) {
      throw error;
    }

    console.warn(`[db] mongodb+srv connection failed during SRV lookup: ${error.code || error.message}`);
    console.warn("[db] Retrying Atlas connection with DNS-resolved mongodb:// seed list.");

    const fallbackUri = await buildSeedListUriFromSrv(mongoUri, parsedUri);
    try {
      return await mongoose.connect(fallbackUri, connectionOptions);
    } catch (fallbackError) {
      console.error(`[db] Atlas seed-list fallback failed: ${fallbackError.message}`);
      console.error("[db] Check that your current IP is allowed in MongoDB Atlas Network Access and that outbound port 27017 is not blocked.");
      throw fallbackError;
    }
  }
}

async function connectDatabase() {
  const rawMongoUri = process.env.MONGO_URI;

  if (!rawMongoUri) {
    throw new Error("MONGO_URI is required. Add it to backend/.env before starting the server.");
  }

  const { mongoUri, parsedUri } = parseMongoUri(rawMongoUri);

  console.log(`[db] MONGO_URI exists: ${Boolean(mongoUri)}`);
  console.log(`[db] MONGO_URI value: ${redactMongoUri(mongoUri)}`);
  console.log(`[db] Node ${process.version}, mongoose ${mongoose.version}, mongodb driver ${getMongoDriverVersion()}`);

  mongoose.set("strictQuery", true);
  registerConnectionLifecycleLogs();

  if (parsedUri.protocol === "mongodb+srv:") {
    configureMongoDnsServers();
    await logSrvDiagnostics(parsedUri.hostname);
  }

  const connection = await connectWithFallback(mongoUri, parsedUri);
  console.log(`MongoDB connected: ${connection.connection.host}`);

  return connection;
}

module.exports = connectDatabase;
