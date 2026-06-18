const { body, param } = require("express-validator");
const Turf = require("../models/Turf");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const {
  buildAvailabilityTimeline,
  generateScheduledSlots,
  isBlackoutDate,
  isValidTime,
  minutes,
  normalizeDate,
  scheduleRangesForDate,
  validateSlotRequest,
} = require("../services/availabilityService");
const { recordBookingConflict } = require("../services/conflictLogService");

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

function fileUrls(req) {
  return (req.files || []).map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`);
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

function canManageTurf(user, turf) {
  return user.role === "admin" || String(turf.ownerId) === String(user._id);
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
];

const getTurfs = asyncHandler(async (req, res) => {
  const {
    city,
    sport,
    minPrice,
    maxPrice,
    rating,
    search,
    name,
    page = 1,
    limit = 20,
    includeUnapproved,
  } = req.query;

  const filter = {};
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (!includeUnapproved || req.user?.role !== "admin") {
    filter.isApproved = true;
  }

  if (city) filter.city = { $regex: city, $options: "i" };
  if (sport) filter.sportsSupported = sport;
  if (name) filter.name = { $regex: name, $options: "i" };
  if (rating) filter.rating = { $gte: Number(rating) };
  if (minPrice || maxPrice) {
    filter.pricePerHour = {};
    if (minPrice) filter.pricePerHour.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerHour.$lte = Number(maxPrice);
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { sportsSupported: { $regex: search, $options: "i" } },
    ];
  }

  let turfs;
  let total;

  if (req.query.date) {
    const requestedDate = normalizeDate(req.query.date);
    const matchingTurfs = await Turf.find(filter)
      .populate("ownerId", "name email phone businessName")
      .sort({ rating: -1, createdAt: -1 });
    const availableTurfs = matchingTurfs.filter(
      (turf) => generateScheduledSlots(turf, requestedDate).length > 0,
    );
    total = availableTurfs.length;
    turfs = availableTurfs.slice((safePage - 1) * safeLimit, safePage * safeLimit);
  } else {
    [turfs, total] = await Promise.all([
      Turf.find(filter)
        .populate("ownerId", "name email phone businessName")
        .sort({ rating: -1, createdAt: -1 })
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

const getTurfsByCity = asyncHandler(async (req, res) => {
  req.query.city = req.params.city;
  return getTurfs(req, res);
});

const getTurfById = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id).populate("ownerId", "name email phone businessName");

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  const ownerId = turf.ownerId?._id || turf.ownerId;
  const canViewUnapproved =
    req.user?.role === "admin" || (req.user && String(ownerId) === String(req.user._id));

  if (!turf.isApproved && !canViewUnapproved) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(res, "Turf fetched", { turf });
});

const getTurfMetadata = asyncHandler(async (req, res) => {
  const [cities, locations, sports, amenities] = await Promise.all([
    Turf.distinct("city", { isApproved: true }),
    Turf.distinct("location", { isApproved: true }),
    Turf.distinct("sportsSupported", { isApproved: true }),
    Turf.distinct("amenities", { isApproved: true }),
  ]);

  return successResponse(res, "Turf search metadata fetched", {
    cities: cities.filter(Boolean).sort(),
    locations: locations.filter(Boolean).sort(),
    sports: sports.filter(Boolean).sort(),
    amenities: amenities.filter(Boolean).sort(),
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
  const turf = await Turf.findById(req.params.id);

  if (!turf || !turf.isApproved) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  const bookingDate = normalizeDate(req.query.date);
  const { startTime, endTime } = req.query;
  const bookings = await Booking.find({
    turfId: turf._id,
    bookingDate,
    bookingStatus: { $in: ["pending", "confirmed", "checked_in", "upcoming"] },
  }).select("slotStartTime slotEndTime");

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
      ranges: scheduleRangesForDate(turf, bookingDate),
      slotMinutes: turf.schedule?.slotMinutes || 60,
    },
    slotMinutes: turf.schedule?.slotMinutes || 60,
    timeline,
    request,
    slots: availableSlots,
  });
});

const createTurf = asyncHandler(async (req, res) => {
  const images = [...parseArray(req.body.images), ...fileUrls(req)];

  const turf = await Turf.create({
    name: req.body.name,
    description: req.body.description,
    location: req.body.location,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    sportsSupported: parseArray(req.body.sportsSupported || req.body.sport),
    pricePerHour: req.body.pricePerHour,
    images,
    amenities: parseArray(req.body.amenities),
    ownerId: req.user._id,
    isApproved: req.user.role === "admin" ? parseBoolean(req.body.isApproved, true) : false,
    moderationStatus:
      req.user.role === "admin" && parseBoolean(req.body.isApproved, true)
        ? "approved"
        : "pending",
    schedule: parseSchedule(req.body.schedule),
  });

  if (!turf.isApproved) {
    const admins = await User.find({ role: "admin", accountStatus: "active" }).select("_id");
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
  }

  return successResponse(res, "Turf created", { turf }, 201);
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

  const fields = ["name", "description", "location", "address", "city", "state", "pricePerHour"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      turf[field] = req.body[field];
    }
  });

  if (req.body.sportsSupported || req.body.sport) {
    turf.sportsSupported = parseArray(req.body.sportsSupported || req.body.sport);
  }

  if (req.body.amenities) {
    turf.amenities = parseArray(req.body.amenities);
  }

  const uploadedImages = fileUrls(req);
  if (req.body.images || uploadedImages.length) {
    turf.images = [...parseArray(req.body.images), ...uploadedImages];
  }

  if (req.body.schedule) {
    turf.schedule = parseSchedule(req.body.schedule);
  }

  await turf.save();

  if (turf.isApproved) {
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

  const activeBookings = await Booking.countDocuments({
    turfId: turf._id,
    bookingStatus: { $in: ["pending", "confirmed", "checked_in", "upcoming"] },
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
  getMyTurfs,
  getTurfById,
  getTurfAvailability,
  getTurfMetadata,
  getTurfs,
  getTurfsByCity,
  searchTurfs,
  turfUpdateValidation,
  turfValidation,
  updateTurf,
  updateTurfSlots,
};
