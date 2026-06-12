const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Turf = require("../models/Turf");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const getOwnerDashboard = asyncHandler(async (req, res) => {
  const turfs = await Turf.find({ ownerId: req.user._id }).select("_id name");
  const turfIds = turfs.map((turf) => turf._id);

  const [totalBookings, recentBookings, paidBookings] = await Promise.all([
    Booking.countDocuments({ turfId: { $in: turfIds } }),
    Booking.find({ turfId: { $in: turfIds } })
      .populate("turfId", "name city")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(8),
    Booking.find({ turfId: { $in: turfIds }, paymentStatus: "paid" }).select("_id"),
  ]);

  const paidBookingIds = paidBookings.map((booking) => booking._id);
  const [revenueResult, monthlyEarnings] = await Promise.all([
    Payment.aggregate([
      { $match: { bookingId: { $in: paidBookingIds }, paymentStatus: "paid" } },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { bookingId: { $in: paidBookingIds }, paymentStatus: "paid" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
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
    ]),
  ]);

  return successResponse(res, "Owner dashboard fetched", {
    totalTurfs: turfs.length,
    totalBookings,
    revenue: revenueResult[0]?.revenue || 0,
    recentBookings,
    monthlyEarnings,
  });
});

module.exports = {
  getOwnerDashboard,
};
