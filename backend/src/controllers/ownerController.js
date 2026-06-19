const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const Turf = require("../models/Turf");
const { approvalStatusForUser, isOwnerActive } = require("../utils/approval");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const PLATFORM_FEE_RATE = 0.1;
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "checked_in", "upcoming"];

function paymentOwnerRevenue(payment) {
  return Number(Number(payment.ownerRevenue ?? (Number(payment.amount || 0) * (1 - PLATFORM_FEE_RATE))).toFixed(2));
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

const getOwnerDashboard = asyncHandler(async (req, res) => {
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
      .populate("turfId", "name city")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(8),
    Payment.find({
      $or: [
        { ownerId: req.user._id },
        { venueId: { $in: turfIds } },
      ],
    })
      .select("amount ownerRevenue platformFee paymentStatus paidAt createdAt bookingId ownerId venueId")
      .populate("bookingId", "sport"),
    Booking.find({ turfId: { $in: turfIds } })
      .populate("turfId", "name city sportsSupported")
      .populate("userId", "name email")
      .sort({ bookingDate: 1, slotStartTime: 1 }),
  ]);

  const revenue = sumPayments(scopedPayments, (payment) => payment.paymentStatus === "paid");
  const todayRevenue = sumPayments(scopedPayments, (payment) =>
    payment.paymentStatus === "paid" && new Date(payment.paidAt || payment.createdAt) >= todayStart);
  const weeklyRevenue = sumPayments(scopedPayments, (payment) =>
    payment.paymentStatus === "paid" && new Date(payment.paidAt || payment.createdAt) >= weekStart);
  const monthlyRevenue = sumPayments(scopedPayments, (payment) =>
    payment.paymentStatus === "paid" && new Date(payment.paidAt || payment.createdAt) >= monthStart);
  const pendingRevenue = sumPayments(scopedPayments, (payment) => payment.paymentStatus === "pending");
  const completedRevenue = revenue;
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
  const perSportRevenueMap = new Map();

  scopedPayments
    .filter((payment) => payment.paymentStatus === "paid")
    .forEach((payment) => {
      const sport = payment.bookingId?.sport || "Unassigned";
      perSportRevenueMap.set(sport, (perSportRevenueMap.get(sport) || 0) + paymentOwnerRevenue(payment));
    });
  const perSportRevenue = [...perSportRevenueMap.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([sport, revenue]) => ({ sport, revenue: Number(revenue.toFixed(2)) }));

  const monthlyEarnings = await Payment.aggregate([
    {
      $match: {
        paymentStatus: "paid",
        $or: [
          { ownerId: req.user._id },
          { venueId: { $in: turfIds } },
        ],
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: {
          $sum: {
            $ifNull: ["$ownerRevenue", { $multiply: ["$amount", 1 - PLATFORM_FEE_RATE] }],
          },
        },
        payments: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        revenue: 1,
        payments: 1,
      },
    },
  ]);

  return successResponse(res, "Owner dashboard fetched", {
    accountStatus: req.user.accountStatus,
    approvalStatus: approvalStatusForUser(req.user),
    isApproved: isOwnerActive(req.user),
    disabledSections: isOwnerActive(req.user) ? [] : ["addVenue", "availability", "bookings", "revenue"],
    totalTurfs: turfs.length,
    totalBookings,
    bookingBreakdown: {
      cancelled: cancelledBookings.length,
      live: liveBookings.length,
      today: todayBookings.length,
      upcoming: upcomingBookings.length,
    },
    cancelledBookings: cancelledBookings.slice(0, 8),
    liveBookings: liveBookings.slice(0, 8),
    todaysBookings: todayBookings.slice(0, 8),
    upcomingBookings: upcomingBookings.slice(0, 8),
    revenue,
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

const getOwnerReviews = asyncHandler(async (req, res) => {
  const turfs = await Turf.find({ ownerId: req.user._id }).select("_id");
  const reviews = await Review.find({ turfId: { $in: turfs.map((turf) => turf._id) } })
    .populate("turfId", "name")
    .populate("userId", "name profileImage")
    .sort({ createdAt: -1 });

  return successResponse(res, "Owner reviews fetched", { reviews });
});

module.exports = {
  getOwnerDashboard,
  getOwnerReviews,
};
