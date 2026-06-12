const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Turf = require("../models/Turf");
const User = require("../models/User");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const getAdminDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalOwners,
    totalTurfs,
    totalBookings,
    revenueResult,
    recentUsers,
    recentBookings,
    recentPayments,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "owner" }),
    Turf.countDocuments(),
    Booking.countDocuments(),
    Payment.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]),
    User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt"),
    Booking.find()
      .populate("userId", "name email")
      .populate("turfId", "name city")
      .sort({ createdAt: -1 })
      .limit(5),
    Payment.find()
      .populate("userId", "name email")
      .populate("bookingId", "turfId totalAmount")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const recentActivities = [
    ...recentUsers.map((user) => ({
      type: "user",
      message: `${user.name} joined as ${user.role}`,
      createdAt: user.createdAt,
    })),
    ...recentBookings.map((booking) => ({
      type: "booking",
      message: `${booking.userId?.name || "A user"} booked ${booking.turfId?.name || "a turf"}`,
      createdAt: booking.createdAt,
    })),
    ...recentPayments.map((payment) => ({
      type: "payment",
      message: `${payment.userId?.name || "A user"} paid ${payment.amount}`,
      createdAt: payment.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return successResponse(res, "Admin dashboard fetched", {
    totalUsers,
    totalOwners,
    totalTurfs,
    totalBookings,
    totalRevenue: revenueResult[0]?.revenue || 0,
    recentActivities,
  });
});

module.exports = {
  getAdminDashboard,
};
