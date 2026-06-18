const { body } = require("express-validator");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Turf = require("../models/Turf");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const {
  buildOccupancyKeys,
  buildSlotKey,
  calculateHours,
  getBufferMinutes,
  normalizeDate,
  validateSlotRequest,
} = require("../services/availabilityService");
const { recordBookingConflict } = require("../services/conflictLogService");

async function findActiveBookings(turfId, bookingDate) {
  return Booking.find({
    turfId,
    bookingDate,
    bookingStatus: { $in: ["pending", "confirmed", "checked_in", "upcoming"] },
  }).select("slotStartTime slotEndTime bookingStatus");
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
  const today = normalizeDate(new Date());

  if (dateOnly < today) {
    const error = new Error("Past dates cannot be booked");
    error.statusCode = 400;
    throw error;
  }

  const activeBookings = await findActiveBookings(turfId, dateOnly);
  const availability = validateSlotRequest(turf, dateOnly, slotStartTime, slotEndTime, activeBookings);

  if (!availability.available) {
    await recordBookingConflict({
      bookingDate: dateOnly,
      endTime: slotEndTime,
      reason: availability.message,
      startTime: slotStartTime,
      status: availability.status,
      turfId,
      userId: req.user._id,
    });
    const error = new Error(availability.message);
    error.statusCode = availability.statusCode;
    throw error;
  }

  let booking;
  try {
    booking = await Booking.create({
      userId: req.user._id,
      turfId,
      bookingDate: dateOnly,
      slotStartTime,
      slotEndTime,
      hoursBooked,
      totalAmount: Number((hoursBooked * turf.pricePerHour).toFixed(2)),
      bookingStatus: "pending",
      occupancyKeys: buildOccupancyKeys(turfId, dateOnly, slotStartTime, slotEndTime, getBufferMinutes(turf)),
      slotKey: buildSlotKey(turfId, dateOnly, slotStartTime, slotEndTime),
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.slotKey) {
      await recordBookingConflict({
        bookingDate: dateOnly,
        endTime: slotEndTime,
        reason: "Selected slot is already booked",
        startTime: slotStartTime,
        status: "booked",
        turfId,
        userId: req.user._id,
      });
      error.message = "Selected slot is already booked";
      error.statusCode = 409;
    }
    if (error.code === 11000 && error.keyPattern?.occupancyKeys) {
      await recordBookingConflict({
        bookingDate: dateOnly,
        endTime: slotEndTime,
        reason: "This time overlaps with another booking.",
        startTime: slotStartTime,
        status: "booked",
        turfId,
        userId: req.user._id,
      });
      error.message = "This time overlaps with another booking.";
      error.statusCode = 409;
    }
    throw error;
  }

  await Notification.create([
    {
      userId: req.user._id,
      title: "Booking created",
      message: `${turf.name} is reserved for ${slotStartTime}-${slotEndTime}. Complete payment to confirm it.`,
      metadata: { bookingId: booking._id, turfId },
      targetUrl: `/bookings/${booking._id}`,
      type: "booking",
    },
    {
      userId: turf.ownerId,
      title: "New booking request",
      message: `${req.user.name} requested ${turf.name} for ${slotStartTime}-${slotEndTime}.`,
      metadata: { bookingId: booking._id, turfId },
      targetUrl: "/owner/bookings",
      type: "booking",
    },
  ]);

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

  if (booking.bookingStatus === "cancelled") {
    return successResponse(res, "Booking already cancelled", { booking });
  }

  booking.bookingStatus = "cancelled";
  booking.occupancyKeys = [];
  booking.slotKey = undefined;
  booking.cancelledAt = new Date();
  booking.cancelledBy = req.user._id;
  await booking.save();

  await Notification.create({
    userId: booking.userId,
    title: "Booking cancelled",
    message: `Your booking at ${booking.turfId.name} has been cancelled.`,
    metadata: { bookingId: booking._id, turfId: booking.turfId._id || booking.turfId },
    targetUrl: `/bookings/${booking._id}`,
    type: "booking",
  });

  if (!isOwner) {
    await Notification.create({
      userId: booking.turfId.ownerId,
      title: "User cancelled a booking",
      message: `A booking at ${booking.turfId.name} was cancelled and the slot is released.`,
      metadata: { bookingId: booking._id, turfId: booking.turfId._id || booking.turfId },
      targetUrl: "/owner/bookings",
      type: "booking",
    });
  }

  return successResponse(res, "Booking cancelled", { booking });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("turfId", "ownerId name");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = String(booking.turfId.ownerId) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    const error = new Error("You cannot update this booking");
    error.statusCode = 403;
    throw error;
  }

  const nextStatus = req.body.status;
  if (booking.bookingStatus === "cancelled" || booking.bookingStatus === "completed") {
    const error = new Error(`A ${booking.bookingStatus} booking cannot change status`);
    error.statusCode = 409;
    throw error;
  }

  const transitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["checked_in", "cancelled"],
    checked_in: ["completed"],
    upcoming: ["confirmed", "checked_in", "cancelled"],
  };
  if (!transitions[booking.bookingStatus]?.includes(nextStatus)) {
    const error = new Error(`Booking cannot move from ${booking.bookingStatus} to ${nextStatus}`);
    error.statusCode = 409;
    throw error;
  }

  booking.bookingStatus = nextStatus;
  if (nextStatus === "cancelled") {
    booking.occupancyKeys = [];
    booking.slotKey = undefined;
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user._id;
  }
  await booking.save();

  await Notification.create({
    userId: booking.userId,
    title: nextStatus === "checked_in" ? "Booking checked in" : `Booking ${nextStatus}`,
    message:
      nextStatus === "completed"
        ? `Your booking at ${booking.turfId.name} is complete. Share a review from Booking Details.`
        : `Your booking at ${booking.turfId.name} is now ${nextStatus.replace("_", " ")}.`,
    metadata: { bookingId: booking._id, turfId: booking.turfId._id || booking.turfId },
    targetUrl: `/bookings/${booking._id}`,
    type: "booking",
  });

  return successResponse(res, "Booking status updated", { booking });
});

module.exports = {
  bookingValidation,
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
  updateBookingStatus,
};
