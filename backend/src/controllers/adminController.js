const Booking = require("../models/Booking");
const BookingConflictLog = require("../models/BookingConflictLog");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const PlatformSetting = require("../models/PlatformSetting");
const Turf = require("../models/Turf");
const User = require("../models/User");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const PLATFORM_FEE_RATE = 0.1;

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
    pendingOwners,
    pendingTurfs,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "owner" }),
    Turf.countDocuments(),
    Booking.countDocuments(),
    Payment.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: "$amount" },
          platformRevenue: {
            $sum: {
              $ifNull: ["$platformFee", { $multiply: ["$amount", PLATFORM_FEE_RATE] }],
            },
          },
          ownerRevenue: {
            $sum: {
              $ifNull: ["$ownerRevenue", { $multiply: ["$amount", 1 - PLATFORM_FEE_RATE] }],
            },
          },
        },
      },
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
    User.countDocuments({ role: "owner", accountStatus: "pending" }),
    Turf.countDocuments({
      isApproved: false,
      $or: [{ moderationStatus: "pending" }, { moderationStatus: { $exists: false } }],
    }),
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
    grossRevenue: revenueResult[0]?.grossRevenue || 0,
    ownerRevenue: revenueResult[0]?.ownerRevenue || 0,
    platformRevenue: revenueResult[0]?.platformRevenue || 0,
    totalRevenue: revenueResult[0]?.platformRevenue || revenueResult[0]?.grossRevenue || 0,
    pendingOwners,
    pendingTurfs,
    recentActivities,
  });
});

const getOwners = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const filter = { role: "owner" };

  if (status) filter.accountStatus = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { businessName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [owners, total] = await Promise.all([
    User.find(filter)
      .select("name businessName email phone address accountStatus rejectionReason approvedAt createdAt")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    User.countDocuments(filter),
  ]);

  return successResponse(res, "Turf owners fetched", {
    owners,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1,
    },
  });
});

const updateOwnerStatus = asyncHandler(async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: "owner" });

  if (!owner) {
    const error = new Error("Turf owner not found");
    error.statusCode = 404;
    throw error;
  }

  const status = req.body.status;
  owner.accountStatus = status;
  owner.rejectionReason = status === "rejected" ? req.body.reason || "Application did not meet platform requirements." : "";
  owner.approvedAt = status === "active" ? new Date() : undefined;
  owner.approvedBy = status === "active" ? req.user._id : undefined;
  await owner.save();

  const titles = {
    active: "Turf owner account approved",
    rejected: "Turf owner application update",
    suspended: "Turf owner account suspended",
    pending: "Turf owner application under review",
  };
  const messages = {
    active: "Your turf owner account is approved. You can now sign in and manage venues.",
    rejected: owner.rejectionReason,
    suspended: "Your turf owner account has been suspended. Contact platform support for assistance.",
    pending: "Your turf owner application is under review.",
  };

  await Notification.create({
    userId: owner._id,
    title: titles[status],
    message: messages[status],
    metadata: { ownerId: owner._id, status },
    targetUrl: "/owner/dashboard",
    type: "venue",
  });

  return successResponse(res, "Turf owner status updated", { owner });
});

const moderateTurf = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.params.id);

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  const status = req.body.status;
  turf.moderationStatus = status;
  turf.isApproved = status === "approved";
  turf.rejectionReason = status === "rejected" ? req.body.reason || "Venue did not meet platform requirements." : "";
  turf.approvedAt = status === "approved" ? new Date() : undefined;
  turf.approvedBy = status === "approved" ? req.user._id : undefined;
  await turf.save();

  await Notification.create({
    userId: turf.ownerId,
    title: `Venue ${status}`,
    message:
      status === "approved"
        ? `${turf.name} is approved and visible to users.`
        : `${turf.name} is ${status}.${turf.rejectionReason ? ` ${turf.rejectionReason}` : ""}`,
    metadata: { turfId: turf._id, status },
    targetUrl: status === "approved" ? `/owner/turfs/${turf._id}` : "/owner/turfs",
    type: "venue",
  });

  return successResponse(res, "Venue moderation status updated", { turf });
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = await PlatformSetting.find().sort({ category: 1, key: 1 });
  return successResponse(res, "Platform settings fetched", { settings });
});

const getVenueSchedules = asyncHandler(async (req, res) => {
  const schedules = await Turf.find()
    .populate("ownerId", "name email businessName")
    .select("name city ownerId isApproved moderationStatus schedule")
    .sort({ name: 1 })
    .limit(100);

  return successResponse(res, "Venue schedules fetched", { schedules });
});

const getConflictLogs = asyncHandler(async (req, res) => {
  const safeLimit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const filter = {};

  if (req.query.turfId) filter.turfId = req.query.turfId;

  const logs = await BookingConflictLog.find(filter)
    .populate("turfId", "name city")
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  return successResponse(res, "Booking conflict logs fetched", { logs });
});

const updateSetting = asyncHandler(async (req, res) => {
  const setting = await PlatformSetting.findOneAndUpdate(
    { key: req.params.key.toLowerCase() },
    {
      value: req.body.value,
      category: req.body.category || "general",
      description: req.body.description || "",
      isPublic: Boolean(req.body.isPublic),
      updatedBy: req.user._id,
    },
    {
      new: true,
      runValidators: true,
      upsert: true,
    },
  );

  return successResponse(res, "Platform setting saved", { setting });
});

module.exports = {
  getAdminDashboard,
  getConflictLogs,
  getOwners,
  getSettings,
  getVenueSchedules,
  moderateTurf,
  updateSetting,
  updateOwnerStatus,
};
