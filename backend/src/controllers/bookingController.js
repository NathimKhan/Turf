const { body } = require("express-validator");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const Turf = require("../models/Turf");
const { isOwnerActive, isVenueLive } = require("../utils/approval");
const { ACTIVE_BOOKING_STATUSES, PAID_BOOKING_PAYMENT_STATUSES, hasBookingStarted } = require("../utils/bookingLifecycle");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const {
  buildOccupancyKeys,
  buildSlotKey,
  calculateHours,
  configuredSportsForTurf,
  getBufferMinutes,
  normalizeDate,
  sportRateForTurf,
  validateSlotRequest,
} = require("../services/availabilityService");
const { completeExpiredBookings, syncBookingById } = require("../services/bookingLifecycleService");
const { recordBookingConflict } = require("../services/conflictLogService");

async function findActiveBookings(turfId, bookingDate) {
  return Booking.find({
    turfId,
    bookingDate,
    bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
  }).select("slotStartTime slotEndTime bookingStatus paymentStatus");
}

const bookingValidation = [
  body("turfId").isMongoId().withMessage("Valid turf id is required"),
  body("bookingDate").isISO8601().withMessage("Valid booking date is required"),
  body("slotStartTime").matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Slot start time must be HH:mm"),
  body("slotEndTime").matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Slot end time must be HH:mm"),
  body("sport").optional().trim().notEmpty().withMessage("Sport cannot be empty"),
];

const createBooking = asyncHandler(async (req, res) => {
  const { turfId, bookingDate, slotStartTime, slotEndTime } = req.body;
  const turf = await Turf.findById(turfId).populate("ownerId", "approvalStatus accountStatus role");

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  if (!isVenueLive(turf) || !isOwnerActive(turf.ownerId)) {
    const error = new Error("This turf is not available for booking yet");
    error.statusCode = 403;
    throw error;
  }

  const dateOnly = normalizeDate(bookingDate);
  const hoursBooked = calculateHours(slotStartTime, slotEndTime);
  const today = normalizeDate(new Date());
  const configuredSports = configuredSportsForTurf(turf);
  const selectedSport = req.body.sport || configuredSports[0] || "";

  if (dateOnly < today) {
    const error = new Error("Past dates cannot be booked");
    error.statusCode = 400;
    throw error;
  }

  if (hasBookingStarted({ bookingDate: dateOnly, slotStartTime })) {
    const error = new Error("Past time slots cannot be booked");
    error.statusCode = 400;
    throw error;
  }

  if (!selectedSport || !configuredSports.includes(selectedSport)) {
    const error = new Error("Selected sport is not available at this venue");
    error.statusCode = 400;
    throw error;
  }

  await completeExpiredBookings();
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

  const hourlyRate = sportRateForTurf(turf, selectedSport);
  const ownerId = turf.ownerId?._id || turf.ownerId;
  let booking;
  try {
    booking = await Booking.create({
      userId: req.user._id,
      turfId,
      ownerId,
      sport: selectedSport,
      bookingDate: dateOnly,
      slotStartTime,
      slotEndTime,
      hoursBooked,
      totalAmount: Number((hoursBooked * hourlyRate).toFixed(2)),
      bookingStatus: "pending",
      occupancyKeys: buildOccupancyKeys(turfId, dateOnly, slotStartTime, slotEndTime, getBufferMinutes(turf)),
      slotKey: buildSlotKey(turfId, dateOnly, slotStartTime, slotEndTime),
      history: [{
        at: new Date(),
        note: "Booking created and awaiting payment",
        source: "customer",
        status: "created",
      }],
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
      message: `${turf.name} is reserved for ${selectedSport} from ${slotStartTime}-${slotEndTime}. Complete payment to confirm it.`,
      metadata: { bookingId: booking._id, turfId },
      targetUrl: `/bookings/${booking._id}`,
      type: "booking",
    },
    {
      userId: ownerId,
      title: "New booking request",
      message: `${req.user.name} requested ${selectedSport} at ${turf.name} for ${slotStartTime}-${slotEndTime}.`,
      metadata: { bookingId: booking._id, turfId },
      targetUrl: "/owner/bookings",
      type: "booking",
    },
  ]);

  return successResponse(res, "Booking created", { booking }, 201);
});

const getMyBookings = asyncHandler(async (req, res) => {
  await completeExpiredBookings();

  const filter = {};

  if (req.user.role === "user") {
    filter.userId = req.user._id;
  } else if (req.user.role === "owner") {
    const turfs = await Turf.find({ ownerId: req.user._id }).select("_id");
    filter.turfId = { $in: turfs.map((turf) => turf._id) };
  }

  const bookings = await Booking.find(filter)
    .populate("turfId", "name area city state address location latitude longitude images pricePerHour sportRates sportsSupported status approvalStatus visibility isPublished isVerified isApproved moderationStatus")
    .populate("userId", "name email phone")
    .sort({ bookingDate: -1, slotStartTime: -1 });

  return successResponse(res, "Bookings fetched", { bookings });
});

const getBookingById = asyncHandler(async (req, res) => {
  await completeExpiredBookings();
  await syncBookingById(req.params.id);

  const booking = await Booking.findById(req.params.id)
    .populate("turfId", "name area city state address location latitude longitude images pricePerHour sportRates sportsSupported ownerId status approvalStatus visibility isPublished isVerified isApproved moderationStatus")
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

  const payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1, _id: -1 });

  return successResponse(res, "Booking fetched", { booking, payment });
});

const cancelBooking = asyncHandler(async (req, res) => {
  await completeExpiredBookings();

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
  booking.qrStatus = "cancelled";
  booking.qrExpiresAt = booking.cancelledAt;
  if (!PAID_BOOKING_PAYMENT_STATUSES.includes(booking.paymentStatus)) {
    booking.invoiceStatus = "not_required";
  }
  booking.history = booking.history || [];
  if (!booking.history.some((entry) => entry.status === "cancelled" && entry.source === "manual")) {
    booking.history.push({
      at: booking.cancelledAt,
      note: "Booking cancelled and slot released",
      source: "manual",
      status: "cancelled",
    });
  }
  await booking.save();
  await syncBookingById(booking._id, { now: booking.cancelledAt, source: "manual" });

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
  await completeExpiredBookings();

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

  if (isOwner && !isOwnerActive(req.user)) {
    const error = new Error("Your account is pending approval from Platform Owner.");
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
    confirmed: ["checked_in", "cancelled", "completed"],
    checked_in: ["completed"],
    ongoing: ["completed"],
    upcoming: ["confirmed", "checked_in", "cancelled", "completed"],
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
    booking.qrStatus = "cancelled";
    booking.qrExpiresAt = booking.cancelledAt;
    if (!PAID_BOOKING_PAYMENT_STATUSES.includes(booking.paymentStatus)) {
      booking.invoiceStatus = "not_required";
    }
  }
  if (nextStatus === "completed") {
    if (!PAID_BOOKING_PAYMENT_STATUSES.includes(booking.paymentStatus)) {
      const error = new Error("Only paid bookings can be completed");
      error.statusCode = 409;
      throw error;
    }
    booking.occupancyKeys = [];
    booking.slotKey = undefined;
    booking.completedAt = new Date();
    booking.qrStatus = "expired";
    booking.qrExpiresAt = booking.completedAt;
  }
  booking.history = booking.history || [];
  if (!booking.history.some((entry) => entry.status === nextStatus && entry.source === "manual")) {
    booking.history.push({
      at: nextStatus === "completed" ? booking.completedAt : new Date(),
      note: `Booking moved to ${nextStatus.replace("_", " ")}`,
      source: "manual",
      status: nextStatus,
    });
  }
  await booking.save();

  if (nextStatus === "completed") {
    await syncBookingById(booking._id, { now: booking.completedAt, source: "manual" });
  } else if (nextStatus === "cancelled") {
    await syncBookingById(booking._id, { now: booking.cancelledAt, source: "manual" });
  }

  await Notification.create({
    userId: booking.userId,
    title: nextStatus === "checked_in" ? "Booking checked in" : `Booking ${nextStatus}`,
    message:
      nextStatus === "completed"
        ? `Your booking at ${booking.turfId.name} is complete. Your invoice is ready in Booking Details.`
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
