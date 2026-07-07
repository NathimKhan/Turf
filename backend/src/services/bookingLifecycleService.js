const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const {
  ACTIVE_BOOKING_STATUSES,
  PAID_BOOKING_PAYMENT_STATUSES,
  currentTimeKey,
  dateOnlyFromLocalDate,
  expiredBookingsFilter,
  expiredPaidBookingsFilter,
  hasBookingEnded,
  hasBookingStarted,
} = require("../utils/bookingLifecycle");
const { isDemoPaymentMode } = require("./paymentService");

const PLATFORM_FEE_RATE = 0.1;
const AUTO_MANAGED_ACTIVE_STATUSES = ["pending", "confirmed", "upcoming", "ongoing"];

let lifecycleTimer = null;

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

function shortId(value) {
  return String(value || "").slice(-8).toUpperCase();
}

function demoTransactionId(booking) {
  return `DEMO-${shortId(booking._id)}`;
}

function invoiceIdForBooking(booking) {
  return `INV-${shortId(booking._id)}`;
}

function hasCapturedPaymentStatus(status) {
  return PAID_BOOKING_PAYMENT_STATUSES.includes(String(status || "").toLowerCase());
}

function isTerminalStatus(status) {
  return ["cancelled", "completed"].includes(String(status || "").toLowerCase());
}

function desiredPaidActiveStatus(booking, now) {
  return hasBookingStarted(booking, now) ? "ongoing" : "upcoming";
}

function addHistoryEvent(booking, status, at, note, source = "system") {
  const exists = (booking.history || []).some((entry) => entry.status === status && entry.source === source);
  if (exists) return false;

  booking.history = booking.history || [];
  booking.history.push({ at, note, source, status });
  return true;
}

function clearSlotReservation(booking) {
  let changed = false;

  if (booking.slotKey) {
    booking.slotKey = undefined;
    changed = true;
  }
  if (Array.isArray(booking.occupancyKeys) && booking.occupancyKeys.length) {
    booking.occupancyKeys = [];
    changed = true;
  }

  return changed;
}

function markInvoiceReady(target, invoiceId, now) {
  let changed = false;

  if (target.invoiceStatus !== "ready") {
    target.invoiceStatus = "ready";
    changed = true;
  }
  if (!target.invoiceId) {
    target.invoiceId = invoiceId;
    changed = true;
  }
  if (!target.invoiceGeneratedAt) {
    target.invoiceGeneratedAt = now;
    changed = true;
  }

  return changed;
}

function markInvoiceVoid(target, status = "void") {
  let changed = false;

  if (target.invoiceStatus !== status) {
    target.invoiceStatus = status;
    changed = true;
  }

  return changed;
}

async function latestPaymentForBooking(bookingId) {
  return Payment.findOne({ bookingId }).sort({ createdAt: -1, _id: -1 });
}

async function ensureDemoPaidPayment(booking, now) {
  if (!isDemoPaymentMode()) return { payment: null, paymentSynced: false };
  if (booking.paymentStatus === "refunded") return { payment: null, paymentSynced: false };

  const split = revenueSplit(booking.totalAmount);
  const transactionId = demoTransactionId(booking);
  let payment = await latestPaymentForBooking(booking._id);
  let paymentSynced = false;

  if (!payment) {
    payment = await Payment.create({
      userId: booking.userId,
      bookingId: booking._id,
      ownerId: booking.ownerId,
      venueId: booking.turfId,
      amount: booking.totalAmount,
      ...split,
      paymentMethod: "Mock Payment",
      paymentStatus: "paid",
      transactionId,
      provider: "mock",
      providerReference: `DEMO-COMPLETE-${shortId(booking._id)}`,
      paidAt: booking.completedAt || now,
    });
    paymentSynced = true;
  } else if (!hasCapturedPaymentStatus(payment.paymentStatus)) {
    payment.amount = payment.amount || booking.totalAmount;
    payment.ownerId = payment.ownerId || booking.ownerId;
    payment.venueId = payment.venueId || booking.turfId;
    payment.platformFee = payment.platformFee || split.platformFee;
    payment.ownerRevenue = payment.ownerRevenue || split.ownerRevenue;
    payment.platformFeeRate = payment.platformFeeRate || split.platformFeeRate;
    payment.paymentMethod = payment.paymentMethod || "Mock Payment";
    payment.paymentStatus = "paid";
    payment.provider = payment.provider || "mock";
    payment.providerReference = payment.providerReference || `DEMO-COMPLETE-${shortId(booking._id)}`;
    payment.paidAt = payment.paidAt || booking.completedAt || now;
    payment.failureReason = "";
    await payment.save();
    paymentSynced = true;
  }

  if (booking.paymentStatus !== "paid") {
    booking.paymentStatus = "paid";
    paymentSynced = true;
  }

  return { payment, paymentSynced };
}

async function finalizePaidPaymentsForBooking(booking, now) {
  const invoiceId = invoiceIdForBooking(booking);
  const payments = await Payment.find({
    bookingId: booking._id,
    paymentStatus: { $in: PAID_BOOKING_PAYMENT_STATUSES },
  });
  let finalizedPayments = 0;
  let invoicesGenerated = 0;

  for (const payment of payments) {
    let changed = false;
    if (!payment.finalizedAt) {
      payment.finalizedAt = booking.completedAt || now;
      finalizedPayments += 1;
      changed = true;
    }
    if (markInvoiceReady(payment, invoiceId, now)) {
      invoicesGenerated += 1;
      changed = true;
    }
    if (changed) await payment.save();
  }

  if (hasCapturedPaymentStatus(booking.paymentStatus) && markInvoiceReady(booking, invoiceId, now)) {
    invoicesGenerated += 1;
  }

  return { finalizedPayments, invoicesGenerated };
}

async function notifyOnce({ booking, lifecycleEvent, message, targetUrl, title, type = "booking", userId }) {
  if (!userId) return false;

  const exists = await Notification.exists({
    userId,
    "metadata.bookingId": booking._id,
    "metadata.lifecycleEvent": lifecycleEvent,
  });
  if (exists) return false;

  await Notification.create({
    userId,
    title,
    message,
    metadata: {
      bookingId: booking._id,
      lifecycleEvent,
      turfId: booking.turfId,
    },
    targetUrl,
    type,
  });
  return true;
}

async function notifyBookingCompleted(booking) {
  const bookingId = String(booking._id);
  await Promise.all([
    notifyOnce({
      booking,
      lifecycleEvent: "booking_completed",
      message: "Your booking is complete. The invoice is ready in Booking Details.",
      targetUrl: `/bookings/${bookingId}`,
      title: "Booking completed",
      userId: booking.userId,
    }),
    notifyOnce({
      booking,
      lifecycleEvent: "owner_booking_completed",
      message: `Booking ${shortId(booking._id)} is complete and revenue is finalized.`,
      targetUrl: "/owner/bookings",
      title: "Booking completed",
      userId: booking.ownerId,
    }),
  ]);
}

async function syncBookingLifecycle(booking, { now = new Date(), source = "lifecycle" } = {}) {
  const result = {
    cancelledExpiredBookings: 0,
    completedBookings: 0,
    demoPaymentsSynced: 0,
    finalizedPayments: 0,
    invoicesGenerated: 0,
    qrExpired: 0,
    slotsReleased: 0,
  };
  if (!booking) return result;

  const previousStatus = booking.bookingStatus;
  let payment = await latestPaymentForBooking(booking._id);
  let changed = false;

  if (payment?.paymentStatus === "refunded") {
    booking.paymentStatus = "refunded";
    if (booking.bookingStatus !== "completed") {
      booking.bookingStatus = "cancelled";
      booking.cancelledAt = booking.cancelledAt || payment.refundedAt || now;
      result.cancelledExpiredBookings += 1;
    }
    if (clearSlotReservation(booking)) result.slotsReleased += 1;
    if (booking.qrStatus !== "expired" && booking.qrStatus !== "cancelled") {
      booking.qrStatus = booking.bookingStatus === "completed" ? "expired" : "cancelled";
      booking.qrExpiresAt = booking.qrExpiresAt || payment.refundedAt || now;
      result.qrExpired += 1;
    }
    if (markInvoiceVoid(booking)) changed = true;
    addHistoryEvent(booking, "payment_refunded", payment.refundedAt || now, "Payment refunded", source);
    changed = true;
  } else if (payment?.paymentStatus === "partially_refunded") {
    booking.paymentStatus = "partially_refunded";
    changed = true;
  } else if (payment?.paymentStatus === "paid" && booking.paymentStatus !== "paid") {
    booking.paymentStatus = "paid";
    changed = true;
  }

  const bookingEnded = hasBookingEnded(booking, now);
  const isActiveBooking = ACTIVE_BOOKING_STATUSES.includes(booking.bookingStatus);
  const hasCapturedPayment = hasCapturedPaymentStatus(booking.paymentStatus);

  if (isActiveBooking && bookingEnded && hasCapturedPayment) {
    booking.bookingStatus = "completed";
    booking.completedAt = booking.completedAt || now;
    changed = true;
  } else if (isActiveBooking && bookingEnded && !hasCapturedPayment) {
    booking.bookingStatus = "cancelled";
    booking.cancelledAt = booking.cancelledAt || now;
    booking.qrStatus = "cancelled";
    booking.qrExpiresAt = booking.qrExpiresAt || now;
    markInvoiceVoid(booking, "not_required");
    if (clearSlotReservation(booking)) result.slotsReleased += 1;
    addHistoryEvent(booking, "payment_expired", now, "Payment was not completed before the slot ended", source);
    result.cancelledExpiredBookings += 1;
    changed = true;
  }

  if (booking.bookingStatus === "completed" && !hasCapturedPaymentStatus(booking.paymentStatus)) {
    const demoResult = await ensureDemoPaidPayment(booking, now);
    payment = demoResult.payment || payment;
    if (demoResult.paymentSynced) {
      result.demoPaymentsSynced += 1;
      changed = true;
    }
  }

  if (booking.bookingStatus === "completed") {
    if (!booking.completedAt) {
      booking.completedAt = now;
      changed = true;
    }
    if (clearSlotReservation(booking)) result.slotsReleased += 1;
    if (booking.qrStatus !== "expired") {
      booking.qrStatus = "expired";
      booking.qrExpiresAt = booking.qrExpiresAt || booking.completedAt || now;
      result.qrExpired += 1;
      changed = true;
    }
    if (hasCapturedPaymentStatus(booking.paymentStatus)) {
      const paymentResult = await finalizePaidPaymentsForBooking(booking, now);
      result.finalizedPayments += paymentResult.finalizedPayments;
      result.invoicesGenerated += paymentResult.invoicesGenerated;
      changed = true;
    }
    if (addHistoryEvent(booking, "completed", booking.completedAt || now, "Booking completed", source)) {
      changed = true;
    }
  } else if (booking.bookingStatus === "cancelled") {
    if (clearSlotReservation(booking)) result.slotsReleased += 1;
    if (booking.qrStatus !== "cancelled") {
      booking.qrStatus = "cancelled";
      booking.qrExpiresAt = booking.qrExpiresAt || booking.cancelledAt || now;
      result.qrExpired += 1;
      changed = true;
    }
    if (!hasCapturedPaymentStatus(booking.paymentStatus) && markInvoiceVoid(booking, "not_required")) {
      changed = true;
    }
    if (addHistoryEvent(booking, "cancelled", booking.cancelledAt || now, "Booking cancelled", source)) {
      changed = true;
    }
  } else if (hasCapturedPaymentStatus(booking.paymentStatus)) {
    if (AUTO_MANAGED_ACTIVE_STATUSES.includes(booking.bookingStatus)) {
      const nextStatus = desiredPaidActiveStatus(booking, now);
      if (booking.bookingStatus !== nextStatus) {
        booking.bookingStatus = nextStatus;
        changed = true;
        addHistoryEvent(
          booking,
          nextStatus,
          now,
          nextStatus === "ongoing" ? "Booking is ongoing" : "Booking is upcoming",
          source,
        );
      }
    } else if (booking.bookingStatus === "pending") {
      booking.bookingStatus = "confirmed";
      changed = true;
    }
    if (booking.qrStatus !== "active") {
      booking.qrStatus = "active";
      booking.qrExpiresAt = undefined;
      changed = true;
    }
    if (addHistoryEvent(booking, "payment_paid", payment?.paidAt || now, "Payment captured", source)) {
      changed = true;
    }
  }

  if (isTerminalStatus(booking.bookingStatus) || hasCapturedPaymentStatus(booking.paymentStatus)) {
    booking.lifecycleSyncedAt = now;
    changed = true;
  }

  if (booking.bookingStatus === "completed" && previousStatus !== "completed") {
    result.completedBookings += 1;
  }

  if (changed || booking.isModified()) {
    await booking.save();
  }

  if (booking.bookingStatus === "completed" && previousStatus !== "completed") {
    await notifyBookingCompleted(booking);
  }

  return result;
}

function mergeResult(target, update) {
  for (const [key, value] of Object.entries(update)) {
    target[key] = (target[key] || 0) + Number(value || 0);
  }
  return target;
}

async function loadBookingsByIds(ids) {
  if (!ids.length) return [];
  return Booking.find({ _id: { $in: ids } }).select("+occupancyKeys");
}

async function lifecycleCandidateIds(now) {
  const today = dateOnlyFromLocalDate(now);
  const currentTime = currentTimeKey(now);
  const legacyOr = [
    {
      bookingStatus: { $in: ["pending", "confirmed"] },
      paymentStatus: { $in: PAID_BOOKING_PAYMENT_STATUSES },
    },
    {
      bookingStatus: { $in: ["confirmed", "upcoming"] },
      paymentStatus: { $in: PAID_BOOKING_PAYMENT_STATUSES },
      bookingDate: today,
      slotStartTime: { $lte: currentTime },
      slotEndTime: { $gt: currentTime },
    },
    expiredPaidBookingsFilter(now),
    expiredBookingsFilter(now, ["pending", "failed"]),
    {
      bookingStatus: "completed",
      $or: [
        { completedAt: { $exists: false } },
        { invoiceStatus: { $ne: "ready" } },
        { qrStatus: { $ne: "expired" } },
        { slotKey: { $exists: true } },
        { occupancyKeys: { $exists: true, $ne: [] } },
      ],
    },
    {
      bookingStatus: "cancelled",
      $or: [
        { slotKey: { $exists: true } },
        { occupancyKeys: { $exists: true, $ne: [] } },
        { qrStatus: { $nin: ["cancelled", "expired"] } },
      ],
    },
    {
      paymentStatus: "refunded",
      $or: [
        { slotKey: { $exists: true } },
        { occupancyKeys: { $exists: true, $ne: [] } },
        { qrStatus: { $nin: ["cancelled", "expired"] } },
      ],
    },
  ];

  if (isDemoPaymentMode()) {
    legacyOr.push({
      bookingStatus: "completed",
      paymentStatus: { $in: ["pending", "failed"] },
    });
  }

  const candidates = await Booking.find({ $or: legacyOr }).select("_id").limit(500);
  return [...new Set(candidates.map((booking) => String(booking._id)))];
}

async function completeExpiredBookings(now = new Date()) {
  const result = {
    cancelledExpiredBookings: 0,
    completedBookings: 0,
    demoPaymentsSynced: 0,
    finalizedPayments: 0,
    invoicesGenerated: 0,
    qrExpired: 0,
    slotsReleased: 0,
  };
  const ids = await lifecycleCandidateIds(now);
  const bookings = await loadBookingsByIds(ids);

  for (const booking of bookings) {
    mergeResult(result, await syncBookingLifecycle(booking, { now, source: "worker" }));
  }

  return result;
}

async function syncBookingById(bookingId, options = {}) {
  const booking = await Booking.findById(bookingId).select("+occupancyKeys");
  return syncBookingLifecycle(booking, options);
}

async function migrateExistingBookingLifecycles(now = new Date()) {
  return completeExpiredBookings(now);
}

function startBookingLifecycleWorker({ intervalMs = 60 * 1000 } = {}) {
  if (lifecycleTimer) return lifecycleTimer;

  lifecycleTimer = setInterval(() => {
    completeExpiredBookings().catch((error) => {
      console.error(`[booking-lifecycle] ${error.message}`);
    });
  }, intervalMs);
  lifecycleTimer.unref?.();

  return lifecycleTimer;
}

function stopBookingLifecycleWorker() {
  if (!lifecycleTimer) return;

  clearInterval(lifecycleTimer);
  lifecycleTimer = null;
}

module.exports = {
  completeExpiredBookings,
  migrateExistingBookingLifecycles,
  syncBookingById,
  syncBookingLifecycle,
  startBookingLifecycleWorker,
  stopBookingLifecycleWorker,
};
