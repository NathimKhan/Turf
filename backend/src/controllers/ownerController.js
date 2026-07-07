const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Turf = require("../models/Turf");
const { ACTIVE_BOOKING_STATUSES } = require("../utils/bookingLifecycle");
const { approvalStatusForUser, isOwnerActive } = require("../utils/approval");
const { completeExpiredBookings } = require("../services/bookingLifecycleService");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const PLATFORM_FEE_RATE = 0.1;
const REVENUE_PAYMENT_STATUSES = ["paid", "partially_refunded"];

function paymentOwnerRevenue(payment) {
  const amount = Number(payment.amount || 0);
  const baseRevenue = Number(payment.ownerRevenue ?? (amount * (1 - PLATFORM_FEE_RATE)));
  const refundedAmount = Number(payment.refundedAmount || 0);
  const remainingRatio = amount > 0 ? Math.max(0, (amount - refundedAmount) / amount) : 1;
  return Number(Number(baseRevenue * remainingRatio).toFixed(2));
}

function sumPayments(payments, predicate = () => true) {
  return payments
    .filter(predicate)
    .reduce((sum, payment) => sum + paymentOwnerRevenue(payment), 0);
}

function timeToMinutes(time = "") {
  const [hours, minutes] = String(time).split(":").map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function isSameUtcDay(firstDate, secondDate) {
  return (
    firstDate.getUTCFullYear() === secondDate.getUTCFullYear() &&
    firstDate.getUTCMonth() === secondDate.getUTCMonth() &&
    firstDate.getUTCDate() === secondDate.getUTCDate()
  );
}

function paymentEventDate(payment) {
  return new Date(payment.finalizedAt || payment.paidAt || payment.createdAt);
}

function isRevenuePayment(payment) {
  return REVENUE_PAYMENT_STATUSES.includes(payment.paymentStatus);
}

function isFinalizedRevenuePayment(payment) {
  return isRevenuePayment(payment) && payment.finalizedAt;
}

function buildMonthlyEarnings(payments) {
  const monthlyMap = new Map();

  payments.filter(isFinalizedRevenuePayment).forEach((payment) => {
    const date = paymentEventDate(payment);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const current = monthlyMap.get(key) || {
      month: date.getMonth() + 1,
      payments: 0,
      revenue: 0,
      year: date.getFullYear(),
    };
    current.payments += 1;
    current.revenue = Number((current.revenue + paymentOwnerRevenue(payment)).toFixed(2));
    monthlyMap.set(key, current);
  });

  return [...monthlyMap.values()].sort((first, second) =>
    first.year === second.year ? first.month - second.month : first.year - second.year);
}

const getOwnerDashboard = asyncHandler(async (req, res) => {
  await completeExpiredBookings();

  const turfs = await Turf.find({ ownerId: req.user._id }).select("_id name sportsSupported");
  const turfIds = turfs.map((turf) => turf._id);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBookings, recentBookings, scopedPayments, dashboardBookings] = await Promise.all([
    Booking.countDocuments({ turfId: { $in: turfIds } }),
    Booking.find({ turfId: { $in: turfIds } })
      .populate("turfId", "name area city")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(8),
    Payment.find({
      $or: [
        { ownerId: req.user._id },
        { venueId: { $in: turfIds } },
      ],
    })
      .select("amount ownerRevenue platformFee paymentStatus paidAt finalizedAt refundedAmount createdAt bookingId ownerId venueId")
      .populate("bookingId", "sport"),
    Booking.find({ turfId: { $in: turfIds } })
      .populate("turfId", "name area city sportsSupported")
      .populate("userId", "name email")
      .sort({ bookingDate: 1, slotStartTime: 1 }),
  ]);

  const paidRevenue = sumPayments(scopedPayments, isRevenuePayment);
  const completedRevenue = sumPayments(scopedPayments, isFinalizedRevenuePayment);
  const revenue = completedRevenue;
  const todayRevenue = sumPayments(scopedPayments, (payment) =>
    isFinalizedRevenuePayment(payment) && paymentEventDate(payment) >= todayStart);
  const weeklyRevenue = sumPayments(scopedPayments, (payment) =>
    isFinalizedRevenuePayment(payment) && paymentEventDate(payment) >= weekStart);
  const monthlyRevenue = sumPayments(scopedPayments, (payment) =>
    isFinalizedRevenuePayment(payment) && paymentEventDate(payment) >= monthStart);
  const pendingRevenue = sumPayments(scopedPayments, (payment) =>
    payment.paymentStatus === "pending" || (isRevenuePayment(payment) && !payment.finalizedAt));
  const refundedRevenue = sumPayments(scopedPayments, (payment) => payment.paymentStatus === "refunded");
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayBookings = dashboardBookings.filter((booking) => isSameUtcDay(new Date(booking.bookingDate), now));
  const upcomingBookings = dashboardBookings.filter((booking) => {
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.bookingStatus)) return false;
    const bookingDate = new Date(booking.bookingDate);
    return bookingDate > todayStart || (isSameUtcDay(bookingDate, now) && timeToMinutes(booking.slotEndTime) > nowMinutes);
  });
  const liveBookings = todayBookings.filter((booking) => (
    ACTIVE_BOOKING_STATUSES.includes(booking.bookingStatus) &&
    timeToMinutes(booking.slotStartTime) <= nowMinutes &&
    timeToMinutes(booking.slotEndTime) > nowMinutes
  ));
  const cancelledBookings = dashboardBookings.filter((booking) => booking.bookingStatus === "cancelled");
  const completedBookings = dashboardBookings.filter((booking) => booking.bookingStatus === "completed");
  const perSportRevenueMap = new Map();

  scopedPayments
    .filter(isFinalizedRevenuePayment)
    .forEach((payment) => {
      const sport = payment.bookingId?.sport || "Unassigned";
      perSportRevenueMap.set(sport, (perSportRevenueMap.get(sport) || 0) + paymentOwnerRevenue(payment));
    });
  const perSportRevenue = [...perSportRevenueMap.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([sport, revenue]) => ({ sport, revenue: Number(revenue.toFixed(2)) }));

  const monthlyEarnings = buildMonthlyEarnings(scopedPayments);

  return successResponse(res, "Owner dashboard fetched", {
    accountStatus: req.user.accountStatus,
    approvalStatus: approvalStatusForUser(req.user),
    isApproved: isOwnerActive(req.user),
    disabledSections: isOwnerActive(req.user) ? [] : ["addVenue", "availability", "bookings", "revenue"],
    totalTurfs: turfs.length,
    totalBookings,
    bookingBreakdown: {
      cancelled: cancelledBookings.length,
      completed: completedBookings.length,
      live: liveBookings.length,
      today: todayBookings.length,
      upcoming: upcomingBookings.length,
    },
    cancelledBookings: cancelledBookings.slice(0, 8),
    liveBookings: liveBookings.slice(0, 8),
    todaysBookings: todayBookings.slice(0, 8),
    upcomingBookings: upcomingBookings.slice(0, 8),
    revenue,
    paidRevenue,
    finalizedRevenue: completedRevenue,
    perSportRevenue,
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    pendingRevenue,
    completedRevenue,
    refundedRevenue,
    recentBookings,
    monthlyEarnings,
  });
});

module.exports = {
  getOwnerDashboard,
};
