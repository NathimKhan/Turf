const { body } = require("express-validator");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { isOwnerActive, isVenueLive } = require("../utils/approval");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const { getPaymentProvider } = require("../services/paymentService");

const PLATFORM_FEE_RATE = 0.1;

function createTransactionId() {
  return `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function revenueSplit(amount) {
  const platformFee = money(amount * PLATFORM_FEE_RATE);
  return {
    ownerRevenue: money(amount - platformFee),
    platformFee,
    platformFeeRate: PLATFORM_FEE_RATE,
  };
}

function rupees(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

const paymentValidation = [
  body("bookingId").isMongoId().withMessage("Valid booking id is required"),
  body("paymentMethod").optional().isIn(["UPI", "Card", "Cash", "Mock Payment"]).withMessage("Invalid payment method"),
];

const createPayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentMethod = "UPI" } = req.body;
  const booking = await Booking.findById(bookingId)
    .populate({
      path: "turfId",
      populate: { path: "ownerId", select: "approvalStatus accountStatus role" },
      select: "name ownerId city location status isApproved moderationStatus",
    })
    .populate("userId", "name email");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const isUser = String(booking.userId?._id || booking.userId) === String(req.user._id);

  if (!isUser && req.user.role !== "admin") {
    const error = new Error("You cannot pay for this booking");
    error.statusCode = 403;
    throw error;
  }

  if (booking.bookingStatus === "cancelled") {
    const error = new Error("Cancelled bookings cannot be paid");
    error.statusCode = 409;
    throw error;
  }

  if (!isVenueLive(booking.turfId) || !isOwnerActive(booking.turfId.ownerId)) {
    const error = new Error("This venue is not accepting payments because it is not live.");
    error.statusCode = 403;
    throw error;
  }

  const ownerId = booking.turfId.ownerId?._id || booking.turfId.ownerId;
  const existingPayment = await Payment.findOne({ bookingId, paymentStatus: "paid" });
  if (existingPayment) {
    if (!existingPayment.platformFee && !existingPayment.ownerRevenue) {
      Object.assign(existingPayment, revenueSplit(existingPayment.amount));
      existingPayment.ownerId = existingPayment.ownerId || ownerId;
      existingPayment.venueId = existingPayment.venueId || booking.turfId._id;
      existingPayment.paidAt = existingPayment.paidAt || existingPayment.createdAt || new Date();
      await existingPayment.save();
    }
    return successResponse(res, "Payment already completed", { payment: existingPayment, booking });
  }

  const { name: providerName, provider } = getPaymentProvider();
  const split = revenueSplit(booking.totalAmount);
  const payment = await Payment.create({
    userId: booking.userId._id || booking.userId,
    bookingId,
    ownerId,
    venueId: booking.turfId._id,
    amount: booking.totalAmount,
    ...split,
    paymentMethod,
    paymentStatus: "pending",
    transactionId: createTransactionId(),
    provider: providerName,
  });

  try {
    const result = await provider.charge({
      amount: booking.totalAmount,
      bookingId: String(booking._id),
      paymentMethod,
      transactionId: payment.transactionId,
    });

    payment.paymentStatus = result.status;
    payment.providerReference = result.reference || "";
    payment.paidAt = result.status === "paid" ? new Date() : undefined;
    await payment.save();

    if (result.status === "paid") {
      booking.paymentStatus = "paid";
      booking.bookingStatus = "confirmed";
      await booking.save();
    }
  } catch (error) {
    payment.paymentStatus = "failed";
    payment.failureReason = error.message;
    await payment.save();
    throw error;
  }

  const bookingTarget = `/bookings/${booking._id}`;
  const receiptTarget = `/payments?payment=${payment._id}`;
  const notifications = [
    {
      userId: booking.userId._id || booking.userId,
      title: payment.paymentStatus === "paid" ? "Payment successful" : "Payment failed",
      message:
        payment.paymentStatus === "paid"
          ? `Payment of ${rupees(payment.amount)} completed successfully for ${booking.turfId.name}.`
          : `Payment for ${booking.turfId.name} could not be completed.`,
      metadata: { bookingId: booking._id, paymentId: payment._id, transactionId: payment.transactionId },
      targetUrl: payment.paymentStatus === "paid" ? receiptTarget : bookingTarget,
      type: "payment",
    },
    ...(payment.paymentStatus === "paid"
      ? [
        {
          userId: booking.userId._id || booking.userId,
          title: "Booking confirmed",
          message: `Your booking at ${booking.turfId.name} has been confirmed. Download your pass before arrival.`,
          metadata: { bookingId: booking._id, paymentId: payment._id, transactionId: payment.transactionId },
          targetUrl: bookingTarget,
          type: "booking",
        },
        {
          userId: ownerId,
          title: `${rupees(payment.ownerRevenue)} credited to your venue`,
          message: `Booking ${String(booking._id).slice(-8).toUpperCase()} at ${booking.turfId.name} is paid. Platform fee: ${rupees(payment.platformFee)}.`,
          metadata: { bookingId: booking._id, paymentId: payment._id, transactionId: payment.transactionId },
          targetUrl: "/owner/revenue",
          type: "revenue",
        },
      ]
      : []),
  ];

  if (payment.paymentStatus === "paid") {
    const admins = await User.find({ role: "admin" }).select("_id");
    notifications.push(
      ...admins.map((admin) => ({
        userId: admin._id,
        title: "Platform fee received",
        message: `${rupees(payment.platformFee)} platform fee received from ${booking.turfId.name}.`,
        metadata: { bookingId: booking._id, paymentId: payment._id, transactionId: payment.transactionId },
        targetUrl: "/admin/revenue",
        type: "revenue",
      })),
    );
  }

  await Notification.create(notifications);

  return successResponse(
    res,
    payment.paymentStatus === "paid" ? "Payment successful" : "Payment failed",
    { payment, booking },
    201,
  );
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === "user") {
    filter.userId = req.user._id;
  }

  const payments = await Payment.find(filter)
    .populate("ownerId", "name email businessName")
    .populate("venueId", "name city ownerId")
    .populate({
      path: "bookingId",
      populate: [
        { path: "turfId", select: "name city ownerId location" },
        { path: "userId", select: "name email phone" },
      ],
    })
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  const scopedPayments =
    req.user.role === "owner"
      ? payments.filter((payment) =>
          String(payment.ownerId?._id || payment.ownerId || payment.bookingId?.turfId?.ownerId) === String(req.user._id))
      : payments;

  return successResponse(res, "Payment history fetched", { payments: scopedPayments });
});

const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate({
    path: "bookingId",
    populate: { path: "turfId", select: "name" },
  });

  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }

  if (payment.paymentStatus !== "paid") {
    const error = new Error("Only paid transactions can be refunded");
    error.statusCode = 409;
    throw error;
  }

  const { provider } = getPaymentProvider();
  const result = await provider.refund({
    amount: payment.amount,
    transactionId: payment.transactionId,
  });

  payment.paymentStatus = result.status;
  payment.providerReference = result.reference || payment.providerReference;
  payment.refundedAt = new Date();
  await payment.save();

  if (payment.bookingId) {
    payment.bookingId.paymentStatus = "refunded";
    payment.bookingId.bookingStatus = "cancelled";
    payment.bookingId.occupancyKeys = [];
    payment.bookingId.slotKey = undefined;
    await payment.bookingId.save();
  }

  await Notification.create({
    userId: payment.userId,
    title: "Payment refunded",
    message: `Your payment of ${rupees(payment.amount)} has been refunded.`,
    metadata: { bookingId: payment.bookingId?._id || payment.bookingId, paymentId: payment._id, transactionId: payment.transactionId },
    targetUrl: "/payments",
    type: "payment",
  });

  return successResponse(res, "Payment refunded", { payment });
});

module.exports = {
  createPayment,
  getPaymentHistory,
  paymentValidation,
  revenueSplit,
  refundPayment,
};
