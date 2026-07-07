const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const http = require("http");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const dotenvPath = path.join(__dirname, "../.env");
const dotenvResult = require("dotenv").config({ path: dotenvPath });
if (dotenvResult.error) {
  console.warn(`[env] backend/.env not loaded from ${dotenvPath}; using existing process environment.`);
} else {
  console.log(`[env] backend/.env loaded from ${dotenvPath}`);
}

const connectDatabase = require("./config/database");
const { errorMiddleware, notFound } = require("./middleware/errorMiddleware");
const swaggerSpec = require("./docs/swagger");
const {
  completeExpiredBookings,
  migrateExistingBookingLifecycles,
  startBookingLifecycleWorker,
} = require("./services/bookingLifecycleService");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const turfRoutes = require("./routes/turfRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const coachingRoutes = require("./routes/coachingRoutes");
const {
  apiLimiter,
  rejectUnsafeKeys,
} = require("./middleware/securityMiddleware");

function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
}

const app = express();
const isVercelRuntime = process.env.VERCEL === "1";
let runtimeReadyPromise = null;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Not allowed by CORS");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api", apiLimiter);
app.use("/api", rejectUnsafeKeys);
app.use("/api", async (req, res, next) => {
  if (!isVercelRuntime || !runtimeReadyPromise) return next();

  try {
    await runtimeReadyPromise;
    return next();
  } catch (error) {
    return next(error);
  }
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TURFX API is running",
    data: {
      docs: "/api/docs",
      health: "/api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/coaching", coachingRoutes);

app.use(notFound);
app.use(errorMiddleware);

const port = process.env.PORT || 5000;

function explainListenFailure(error) {
  if (error.code === "EADDRINUSE") {
    console.error(`[server] Port ${port} is already in use.`);
    console.error("[server] Another TURFX backend/dev process is probably still running.");
    console.error("[server] Stop the existing process, then run `npm run dev` again.");
    return;
  }

  console.error(`Failed to start server: ${error.message}`);
}

function listen() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      console.log(`TURFX API listening on port ${port}`);
      resolve(server);
    });
  });
}

async function migrateLegacyVenueApprovals() {
  const Turf = require("./models/Turf");

  await Turf.updateMany(
    {
      approvalStatus: { $exists: false },
      isApproved: true,
      $or: [
        { status: { $in: ["ACTIVE", "LIVE"] } },
        { moderationStatus: "approved" },
        { status: { $exists: false } },
      ],
    },
    {
      $set: {
        approvalStatus: "APPROVED",
        isPublished: true,
        isVerified: true,
        moderationStatus: "approved",
        status: "ACTIVE",
        visibility: "PUBLIC",
      },
    },
  );

  await Turf.updateMany(
    { approvalStatus: { $exists: false } },
    {
      $set: {
        approvalStatus: "PENDING",
        isApproved: false,
        isPublished: false,
        isVerified: false,
        moderationStatus: "pending",
        status: "PENDING",
        visibility: "PRIVATE",
      },
    },
  );
}

async function prepareRuntime({ runStartupMaintenance = true, startWorker = true } = {}) {
  await connectDatabase();

  if (!runStartupMaintenance) return;

  await migrateLegacyVenueApprovals();
  await migrateExistingBookingLifecycles();
  await completeExpiredBookings();

  if (startWorker) {
    startBookingLifecycleWorker();
  }
}

if (process.env.NODE_ENV !== "test") {
  validateProductionEnvironment();

  runtimeReadyPromise = prepareRuntime({
    runStartupMaintenance: !isVercelRuntime,
    startWorker: !isVercelRuntime,
  }).then(() => {
    if (isVercelRuntime) {
      console.log("[server] Vercel runtime detected; skipping local HTTP listener and background worker.");
      return undefined;
    }

    return listen();
  });

  runtimeReadyPromise.catch((error) => {
    explainListenFailure(error);

    if (!isVercelRuntime) {
      process.exit(1);
    }
  });
}

module.exports = app;
