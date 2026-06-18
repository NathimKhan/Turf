const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const Turf = require("../models/Turf");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const PLATFORM_FEE_RATE = 0.1;

function paymentOwnerRevenue(payment) {
  return Number(Number(payment.ownerRevenue ?? (Number(payment.amount || 0) * (1 - PLATFORM_FEE_RATE))).toFixed(2));
}

function sumPayments(payments, predicate = () => true) {
  return payments
    .filter(predicate)
    .reduce((sum, payment) => sum + paymentOwnerRevenue(payment), 0);
}

const getOwnerDashboard = asyncHandler(async (req, res) => {
  const turfs = await Turf.find({ ownerId: req.user._id }).select("_id name");
  const turfIds = turfs.map((turf) => turf._id);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBookings, recentBookings, scopedPayments] = await Promise.all([
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
    }).select("amount ownerRevenue platformFee paymentStatus paidAt createdAt"),
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
    totalTurfs: turfs.length,
    totalBookings,
    revenue,
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
