const { body } = require("express-validator");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

function createTransactionId() {
  return `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

const paymentValidation = [
  body("bookingId").isMongoId().withMessage("Valid booking id is required"),
  body("paymentMethod").optional().isIn(["UPI", "Card", "Cash"]).withMessage("Invalid payment method"),
];

const createPayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentMethod = "UPI" } = req.body;
  const booking = await Booking.findById(bookingId).populate("turfId", "name ownerId");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = String(booking.turfId.ownerId) === String(req.user._id);
  const isUser = String(booking.userId) === String(req.user._id);

  if (!isUser && !isOwner && req.user.role !== "admin") {
    const error = new Error("You cannot pay for this booking");
    error.statusCode = 403;
    throw error;
  }

  if (booking.bookingStatus === "cancelled") {
    const error = new Error("Cancelled bookings cannot be paid");
    error.statusCode = 409;
    throw error;
  }

  const existingPayment = await Payment.findOne({ bookingId, paymentStatus: "paid" });
  if (existingPayment) {
    return successResponse(res, "Payment already completed", { payment: existingPayment, booking });
  }

  const payment = await Payment.create({
    userId: booking.userId,
    bookingId,
    amount: booking.totalAmount,
    paymentMethod,
    paymentStatus: "paid",
    transactionId: createTransactionId(),
  });

  booking.paymentStatus = "paid";
  booking.bookingStatus = "upcoming";
  await booking.save();

  await Notification.create({
    userId: booking.userId,
    title: "Payment successful",
    message: `Payment of ${booking.totalAmount} for ${booking.turfId.name} was successful.`,
  });

  return successResponse(res, "Payment successful", { payment, booking }, 201);
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === "user") {
    filter.userId = req.user._id;
  }

  const payments = await Payment.find(filter)
    .populate({
      path: "bookingId",
      populate: { path: "turfId", select: "name city ownerId" },
    })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  const scopedPayments =
    req.user.role === "owner"
      ? payments.filter((payment) => String(payment.bookingId?.turfId?.ownerId) === String(req.user._id))
      : payments;

  return successResponse(res, "Payment history fetched", { payments: scopedPayments });
});

module.exports = {
  createPayment,
  getPaymentHistory,
  paymentValidation,
};
