const express = require("express");
const { param } = require("express-validator");
const {
  createNotification,
  deleteNotification,
  getNotifications,
  markNotificationRead,
  notificationValidation,
} = require("../controllers/notificationController");
const adminOnly = require("../middleware/adminMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.post("/", adminOnly, notificationValidation, validateRequest, createNotification);
router.put("/:id/read", param("id").isMongoId().withMessage("Valid notification id is required"), validateRequest, markNotificationRead);
router.delete("/:id", param("id").isMongoId().withMessage("Valid notification id is required"), validateRequest, deleteNotification);

module.exports = router;
