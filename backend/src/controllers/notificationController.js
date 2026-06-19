const { body, param } = require("express-validator");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

function isBroadcastRequest(req) {
  return req.body.broadcast === true || String(req.body.broadcast).toLowerCase() === "true";
}

const notificationValidation = [
  body("userId")
    .custom((value, { req }) => isBroadcastRequest(req) || /^[0-9a-fA-F]{24}$/.test(String(value || "")))
    .withMessage("Valid user id is required unless broadcasting"),
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("message").trim().notEmpty().withMessage("Message is required"),
  body("targetUrl").optional().trim().isLength({ max: 300 }).withMessage("Target URL is too long"),
  body("type").optional().isIn(["booking", "payment", "revenue", "membership", "venue", "review", "system"]).withMessage("Invalid notification type"),
];

const createNotification = asyncHandler(async (req, res) => {
  if (isBroadcastRequest(req)) {
    const users = await User.find({
      $or: [{ approvalStatus: "ACTIVE" }, { accountStatus: "active" }],
    }).select("_id");
    const notifications = users.length
      ? await Notification.insertMany(
          users.map((user) => ({
            userId: user._id,
            title: req.body.title,
            message: req.body.message,
            isRead: Boolean(req.body.isRead),
            metadata: req.body.metadata || {},
            targetUrl: req.body.targetUrl || "",
            type: req.body.type || "system",
          })),
        )
      : [];

    return successResponse(
      res,
      "Broadcast notification created",
      { count: notifications.length, notifications },
      201,
    );
  }

  const notification = await Notification.create({
    userId: req.body.userId,
    title: req.body.title,
    message: req.body.message,
    isRead: Boolean(req.body.isRead),
    metadata: req.body.metadata || {},
    targetUrl: req.body.targetUrl || "",
    type: req.body.type || "system",
  });

  return successResponse(res, "Notification created", { notification }, 201);
});

const getNotifications = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === "admin"
      ? req.query.userId
        ? { userId: req.query.userId }
        : {}
      : { userId: req.user._id };
  const notifications = await Notification.find(filter)
    .populate("userId", "name email role")
    .sort({ createdAt: -1 });

  return successResponse(res, "Notifications fetched", { notifications });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(notification.userId) !== String(req.user._id) && req.user.role !== "admin") {
    const error = new Error("You cannot update this notification");
    error.statusCode = 403;
    throw error;
  }

  notification.isRead = true;
  await notification.save();

  return successResponse(res, "Notification marked as read", { notification });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(notification.userId) !== String(req.user._id) && req.user.role !== "admin") {
    const error = new Error("You cannot delete this notification");
    error.statusCode = 403;
    throw error;
  }

  await notification.deleteOne();

  return successResponse(res, "Notification deleted");
});

module.exports = {
  createNotification,
  deleteNotification,
  getNotifications,
  markNotificationRead,
  notificationValidation,
};
