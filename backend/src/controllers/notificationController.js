const { body, param } = require("express-validator");
const Notification = require("../models/Notification");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const notificationValidation = [
  body("userId").isMongoId().withMessage("Valid user id is required"),
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("message").trim().notEmpty().withMessage("Message is required"),
];

const createNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.create({
    userId: req.body.userId,
    title: req.body.title,
    message: req.body.message,
    isRead: Boolean(req.body.isRead),
  });

  return successResponse(res, "Notification created", { notification }, 201);
});

const getNotifications = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" && req.query.userId ? { userId: req.query.userId } : { userId: req.user._id };
  const notifications = await Notification.find(filter).sort({ createdAt: -1 });

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
