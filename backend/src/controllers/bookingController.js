const { body, param } = require("express-validator");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Turf = require("../models/Turf");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

function normalizeDate(input) {
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T00:00:00.000Z`);
  }

  const date = new Date(input);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function calculateHours(startTime, endTime) {
  const diff = minutes(endTime) - minutes(startTime);

  if (diff <= 0) {
    const error = new Error("Slot end time must be after slot start time");
    error.statusCode = 400;
    throw error;
  }

  return diff / 60;
}

function isSameUtcDate(date, compareDate) {
  return (
    date.getUTCFullYear() === compareDate.getUTCFullYear() &&
    date.getUTCMonth() === compareDate.getUTCMonth() &&
    date.getUTCDate() === compareDate.getUTCDate()
  );
}

function isSlotAvailableInSchedule(turf, bookingDate, startTime, endTime) {
  const blackoutDates = turf.schedule?.blackoutDates || [];
  const isBlackoutDate = blackoutDates.some((blackoutDate) => isSameUtcDate(new Date(blackoutDate), bookingDate));

  if (isBlackoutDate) {
    return false;
  }

  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayKey = dayKeys[bookingDate.getUTCDay()];
  const ranges = turf.schedule?.weeklyAvailability?.[dayKey] || [];
  const start = minutes(startTime);
  const end = minutes(endTime);

  return ranges.some((range) => {
    const [rangeStart, rangeEnd] = range.split("-");
    return start >= minutes(rangeStart) && end <= minutes(rangeEnd);
  });
}

async function findOverlappingBooking(turfId, bookingDate, startTime, endTime) {
  return Booking.findOne({
    turfId,
    bookingDate,
    bookingStatus: { $ne: "cancelled" },
    slotStartTime: { $lt: endTime },
    slotEndTime: { $gt: startTime },
  });
}

const bookingValidation = [
  body("turfId").isMongoId().withMessage("Valid turf id is required"),
  body("bookingDate").isISO8601().withMessage("Valid booking date is required"),
  body("slotStartTime").matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Slot start time must be HH:mm"),
  body("slotEndTime").matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Slot end time must be HH:mm"),
];

const createBooking = asyncHandler(async (req, res) => {
  const { turfId, bookingDate, slotStartTime, slotEndTime } = req.body;
  const turf = await Turf.findById(turfId);

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  if (!turf.isApproved && req.user.role !== "admin" && String(turf.ownerId) !== String(req.user._id)) {
    const error = new Error("This turf is not available for booking yet");
    error.statusCode = 403;
    throw error;
  }

  const dateOnly = normalizeDate(bookingDate);
  const hoursBooked = calculateHours(slotStartTime, slotEndTime);

  if (!isSlotAvailableInSchedule(turf, dateOnly, slotStartTime, slotEndTime)) {
    const error = new Error("Selected slot is outside turf availability");
    error.statusCode = 409;
    throw error;
  }

  const existingBooking = await findOverlappingBooking(turfId, dateOnly, slotStartTime, slotEndTime);

  if (existingBooking) {
    const error = new Error("Selected slot is already booked");
    error.statusCode = 409;
    throw error;
  }

  const booking = await Booking.create({
    userId: req.user._id,
    turfId,
    bookingDate: dateOnly,
    slotStartTime,
    slotEndTime,
    hoursBooked,
    totalAmount: Number((hoursBooked * turf.pricePerHour).toFixed(2)),
  });

  await Notification.create({
    userId: req.user._id,
    title: "Booking created",
    message: `${turf.name} is reserved for ${slotStartTime}-${slotEndTime}. Complete payment to confirm it.`,
  });

  return successResponse(res, "Booking created", { booking }, 201);
});

const getMyBookings = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === "user") {
    filter.userId = req.user._id;
  } else if (req.user.role === "owner") {
    const turfs = await Turf.find({ ownerId: req.user._id }).select("_id");
    filter.turfId = { $in: turfs.map((turf) => turf._id) };
  }

  const bookings = await Booking.find(filter)
    .populate("turfId", "name city location images pricePerHour sportsSupported")
    .populate("userId", "name email phone")
    .sort({ bookingDate: -1, slotStartTime: -1 });

  return successResponse(res, "Bookings fetched", { bookings });
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("turfId", "name city location images pricePerHour sportsSupported ownerId")
    .populate("userId", "name email phone");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = booking.turfId?.ownerId && String(booking.turfId.ownerId) === String(req.user._id);
  const isUser = String(booking.userId._id) === String(req.user._id);

  if (!isUser && !isOwner && req.user.role !== "admin") {
    const error = new Error("You cannot access this booking");
    error.statusCode = 403;
    throw error;
  }

  return successResponse(res, "Booking fetched", { booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("turfId", "ownerId name");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = String(booking.turfId.ownerId) === String(req.user._id);
  const isUser = String(booking.userId) === String(req.user._id);

  if (!isUser && !isOwner && req.user.role !== "admin") {
    const error = new Error("You cannot cancel this booking");
    error.statusCode = 403;
    throw error;
  }

  if (booking.bookingStatus === "completed") {
    const error = new Error("Completed bookings cannot be cancelled");
    error.statusCode = 409;
    throw error;
  }

  booking.bookingStatus = "cancelled";
  await booking.save();

  await Notification.create({
    userId: booking.userId,
    title: "Booking cancelled",
    message: `Your booking at ${booking.turfId.name} has been cancelled.`,
  });

  return successResponse(res, "Booking cancelled", { booking });
});

module.exports = {
  bookingValidation,
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
};
