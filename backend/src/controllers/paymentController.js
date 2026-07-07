const { body } = require("express-validator");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { isOwnerActive, isVenueLive } = require("../utils/approval");
const { PAID_BOOKING_PAYMENT_STATUSES, hasBookingEnded } = require("../utils/bookingLifecycle");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const { completeExpiredBookings, syncBookingById } = require("../services/bookingLifecycleService");
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
  return `INR ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function appendBookingHistory(booking, status, note, source, at = new Date()) {
  booking.history = booking.history || [];
  if (booking.history.some((entry) => entry.status === status && entry.source === source)) return;

  booking.history.push({ at, note, source, status });
}

function releaseBookingAfterPaymentFailure(booking, at = new Date()) {
  booking.paymentStatus = "failed";
  booking.bookingStatus = "cancelled";
  booking.occupancyKeys = [];
  booking.slotKey = undefined;
  booking.cancelledAt = booking.cancelledAt || at;
  booking.qrStatus = "cancelled";
  booking.qrExpiresAt = booking.cancelledAt;
  booking.invoiceStatus = "not_required";
  appendBookingHistory(booking, "payment_failed", "Payment failed and the slot was released", "payment", at);
}

const paymentValidation = [
  body("bookingId").isMongoId().withMessage("Valid booking id is required"),
  body("paymentMethod").optional().isIn(["UPI", "Card", "Cash", "Mock Payment"]).withMessage("Invalid payment method"),
];

const createPayment = asyncHandler(async (req, res) => {
  await completeExpiredBookings();

  const { bookingId, paymentMethod = "UPI" } = req.body;
  const booking = await Booking.findById(bookingId)
    .populate({
      path: "turfId",
      populate: { path: "ownerId", select: "approvalStatus accountStatus role" },
      select: "name ownerId area city state address location latitude longitude status approvalStatus visibility isPublished isVerified isApproved moderationStatus",
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

  if (booking.bookingStatus === "completed" || hasBookingEnded(booking)) {
    const error = new Error("This booking slot has already ended");
    error.statusCode = 409;
    throw error;
  }

  if (!isVenueLive(booking.turfId) || !isOwnerActive(booking.turfId.ownerId)) {
    const error = new Error("This venue is not accepting payments because it is not live.");
    error.statusCode = 403;
    throw error;
  }

  const ownerId = booking.turfId.ownerId?._id || booking.turfId.ownerId;
  const existingPayment = await Payment.findOne({ bookingId, paymentStatus: { $in: PAID_BOOKING_PAYMENT_STATUSES } });
  if (existingPayment) {
    if (!existingPayment.platformFee && !existingPayment.ownerRevenue) {
      Object.assign(existingPayment, revenueSplit(existingPayment.amount));
      existingPayment.ownerId = existingPayment.ownerId || ownerId;
      existingPayment.venueId = existingPayment.venueId || booking.turfId._id;
      existingPayment.paidAt = existingPayment.paidAt || existingPayment.createdAt || new Date();
      await existingPayment.save();
    }
    booking.paymentStatus = existingPayment.paymentStatus;
    if (booking.bookingStatus === "pending") booking.bookingStatus = "confirmed";
    booking.qrStatus = booking.bookingStatus === "completed" ? "expired" : "active";
    await booking.save();
    await syncBookingById(booking._id, { source: "payment" });
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
      booking.qrStatus = "active";
      booking.invoiceStatus = booking.invoiceStatus || "pending";
      appendBookingHistory(booking, "payment_paid", "Payment captured and booking confirmed", "payment", payment.paidAt);
      await booking.save();
      await syncBookingById(booking._id, { now: payment.paidAt, source: "payment" });
    } else {
      releaseBookingAfterPaymentFailure(booking);
      await booking.save();
      await syncBookingById(booking._id, { now: booking.cancelledAt, source: "payment" });
    }
  } catch (error) {
    payment.paymentStatus = "failed";
    payment.failureReason = error.message;
    await payment.save();
    releaseBookingAfterPaymentFailure(booking);
    await booking.save();
    await syncBookingById(booking._id, { now: booking.cancelledAt, source: "payment" });
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
          title: `${rupees(payment.ownerRevenue)} pending finalization`,
          message: `Booking ${String(booking._id).slice(-8).toUpperCase()} at ${booking.turfId.name} is paid. Revenue finalizes after completion.`,
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
        title: "Platform fee pending finalization",
        message: `${rupees(payment.platformFee)} platform fee will finalize after booking completion.`,
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
  await completeExpiredBookings();

  const filter = {};

  if (req.user.role === "user") {
    filter.userId = req.user._id;
  }

  const payments = await Payment.find(filter)
    .populate("ownerId", "name email businessName")
    .populate("venueId", "name area city state address location latitude longitude ownerId")
    .populate({
      path: "bookingId",
      populate: [
        { path: "turfId", select: "name area city state address ownerId location latitude longitude" },
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

  if (!PAID_BOOKING_PAYMENT_STATUSES.includes(payment.paymentStatus)) {
    const error = new Error("Only paid transactions can be refunded");
    error.statusCode = 409;
    throw error;
  }

  const alreadyRefunded = Number(payment.refundedAmount || 0);
  const requestedAmount = req.body.amount === undefined ? Number(payment.amount || 0) - alreadyRefunded : Number(req.body.amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    const error = new Error("Refund amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }
  if (requestedAmount + alreadyRefunded > Number(payment.amount || 0)) {
    const error = new Error("Refund amount exceeds the captured payment");
    error.statusCode = 400;
    throw error;
  }

  const { provider } = getPaymentProvider();
  const result = await provider.refund({
    amount: requestedAmount,
    transactionId: payment.transactionId,
  });

  const totalRefunded = money(alreadyRefunded + requestedAmount);
  const fullyRefunded = totalRefunded >= money(payment.amount);
  const refundAt = new Date();

  payment.paymentStatus = fullyRefunded ? "refunded" : "partially_refunded";
  payment.providerReference = result.reference || payment.providerReference;
  payment.refundedAmount = totalRefunded;
  payment.refundStatus = fullyRefunded ? "full" : "partial";
  payment.refundedAt = fullyRefunded ? refundAt : payment.refundedAt;
  payment.refundHistory = payment.refundHistory || [];
  payment.refundHistory.push({
    amount: requestedAmount,
    at: refundAt,
    providerReference: result.reference || "",
    status: payment.paymentStatus,
  });
  if (fullyRefunded) payment.invoiceStatus = payment.finalizedAt ? "void" : "not_required";
  await payment.save();

  if (payment.bookingId) {
    payment.bookingId.paymentStatus = payment.paymentStatus;
    if (fullyRefunded && payment.bookingId.bookingStatus !== "completed") {
      payment.bookingId.bookingStatus = "cancelled";
      payment.bookingId.cancelledAt = payment.bookingId.cancelledAt || refundAt;
      payment.bookingId.occupancyKeys = [];
      payment.bookingId.slotKey = undefined;
      payment.bookingId.qrStatus = "cancelled";
      payment.bookingId.qrExpiresAt = payment.bookingId.cancelledAt;
      payment.bookingId.invoiceStatus = "not_required";
    } else if (fullyRefunded) {
      payment.bookingId.qrStatus = "expired";
      payment.bookingId.qrExpiresAt = payment.bookingId.qrExpiresAt || payment.bookingId.completedAt || refundAt;
      payment.bookingId.invoiceStatus = "void";
    }
    appendBookingHistory(
      payment.bookingId,
      fullyRefunded ? "payment_refunded" : "payment_partially_refunded",
      fullyRefunded ? "Payment refunded" : "Payment partially refunded",
      "refund",
      refundAt,
    );
    await payment.bookingId.save();
    await syncBookingById(payment.bookingId._id, { now: refundAt, source: "refund" });
  }

  await Notification.create({
    userId: payment.userId,
    title: fullyRefunded ? "Payment refunded" : "Payment partially refunded",
    message: `Your payment refund of ${rupees(requestedAmount)} has been processed.`,
    metadata: { bookingId: payment.bookingId?._id || payment.bookingId, paymentId: payment._id, transactionId: payment.transactionId },
    targetUrl: "/payments",
    type: "payment",
  });

  return successResponse(res, fullyRefunded ? "Payment refunded" : "Payment partially refunded", { payment });
});

module.exports = {
  createPayment,
  getPaymentHistory,
  paymentValidation,
  revenueSplit,
  refundPayment,
};
