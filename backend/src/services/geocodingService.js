const EARTH_RADIUS_KM = 6371;

const KNOWN_PLACES = {
  "andheri east mumbai": { latitude: 19.1155, longitude: 72.8697 },
  "anna nagar chennai": { latitude: 13.085, longitude: 80.2101 },
  "bandra west mumbai": { latitude: 19.0607, longitude: 72.8362 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  coimbatore: { latitude: 11.0168, longitude: 76.9558 },
  hyderabad: { latitude: 17.385, longitude: 78.4867 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  "koregaon park pune": { latitude: 18.5362, longitude: 73.8938 },
  madurai: { latitude: 9.9252, longitude: 78.1198 },
  mumbai: { latitude: 19.076, longitude: 72.8777 },
  nagercoil: { latitude: 8.178, longitude: 77.4344 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  thiruvananthapuram: { latitude: 8.5241, longitude: 76.9366 },
  trivandrum: { latitude: 8.5241, longitude: 76.9366 },
};

function normalizeKey(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function parseCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function isValidLatitude(value) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function normalizePrecision(value) {
  return Number(Number(value).toFixed(6));
}

function buildGeoPoint(longitude, latitude) {
  const safeLongitude = parseCoordinate(longitude);
  const safeLatitude = parseCoordinate(latitude);

  if (!isValidLongitude(safeLongitude) || !isValidLatitude(safeLatitude)) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [normalizePrecision(safeLongitude), normalizePrecision(safeLatitude)],
  };
}

function coordinatesFromGeoPoint(point) {
  if (!point || point.type !== "Point" || !Array.isArray(point.coordinates)) return null;
  const [longitude, latitude] = point.coordinates.map(parseCoordinate);
  if (!isValidLongitude(longitude) || !isValidLatitude(latitude)) return null;
  return { latitude, longitude };
}

function isGeoPoint(point) {
  return Boolean(coordinatesFromGeoPoint(point));
}

function parseCoordinatesValue(value) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return parseCoordinatesValue(JSON.parse(value));
    } catch {
      const parts = value.split(",").map((part) => parseCoordinate(part.trim()));
      if (parts.length === 2) return buildGeoPoint(parts[0], parts[1]);
      return null;
    }
  }

  if (Array.isArray(value)) {
    return buildGeoPoint(value[0], value[1]);
  }

  if (typeof value === "object") {
    if (Array.isArray(value.coordinates)) return parseCoordinatesValue(value.coordinates);
    return buildGeoPoint(value.longitude ?? value.lng ?? value.lon, value.latitude ?? value.lat);
  }

  return null;
}

function coordinatesFromPayload(payload = {}) {
  const existingPoint = typeof payload.location === "object" ? parseCoordinatesValue(payload.location) : null;
  if (existingPoint) return existingPoint;

  const coordinatesPoint = parseCoordinatesValue(payload.coordinates);
  if (coordinatesPoint) return coordinatesPoint;

  return buildGeoPoint(
    payload.longitude ?? payload.lng ?? payload.lon,
    payload.latitude ?? payload.lat,
  );
}

function placeFromKnownData(parts = []) {
  const normalizedParts = parts.map(normalizeKey).filter(Boolean);
  const joined = normalizedParts.join(" ");

  for (const [key, coordinates] of Object.entries(KNOWN_PLACES)) {
    const normalizedKey = normalizeKey(key);
    if (joined === normalizedKey || joined.includes(normalizedKey)) {
      return { ...coordinates, formattedAddress: key, source: "known-place" };
    }
  }

  for (const part of normalizedParts) {
    if (KNOWN_PLACES[part]) {
      return { ...KNOWN_PLACES[part], formattedAddress: part, source: "known-place" };
    }
  }

  return null;
}

async function geocodeWithOpenStreetMap(query) {
  if (!query || process.env.NODE_ENV === "test" || String(process.env.DISABLE_EXTERNAL_GEOCODING).toLowerCase() === "true") {
    return null;
  }

  if (typeof fetch !== "function") return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TURFX/1.0 location geocoder",
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const [first] = await response.json();
    if (!first) return null;

    const latitude = parseCoordinate(first.lat);
    const longitude = parseCoordinate(first.lon);
    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;

    return {
      formattedAddress: first.display_name || query,
      latitude,
      longitude,
      source: "openstreetmap",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeVenue(payload = {}) {
  const area = cleanText(
    payload.area ||
      payload.locationLabel ||
      payload.locationText ||
      (typeof payload.location === "string" ? payload.location : ""),
  );
  const city = cleanText(payload.city);
  const state = cleanText(payload.state);
  const address = cleanText(payload.address || payload.query || payload.q);
  const explicitPoint = coordinatesFromPayload(payload);

  if (explicitPoint) {
    const coordinates = coordinatesFromGeoPoint(explicitPoint);
    return {
      area,
      city,
      formattedAddress: [address, area, city, state].filter(Boolean).join(", "),
      latitude: coordinates.latitude,
      location: explicitPoint,
      longitude: coordinates.longitude,
      source: "manual",
      state,
    };
  }

  const queryParts = [address, area, city, state, payload.country || "India"].filter(Boolean);
  const knownPlace = placeFromKnownData(queryParts);
  const externalPlace = knownPlace || await geocodeWithOpenStreetMap(queryParts.join(", "));

  if (!externalPlace) {
    const error = new Error("Latitude and longitude are required, or the address must be geocodable.");
    error.statusCode = 400;
    throw error;
  }

  const location = buildGeoPoint(externalPlace.longitude, externalPlace.latitude);
  return {
    area,
    city,
    formattedAddress: externalPlace.formattedAddress || queryParts.join(", "),
    latitude: location.coordinates[1],
    location,
    longitude: location.coordinates[0],
    source: externalPlace.source,
    state,
  };
}

function queryCoordinates(query = {}) {
  const point = buildGeoPoint(
    query.longitude ?? query.lng ?? query.lon,
    query.latitude ?? query.lat,
  );
  if (!point) return null;
  const coordinates = coordinatesFromGeoPoint(point);
  return { ...coordinates, point };
}

function radiusKmFromQuery(query = {}) {
  const radius = parseCoordinate(query.radiusKm ?? query.radius ?? query.distance);
  if (!radius || radius <= 0) return null;
  return Math.min(radius, 100);
}

function calculateDistanceKm(origin, destination) {
  if (!origin || !destination) return null;

  const originPoint = coordinatesFromPayload(origin) || origin.point;
  const destinationPoint = coordinatesFromPayload(destination) || destination.point;
  const originCoordinates = coordinatesFromGeoPoint(originPoint);
  const destinationCoordinates = coordinatesFromGeoPoint(destinationPoint);

  if (!originCoordinates || !destinationCoordinates) return null;

  const lat1 = originCoordinates.latitude * Math.PI / 180;
  const lat2 = destinationCoordinates.latitude * Math.PI / 180;
  const deltaLat = (destinationCoordinates.latitude - originCoordinates.latitude) * Math.PI / 180;
  const deltaLng = (destinationCoordinates.longitude - originCoordinates.longitude) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

module.exports = {
  buildGeoPoint,
  calculateDistanceKm,
  coordinatesFromGeoPoint,
  coordinatesFromPayload,
  geocodeVenue,
  isGeoPoint,
  queryCoordinates,
  radiusKmFromQuery,
};
