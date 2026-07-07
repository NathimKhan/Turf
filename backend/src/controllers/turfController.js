const { body, param } = require("express-validator");
const AuditLog = require("../models/AuditLog");
const Turf = require("../models/Turf");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  isOwnerActive,
  isVenueLive,
} = require("../utils/approval");
const {
  applyVenueState,
  initializeVenueSubmission,
  publicVenueFilter,
  resubmitVenue,
} = require("../services/venueApprovalService");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const { ACTIVE_BOOKING_STATUSES } = require("../utils/bookingLifecycle");
const {
  buildAvailabilityTimeline,
  configuredSportsForTurf,
  generateScheduledSlots,
  isBlackoutDate,
  isValidTime,
  getMinimumBookingMinutes,
  getStartIntervalMinutes,
  getSlotMinutes,
  minutes,
  normalizeDate,
  scheduleRangesForDate,
  sportRateForTurf,
  validateSlotRequest,
} = require("../services/availabilityService");
const { completeExpiredBookings } = require("../services/bookingLifecycleService");
const { recordBookingConflict } = require("../services/conflictLogService");
const {
  calculateDistanceKm,
  geocodeVenue,
  queryCoordinates,
  radiusKmFromQuery,
} = require("../services/geocodingService");
const {
  IMAGE_COLLECTION_FIELDS,
  SINGLE_IMAGE_FIELDS,
  generatedTurfImageSvgFromToken,
  uniqueImageValues,
} = require("../utils/turfImages");

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [value];
}

function parseObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value === "object") return value;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    const error = new Error("Sport rates must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function uploadUrl(req, file) {
  return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
}

function fileUrls(req, fieldName) {
  if (Array.isArray(req.files)) {
    return req.files
      .filter((file) => !fieldName || file.fieldname === fieldName)
      .map((file) => uploadUrl(req, file));
  }

  if (req.files && typeof req.files === "object") {
    const files = fieldName
      ? req.files[fieldName] || []
      : Object.values(req.files).flat();
    return files.map((file) => uploadUrl(req, file));
  }

  return [];
}

function allUploadedImageUrls(req) {
  return fileUrls(req);
}

function firstImage(value) {
  return parseArray(value).find(Boolean) || "";
}

function imagePayloadFromRequest(req) {
  const payload = {};
  const legacyImages = uniqueImageValues([
    ...parseArray(req.body.images),
    ...fileUrls(req, "images"),
  ]);

  if (req.body.images !== undefined || fileUrls(req, "images").length) {
    payload.images = legacyImages;
  }

  SINGLE_IMAGE_FIELDS.forEach((field) => {
    const uploads = fileUrls(req, field);
    const bodyImage = firstImage(req.body[field]);
    if (uploads[0] || req.body[field] !== undefined) {
      payload[field] = uploads[0] || bodyImage;
    }
  });

  IMAGE_COLLECTION_FIELDS.forEach((field) => {
    const uploads = fileUrls(req, field);
    if (req.body[field] !== undefined || uploads.length) {
      payload[field] = uniqueImageValues([...parseArray(req.body[field]), ...uploads]);
    }
  });

  const featuredFallback = uniqueImageValues([
    ...(payload.gallery || []),
    ...(payload.images || []),
    ...allUploadedImageUrls(req),
  ]);

  if (!payload.heroImage && featuredFallback[0]) payload.heroImage = featuredFallback[0];
  if (!payload.coverImage && featuredFallback[1]) payload.coverImage = featuredFallback[1];
  if (!payload.profileImage && featuredFallback[2]) payload.profileImage = featuredFallback[2];
  if (!payload.thumbnail && payload.heroImage) payload.thumbnail = payload.heroImage;

  return payload;
}

function applyImagePayload(turf, payload = {}) {
  Object.entries(payload).forEach(([field, value]) => {
    turf[field] = value;
  });
}

function parseSchedule(value) {
  if (!value) return undefined;
  if (typeof value === "object") return normalizeSchedulePayload(value);
  try {
    return normalizeSchedulePayload(JSON.parse(value));
  } catch {
    const error = new Error("Schedule must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function validateAllowedArray(value, allowedValues, emptyMessage, label) {
  const values = parseArray(value);
  if (!values.length) {
    throw new Error(emptyMessage);
  }

  const invalidValues = values.filter((item) => !allowedValues.includes(item));
  if (invalidValues.length) {
    throw new Error(`${label} must be one of: ${allowedValues.join(", ")}`);
  }

  return true;
}

function parseDateArray(value) {
  return parseArray(value).map((date) => normalizeDate(date));
}

function parseBlackoutArray(value) {
  return parseArray(value).map((blackout) => {
    const dateValue = typeof blackout === "object" ? blackout.date : blackout;
    const date = normalizeDate(dateValue);
    const reason = typeof blackout === "object" && blackout.reason
      ? String(blackout.reason).trim()
      : "Blackout";

    return {
      date,
      reason: reason || "Blackout",
    };
  });
}

function normalizeSchedulePayload(payload = {}) {
  const next = {};

  if (payload.slotMinutes !== undefined) {
    const slotMinutes = Number(payload.slotMinutes);
    if (![30, 60, 90, 120].includes(slotMinutes)) {
      const error = new Error("Slot duration must be 30, 60, 90, or 120 minutes");
      error.statusCode = 400;
      throw error;
    }
    next.slotMinutes = slotMinutes;
  }

  if (payload.startIntervalMinutes !== undefined) {
    const startIntervalMinutes = Number(payload.startIntervalMinutes);
    if (![15, 30, 60].includes(startIntervalMinutes)) {
      const error = new Error("Start interval must be 15, 30, or 60 minutes");
      error.statusCode = 400;
      throw error;
    }
    next.startIntervalMinutes = startIntervalMinutes;
  }

  if (payload.minimumBookingMinutes !== undefined) {
    const minimumBookingMinutes = Number(payload.minimumBookingMinutes);
    if (minimumBookingMinutes < 60 || minimumBookingMinutes % 30 !== 0) {
      const error = new Error("Minimum booking duration is 1 hour");
      error.statusCode = 400;
      throw error;
    }
    next.minimumBookingMinutes = minimumBookingMinutes;
  }

  if (payload.bufferMinutes !== undefined) {
    const bufferMinutes = Number(payload.bufferMinutes);
    if (![0, 15, 30].includes(bufferMinutes)) {
      const error = new Error("Buffer time must be 0, 15, or 30 minutes");
      error.statusCode = 400;
      throw error;
    }
    next.bufferMinutes = bufferMinutes;
  }

  if (payload.weeklyAvailability) {
    let weeklyAvailability;
    try {
      weeklyAvailability =
        typeof payload.weeklyAvailability === "string"
          ? JSON.parse(payload.weeklyAvailability)
          : payload.weeklyAvailability;
    } catch {
      const error = new Error("Weekly availability must be valid JSON");
      error.statusCode = 400;
      throw error;
    }
    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    next.weeklyAvailability = Object.fromEntries(
      validDays.map((day) => {
        const ranges = parseArray(weeklyAvailability[day]).filter(Boolean);
        ranges.forEach((range) => {
          const [startTime, endTime] = String(range).split("-");
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || minutes(endTime) <= minutes(startTime)) {
            const error = new Error("Availability ranges must use HH:mm-HH:mm with end after start");
            error.statusCode = 400;
            throw error;
          }
        });
        return [day, ranges];
      }),
    );
  }

  if (payload.blackoutDates !== undefined) {
    next.blackoutDates = parseDateArray(payload.blackoutDates);
  }

  if (payload.blackouts !== undefined) {
    next.blackouts = parseBlackoutArray(payload.blackouts);
    next.blackoutDates = next.blackouts.map((blackout) => blackout.date);
  }

  return next;
}

function normalizeSportRatesPayload(value, sports, basePrice, existingRates = {}) {
  const payloadRates = parseObject(value);
  const savedRates = parseObject(existingRates);
  const rates = {};
  const fallbackRate = Number(basePrice || 0);

  sports.forEach((sport) => {
    const rate = Number(payloadRates[sport] ?? savedRates[sport] ?? fallbackRate);
    if (Number.isNaN(rate) || rate < 0) {
      const error = new Error("Sport rates must be positive numbers");
      error.statusCode = 400;
      throw error;
    }
    rates[sport] = rate;
  });

  return rates;
}

function canManageTurf(user, turf) {
  return user.role === "admin" || String(turf.ownerId) === String(user._id);
}

function liveVenueFilter() {
  return publicVenueFilter();
}

async function activeVenueOwnerIds() {
  const owners = await User.find({
    $or: [
      { role: "admin" },
      {
        role: "owner",
        $or: [{ approvalStatus: "ACTIVE" }, { accountStatus: "active" }],
      },
    ],
  }).select("_id");

  return owners.map((owner) => owner._id);
}

function areaFromPayload(payload = {}, fallback = "") {
  const safeFallback = typeof fallback === "string" ? fallback : "";
  const rawLocation = typeof payload.location === "string" ? payload.location : "";
  return String(payload.area || rawLocation || payload.locationLabel || safeFallback || "").trim();
}

function locationPayload(payload = {}, existing = {}) {
  const existingObject = existing.toObject ? existing.toObject() : existing;
  const area = areaFromPayload(payload, existingObject.area || existingObject.location);
  const textLocationChanged = ["address", "area", "city", "location", "state"].some((field) => payload[field] !== undefined);
  const shouldReuseCoordinates = !textLocationChanged;

  return {
    address: payload.address ?? existingObject.address,
    area,
    city: payload.city ?? existingObject.city,
    coordinates: payload.coordinates ?? payload.locationCoordinates,
    latitude: payload.latitude ?? payload.lat ?? (shouldReuseCoordinates ? existingObject.latitude : undefined),
    location: payload.geoLocation || (typeof payload.location === "object" ? payload.location : shouldReuseCoordinates ? existingObject.location : undefined),
    longitude: payload.longitude ?? payload.lng ?? payload.lon ?? (shouldReuseCoordinates ? existingObject.longitude : undefined),
    state: payload.state ?? existingObject.state,
  };
}

function hasLocationPayload(payload = {}) {
  return [
    "address",
    "area",
    "city",
    "coordinates",
    "geoLocation",
    "lat",
    "latitude",
    "lng",
    "location",
    "locationCoordinates",
    "lon",
    "longitude",
    "state",
  ].some((field) => payload[field] !== undefined);
}

function withDistance(turf, distanceInKm) {
  if (distanceInKm === undefined || distanceInKm === null) return turf;
  if (turf?.$locals) {
    turf.$locals.distanceInKm = Number(distanceInKm);
  }
  return turf;
}

async function hydrateDistanceRows(rows = []) {
  const ids = rows.map((row) => row._id);
  const distances = new Map(rows.map((row) => [String(row._id), Number((Number(row.distanceInMeters || 0) / 1000).toFixed(2))]));
  const docs = await Turf.find({ _id: { $in: ids } }).populate("ownerId", "name email phone businessName");
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

  return ids
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((doc) => withDistance(doc, distances.get(String(doc._id))));
}

async function findTurfsByDistance({ filter, near, radiusKm, requestedDate, safeLimit, safePage }) {
  const geoFilter = {
    ...filter,
    "location.coordinates": { $type: "array" },
    "location.type": "Point",
  };
  const geoNear = {
    $geoNear: {
      distanceField: "distanceInMeters",
      key: "location",
      near: near.point,
      query: geoFilter,
      spherical: true,
    },
  };

  if (radiusKm) {
    geoNear.$geoNear.maxDistance = radiusKm * 1000;
  }

  if (requestedDate) {
    const rows = await Turf.aggregate([
      geoNear,
      { $sort: { distanceInMeters: 1, createdAt: -1 } },
    ]);
    const matchingTurfs = await hydrateDistanceRows(rows);
    const availableTurfs = matchingTurfs.filter(
      (turf) => generateScheduledSlots(turf, requestedDate).length > 0,
    );
    return {
      total: availableTurfs.length,
      turfs: availableTurfs.slice((safePage - 1) * safeLimit, safePage * safeLimit),
    };
  }

  const [rows, countRows] = await Promise.all([
    Turf.aggregate([
      geoNear,
      { $sort: { distanceInMeters: 1, createdAt: -1 } },
      { $skip: (safePage - 1) * safeLimit },
      { $limit: safeLimit },
    ]),
    Turf.aggregate([
      geoNear,
      { $count: "total" },
    ]),
  ]);

  return {
    total: countRows[0]?.total || 0,
    turfs: await hydrateDistanceRows(rows),
  };
}

const turfValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("address").trim().notEmpty().withMessage("Address is required"),
  body("city").trim().notEmpty().withMessage("City is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("sportsSupported").custom((value, { req }) =>
    validateAllowedArray(value || req.body.sport, Turf.allowedSports, "At least one sport is required", "Sports"),
  ),
  body("amenities").custom((value) =>
    validateAllowedArray(value, Turf.allowedAmenities, "At least one amenity is required", "Amenities"),
  ),
  body("pricePerHour").isFloat({ min: 0 }).withMessage("Price per hour must be positive"),
  body("latitude").optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),
  body("longitude").optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),
];

const turfUpdateValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("description").optional().trim().notEmpty().withMessage("Description cannot be empty"),
  body("location").optional().trim().notEmpty().withMessage("Location cannot be empty"),
  body("address").optional().trim().notEmpty().withMessage("Address cannot be empty"),
  body("city").optional().trim().notEmpty().withMessage("City cannot be empty"),
  body("state").optional().trim().notEmpty().withMessage("State cannot be empty"),
  body("sportsSupported").optional().custom((value, { req }) =>
    validateAllowedArray(value || req.body.sport, Turf.allowedSports, "At least one sport is required", "Sports"),
  ),
  body("amenities").optional().custom((value) =>
    validateAllowedArray(value, Turf.allowedAmenities, "At least one amenity is required", "Amenities"),
  ),
  body("pricePerHour").optional().isFloat({ min: 0 }).withMessage("Price per hour must be positive"),
  body("latitude").optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),
  body("longitude").optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),
];

const getTurfs = asyncHandler(async (req, res) => {
  const {
    city,
    sport,
    minPrice,
    maxPrice,
    search,
    name,
    page = 1,
    limit = 20,
    includeUnapproved,
  } = req.query;

  const filter = {};
  const near = queryCoordinates(req.query);
  const radiusKm = radiusKmFromQuery(req.query);
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (!includeUnapproved || req.user?.role !== "admin") {
    filter.$and = [...(filter.$and || []), liveVenueFilter()];
    filter.ownerId = { $in: await activeVenueOwnerIds() };
  }

  if (city) filter.city = { $regex: city, $options: "i" };
  if (sport) filter.sportsSupported = sport;
  if (name) filter.name = { $regex: name, $options: "i" };
  if (minPrice || maxPrice) {
    filter.pricePerHour = {};
    if (minPrice) filter.pricePerHour.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerHour.$lte = Number(maxPrice);
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { area: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { sportsSupported: { $regex: search, $options: "i" } },
    ];
  }

  const requestedDate = req.query.date ? normalizeDate(req.query.date) : null;
  let turfs;
  let total;

  if (near) {
    const result = await findTurfsByDistance({
      filter,
      near,
      radiusKm,
      requestedDate,
      safeLimit,
      safePage,
    });
    turfs = result.turfs;
    total = result.total;
  } else if (requestedDate) {
    const matchingTurfs = await Turf.find(filter)
      .populate("ownerId", "name email phone businessName")
      .sort({ createdAt: -1 });
    const availableTurfs = matchingTurfs.filter(
      (turf) => generateScheduledSlots(turf, requestedDate).length > 0,
    );
    total = availableTurfs.length;
    turfs = availableTurfs.slice((safePage - 1) * safeLimit, safePage * safeLimit);
  } else {
    [turfs, total] = await Promise.all([
      Turf.find(filter)
        .populate("ownerId", "name email phone businessName")
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Turf.countDocuments(filter),
    ]);
  }

  return successResponse(res, "Turfs fetched", {
    turfs,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1,
    },
  });
});

const searchTurfs = asyncHandler(async (req, res) => {
  req.query.search = req.query.search || req.query.q || "";
  return getTurfs(req, res);
});

const getNearbyTurfs = asyncHandler(async (req, res) => {
  if (!queryCoordinates(req.query)) {
    const error = new Error("Latitude and longitude are required for nearby turf search.");
    error.statusCode = 400;
    throw error;
  }

  req.query.radiusKm = req.query.radiusKm || req.query.radius || 25;
  return getTurfs(req, res);
});

const getTurfsByCity = asyncHandler(async (req, res) => {
  req.query.city = req.params.city;
  return getTurfs(req, res);
});

const getGeneratedTurfMedia = asyncHandler(async (req, res) => {
  const svg = generatedTurfImageSvgFromToken(req.params.token);
  if (!svg) {
    const error = new Error("Generated turf media not found");
    error.statusCode = 404;
    throw error;
  }

  res
    .set("Cache-Control", "public, max-age=31536000, immutable")
    .type("image/svg+xml")
    .send(svg);
});

const getTurfById = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id).populate("ownerId", "name email phone businessName approvalStatus accountStatus role");

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  const ownerId = turf.ownerId?._id || turf.ownerId;
  const canViewUnapproved =
    req.user?.role === "admin" || (req.user && String(ownerId) === String(req.user._id));

  if ((!isVenueLive(turf) || !isOwnerActive(turf.ownerId)) && !canViewUnapproved) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  const near = queryCoordinates(req.query);
  if (near) {
    withDistance(turf, calculateDistanceKm({ point: near.point }, { location: turf.location }));
  }

  return successResponse(res, "Turf fetched", { turf });
});

const getTurfMetadata = asyncHandler(async (req, res) => {
  const ownerIds = await activeVenueOwnerIds();
  const [cities, locations, sports, amenities] = await Promise.all([
    Turf.distinct("city", { ...liveVenueFilter(), ownerId: { $in: ownerIds } }),
    Turf.distinct("area", { ...liveVenueFilter(), ownerId: { $in: ownerIds } }),
    Turf.distinct("sportsSupported", { ...liveVenueFilter(), ownerId: { $in: ownerIds } }),
    Turf.distinct("amenities", { ...liveVenueFilter(), ownerId: { $in: ownerIds } }),
  ]);

  return successResponse(res, "Turf search metadata fetched", {
    cities: cities.filter(Boolean).sort(),
    locations: locations.filter(Boolean).sort(),
    sports: sports.filter(Boolean).sort(),
    amenities: amenities.filter(Boolean).sort(),
  });
});

const geocodeTurfAddress = asyncHandler(async (req, res) => {
  const geocoded = await geocodeVenue({
    address: req.query.address || req.query.q,
    area: req.query.area || req.query.location,
    city: req.query.city,
    latitude: req.query.latitude,
    longitude: req.query.longitude,
    state: req.query.state,
  });

  return successResponse(res, "Address geocoded", {
    area: geocoded.area,
    coordinates: geocoded.location.coordinates,
    formattedAddress: geocoded.formattedAddress,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    source: geocoded.source,
  });
});

const getMyTurfs = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" && req.query.ownerId
    ? { ownerId: req.query.ownerId }
    : { ownerId: req.user._id };
  const turfs = await Turf.find(filter).sort({ createdAt: -1 });

  return successResponse(res, "Owner turfs fetched", { turfs });
});

const getTurfAvailability = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id).populate("ownerId", "approvalStatus accountStatus role");

  if (!turf || !isVenueLive(turf) || !isOwnerActive(turf.ownerId)) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  const bookingDate = normalizeDate(req.query.date);
  const { startTime, endTime } = req.query;
  await completeExpiredBookings();
  const bookings = await Booking.find({
    turfId: turf._id,
    bookingDate,
    bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("slotStartTime slotEndTime bookingStatus paymentStatus sport");

  const timeline = buildAvailabilityTimeline(turf, bookingDate, bookings);
  const availableSlots = timeline.filter((slot) => slot.status === "available");
  let request = null;

  if (startTime || endTime) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      const error = new Error("Start and end time must use HH:mm format");
      error.statusCode = 400;
      throw error;
    }

    request = {
      endTime,
      startTime,
      ...validateSlotRequest(turf, bookingDate, startTime, endTime, bookings),
    };

    if (!request.available) {
      await recordBookingConflict({
        bookingDate,
        endTime,
        reason: request.message,
        source: "availability",
        startTime,
        status: request.status,
        turfId: turf._id,
        userId: req.user?._id,
      });
    }
  }

  return successResponse(res, "Turf availability fetched", {
    date: bookingDate.toISOString().slice(0, 10),
    isBlackoutDate: isBlackoutDate(turf, bookingDate),
    rules: {
      bufferMinutes: turf.schedule?.bufferMinutes || 0,
      minimumBookingMinutes: getMinimumBookingMinutes(turf),
      ranges: scheduleRangesForDate(turf, bookingDate),
      slotMinutes: getSlotMinutes(turf),
      sportRates: Object.fromEntries(configuredSportsForTurf(turf).map((sport) => [sport, sportRateForTurf(turf, sport)])),
      sportsSupported: configuredSportsForTurf(turf),
      startIntervalMinutes: getStartIntervalMinutes(turf),
    },
    slotMinutes: getSlotMinutes(turf),
    timeline,
    request,
    slots: availableSlots,
  });
});

const createTurf = asyncHandler(async (req, res) => {
  const imagePayload = imagePayloadFromRequest(req);
  const sportsSupported = parseArray(req.body.sportsSupported || req.body.sport);
  const pricePerHour = Number(req.body.pricePerHour);
  const sportRates = normalizeSportRatesPayload(req.body.sportRates, sportsSupported, pricePerHour);
  const geocoded = await geocodeVenue(locationPayload(req.body));

  const turf = new Turf({
    name: req.body.name,
    description: req.body.description,
    area: geocoded.area || req.body.location,
    location: geocoded.location,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    sportsSupported,
    pricePerHour,
    sportRates,
    ...imagePayload,
    amenities: parseArray(req.body.amenities),
    ownerId: req.user._id,
    schedule: parseSchedule(req.body.schedule),
  });

  if (req.user.role === "admin" && parseBoolean(req.body.isApproved, true)) {
    applyVenueState(turf, req.body.status || "APPROVED", { actorId: req.user._id });
    turf.submittedAt = turf.submittedAt || new Date();
    turf.submittedBy = turf.submittedBy || req.user._id;
  } else {
    initializeVenueSubmission(turf, req.user._id);
  }

  await turf.save();

  if (!isVenueLive(turf)) {
    const admins = await User.find({ role: "admin" }).select("_id");
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          userId: admin._id,
          title: "Venue awaiting approval",
          message: `${turf.name} was submitted by ${req.user.businessName || req.user.name}.`,
          metadata: { turfId: turf._id, ownerId: req.user._id },
          targetUrl: "/admin/turfs",
          type: "venue",
        })),
      );
    }

    await AuditLog.create({
      action: "SUBMITTED",
      actorId: req.user._id,
      entityId: turf._id,
      entityType: "VENUE",
      status: turf.status,
    });
  }

  return successResponse(res, isVenueLive(turf) ? "Turf created" : "Venue submitted for approval.", { turf }, 201);
});

const updateTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id);

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManageTurf(req.user, turf)) {
    const error = new Error("Only the turf owner or admin can update this turf");
    error.statusCode = 403;
    throw error;
  }

  const fields = ["name", "description", "address", "city", "state", "pricePerHour"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      turf[field] = req.body[field];
    }
  });

  if (req.body.location !== undefined || req.body.area !== undefined) {
    turf.area = areaFromPayload(req.body, turf.area);
  }

  if (hasLocationPayload(req.body)) {
    const geocoded = await geocodeVenue(locationPayload(req.body, turf));
    turf.area = geocoded.area || turf.area;
    turf.location = geocoded.location;
    turf.latitude = geocoded.latitude;
    turf.longitude = geocoded.longitude;
  }

  if (req.body.sportsSupported || req.body.sport) {
    turf.sportsSupported = parseArray(req.body.sportsSupported || req.body.sport);
  }

  if (req.body.sportRates !== undefined || req.body.pricePerHour !== undefined || req.body.sportsSupported || req.body.sport) {
    turf.sportRates = normalizeSportRatesPayload(
      req.body.sportRates,
      turf.sportsSupported || [],
      turf.pricePerHour,
      turf.sportRates,
    );
  }

  if (req.body.amenities) {
    turf.amenities = parseArray(req.body.amenities);
  }

  const imagePayload = imagePayloadFromRequest(req);
  const uploadedImages = allUploadedImageUrls(req);
  if (uploadedImages.length) {
    imagePayload.updatedImages = uniqueImageValues([
      ...(turf.updatedImages || []),
      ...uploadedImages,
    ]);
  }
  applyImagePayload(turf, imagePayload);

  if (req.body.schedule) {
    turf.schedule = parseSchedule(req.body.schedule);
  }

  await turf.save();

  if (req.user.role === "owner") {
    const admins = await User.find({ role: "admin" }).select("_id");
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          userId: admin._id,
          title: "Venue updated",
          message: `${turf.name} was updated by ${req.user.businessName || req.user.name}.`,
          metadata: { turfId: turf._id, ownerId: req.user._id },
          targetUrl: "/admin/turfs",
          type: "venue",
        })),
      );
    }
  }

  if (isVenueLive(turf)) {
    const followers = await User.find({ favorites: turf._id }).select("_id");
    if (followers.length) {
      await Notification.insertMany(
        followers.map((user) => ({
          userId: user._id,
          title: "Favorite venue updated",
          message: `${turf.name} updated its venue information or availability.`,
        })),
      );
    }
  }

  return successResponse(res, "Turf updated", { turf });
});

const resubmitTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id);

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManageTurf(req.user, turf)) {
    const error = new Error("Only the turf owner or admin can resubmit this turf");
    error.statusCode = 403;
    throw error;
  }

  if (req.user.role === "owner" && turf.approvalStatus === "APPROVED") {
    const error = new Error("Approved venues are already public. Edit updates do not require resubmission.");
    error.statusCode = 409;
    throw error;
  }

  resubmitVenue(turf, req.user._id);
  await turf.save();

  const admins = await User.find({ role: "admin" }).select("_id");
  if (admins.length) {
    await Notification.insertMany(
      admins.map((admin) => ({
        userId: admin._id,
        title: "Venue resubmitted",
        message: `${turf.name} was resubmitted by ${req.user.businessName || req.user.name}.`,
        metadata: { turfId: turf._id, ownerId: req.user._id },
        targetUrl: "/admin/turfs",
        type: "venue",
      })),
    );
  }

  await AuditLog.create({
    action: "RESUBMITTED",
    actorId: req.user._id,
    entityId: turf._id,
    entityType: "VENUE",
    status: turf.approvalStatus,
  });

  return successResponse(res, "Venue resubmitted for approval.", { turf });
});

const deleteTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id);

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManageTurf(req.user, turf)) {
    const error = new Error("Only the turf owner or admin can delete this turf");
    error.statusCode = 403;
    throw error;
  }

  await completeExpiredBookings();
  const activeBookings = await Booking.countDocuments({
    turfId: turf._id,
    bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
  });

  if (activeBookings > 0) {
    const error = new Error("Turf with active bookings cannot be deleted");
    error.statusCode = 409;
    throw error;
  }

  await turf.deleteOne();

  return successResponse(res, "Turf deleted");
});

const updateTurfSlots = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id);

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManageTurf(req.user, turf)) {
    const error = new Error("Only the turf owner or admin can update slots");
    error.statusCode = 403;
    throw error;
  }

  const currentSchedule = turf.schedule?.toObject ? turf.schedule.toObject() : turf.schedule;
  turf.schedule = {
    ...currentSchedule,
    ...normalizeSchedulePayload(req.body),
  };

  await turf.save();

  return successResponse(res, "Turf slots updated", { turf });
});

module.exports = {
  createTurf,
  deleteTurf,
  geocodeTurfAddress,
  getGeneratedTurfMedia,
  getMyTurfs,
  getNearbyTurfs,
  getTurfById,
  getTurfAvailability,
  getTurfMetadata,
  getTurfs,
  getTurfsByCity,
  searchTurfs,
  resubmitTurf,
  turfUpdateValidation,
  turfValidation,
  updateTurf,
  updateTurfSlots,
};
