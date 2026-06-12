const { body, param } = require("express-validator");
const Turf = require("../models/Turf");
const Booking = require("../models/Booking");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

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
  if (typeof value === "object") return value;
  return JSON.parse(value);
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
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
  body("sportsSupported").custom((value, { req }) => parseArray(value || req.body.sport).length > 0).withMessage("At least one sport is required"),
  body("pricePerHour").isFloat({ min: 0 }).withMessage("Price per hour must be positive"),
];

const turfUpdateValidation = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("description").optional().trim().notEmpty().withMessage("Description cannot be empty"),
  body("location").optional().trim().notEmpty().withMessage("Location cannot be empty"),
  body("address").optional().trim().notEmpty().withMessage("Address cannot be empty"),
  body("city").optional().trim().notEmpty().withMessage("City cannot be empty"),
  body("state").optional().trim().notEmpty().withMessage("State cannot be empty"),
  body("sportsSupported").optional().custom((value, { req }) => parseArray(value || req.body.sport).length > 0).withMessage("At least one sport is required"),
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

  const skip = (Number(page) - 1) * Number(limit);
  const [turfs, total] = await Promise.all([
    Turf.find(filter)
      .populate("ownerId", "name email phone")
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Turf.countDocuments(filter),
  ]);

  return successResponse(res, "Turfs fetched", {
    turfs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)) || 1,
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
  const turf = await Turf.findById(req.params.id).populate("ownerId", "name email phone");

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(res, "Turf fetched", { turf });
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
    schedule: parseSchedule(req.body.schedule),
  });

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

  const fields = ["name", "description", "location", "address", "city", "state", "pricePerHour", "isApproved"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      turf[field] = field === "isApproved" ? parseBoolean(req.body[field], turf[field]) : req.body[field];
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
    bookingStatus: "upcoming",
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
    ...req.body,
  };

  await turf.save();

  return successResponse(res, "Turf slots updated", { turf });
});

module.exports = {
  createTurf,
  deleteTurf,
  getTurfById,
  getTurfs,
  getTurfsByCity,
  searchTurfs,
  turfUpdateValidation,
  turfValidation,
  updateTurf,
  updateTurfSlots,
};
