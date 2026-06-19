const AuditLog = require("../models/AuditLog");
const Booking = require("../models/Booking");
const BookingConflictLog = require("../models/BookingConflictLog");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const PlatformSetting = require("../models/PlatformSetting");
const Turf = require("../models/Turf");
const User = require("../models/User");
const {
  OWNER_ACCOUNT_STATUS_BY_APPROVAL,
  normalizeOwnerAccountStatus,
  normalizeOwnerApprovalStatus,
  normalizeVenueStatus,
} = require("../utils/approval");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const PLATFORM_FEE_RATE = 0.1;

function pendingOwnerFilter() {
  return {
    role: "owner",
    $or: [{ approvalStatus: "PENDING" }, { accountStatus: "pending" }],
  };
}

function pendingVenueFilter() {
  return {
    isApproved: false,
    $or: [
      { status: "PENDING" },
      { moderationStatus: "pending" },
      { status: { $exists: false }, moderationStatus: { $exists: false } },
    ],
  };
}

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
    liveVenues,
    rejectedVenues,
    pendingOwnerApplications,
    pendingVenueApplications,
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
    User.find().sort({ createdAt: -1 }).limit(5).select("name email role createdAt approvalStatus accountStatus"),
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
    User.countDocuments(pendingOwnerFilter()),
    Turf.countDocuments(pendingVenueFilter()),
    Turf.countDocuments({
      isApproved: true,
      $or: [{ status: "LIVE" }, { moderationStatus: "approved" }, { status: { $exists: false } }],
    }),
    Turf.countDocuments({
      $or: [{ status: "REJECTED" }, { moderationStatus: "rejected" }],
    }),
    User.find(pendingOwnerFilter())
      .select("name businessName email phone approvalStatus accountStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(10),
    Turf.find(pendingVenueFilter())
      .populate("ownerId", "name email businessName")
      .select("name city location sportsSupported ownerId status moderationStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(10),
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
    liveVenues,
    rejectedVenues,
    pendingOwnerApplications,
    pendingVenueApplications,
    recentActivities,
  });
});

const getOwners = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const filter = { role: "owner" };
  const andFilters = [];

  if (status) {
    const approvalStatus = normalizeOwnerApprovalStatus(status);
    andFilters.push({ $or: [
      { approvalStatus },
      { accountStatus: normalizeOwnerAccountStatus(status) },
    ] });
  }
  if (search) {
    andFilters.push({ $or: [
      { name: { $regex: search, $options: "i" } },
      { businessName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ] });
  }
  if (andFilters.length) filter.$and = andFilters;

  const [owners, total] = await Promise.all([
    User.find(filter)
      .select("name businessName email phone address approvalStatus accountStatus rejectionReason approvedAt createdAt")
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

  const status = normalizeOwnerApprovalStatus(req.body.status);
  owner.approvalStatus = status;
  owner.accountStatus = OWNER_ACCOUNT_STATUS_BY_APPROVAL[status];
  owner.rejectionReason = status === "REJECTED" ? req.body.reason || "Application did not meet platform requirements." : "";
  owner.approvedAt = status === "ACTIVE" ? new Date() : undefined;
  owner.approvedBy = status === "ACTIVE" ? req.user._id : undefined;
  await owner.save();

  const titles = {
    ACTIVE: "Account Approved",
    PENDING: "Turf owner application under review",
    REJECTED: "Account Rejected",
    SUSPENDED: "Turf owner account suspended",
  };
  const messages = {
    ACTIVE: "Your turf owner account is approved. You can now manage venues.",
    PENDING: "Your turf owner application is under review.",
    REJECTED: owner.rejectionReason,
    SUSPENDED: "Your turf owner account has been suspended. Contact platform support for assistance.",
  };

  if (["ACTIVE", "REJECTED", "SUSPENDED"].includes(status)) {
    await AuditLog.create({
      action: status === "ACTIVE" ? "APPROVED" : status,
      actorId: req.user._id,
      entityId: owner._id,
      entityType: "USER",
      reason: owner.rejectionReason || req.body.reason || "",
      status,
    });
  }

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

  const status = normalizeVenueStatus(req.body.status);
  turf.status = status;
  turf.rejectionReason = status === "REJECTED" ? req.body.reason || "Venue did not meet platform requirements." : "";
  turf.approvedAt = status === "LIVE" ? new Date() : undefined;
  turf.approvedBy = status === "LIVE" ? req.user._id : undefined;
  await turf.save();

  if (["LIVE", "REJECTED", "SUSPENDED"].includes(status)) {
    await AuditLog.create({
      action: status === "LIVE" ? "APPROVED" : status,
      actorId: req.user._id,
      entityId: turf._id,
      entityType: "VENUE",
      reason: turf.rejectionReason || req.body.reason || "",
      status,
    });
  }

  const notificationCopy = {
    LIVE: {
      title: "Venue Approved",
      message: `${turf.name} is approved and visible to users.`,
      targetUrl: `/owner/turfs/${turf._id}`,
    },
    PENDING: {
      title: "Venue submitted for review",
      message: `${turf.name} is pending Platform Owner review.`,
      targetUrl: "/owner/turfs",
    },
    REJECTED: {
      title: "Venue Rejected",
      message: `${turf.name} was rejected.${turf.rejectionReason ? ` ${turf.rejectionReason}` : ""}`,
      targetUrl: "/owner/turfs",
    },
    SUSPENDED: {
      title: "Venue Suspended",
      message: `${turf.name} has been suspended. Contact platform support for assistance.`,
      targetUrl: "/owner/turfs",
    },
  };

  await Notification.create({
    userId: turf.ownerId,
    title: notificationCopy[status].title,
    message: notificationCopy[status].message,
    metadata: { turfId: turf._id, status },
    targetUrl: notificationCopy[status].targetUrl,
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
    .select("name city ownerId isApproved moderationStatus status schedule")
    .sort({ name: 1 })
    .limit(100);

  return successResponse(res, "Venue schedules fetched", { schedules });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const safeLimit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const filter = {};

  if (req.query.entityType) filter.entityType = String(req.query.entityType).toUpperCase();
  if (req.query.entityId) filter.entityId = req.query.entityId;

  const logs = await AuditLog.find(filter)
    .populate("actorId", "name email role")
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  return successResponse(res, "Audit logs fetched", { logs });
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
  getAuditLogs,
  getConflictLogs,
  getOwners,
  getSettings,
  getVenueSchedules,
  moderateTurf,
  updateSetting,
  updateOwnerStatus,
};
