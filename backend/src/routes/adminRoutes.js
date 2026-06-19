const express = require("express");
const { body, param } = require("express-validator");
const {
  getConflictLogs,
  getAdminDashboard,
  getAuditLogs,
  getOwners,
  getSettings,
  getVenueSchedules,
  moderateTurf,
  updateSetting,
  updateOwnerStatus,
} = require("../controllers/adminController");
const adminOnly = require("../middleware/adminMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/dashboard", getAdminDashboard);
router.get("/owners", getOwners);
router.get("/audit-logs", getAuditLogs);
router.get("/venue-schedules", getVenueSchedules);
router.get("/conflict-logs", getConflictLogs);
router.get("/settings", getSettings);
router.put(
  "/settings/:key",
  param("key").trim().isLength({ min: 2, max: 80 }).withMessage("Valid setting key is required"),
  body("value").exists().withMessage("Setting value is required"),
  body("category").optional().trim().isLength({ max: 80 }).withMessage("Category is too long"),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("Description is too long"),
  validateRequest,
  updateSetting,
);
router.patch(
  "/owners/:id/status",
  param("id").isMongoId().withMessage("Valid owner id is required"),
  body("status")
    .isIn(["ACTIVE", "PENDING", "REJECTED", "SUSPENDED", "active", "pending", "rejected", "suspended", "approved"])
    .withMessage("Invalid owner status"),
  body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason is too long"),
  validateRequest,
  updateOwnerStatus,
);
router.patch(
  "/turfs/:id/status",
  param("id").isMongoId().withMessage("Valid turf id is required"),
  body("status")
    .isIn(["DRAFT", "PENDING", "LIVE", "REJECTED", "SUSPENDED", "pending", "approved", "rejected", "suspended", "published", "live"])
    .withMessage("Invalid venue status"),
  body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason is too long"),
  validateRequest,
  moderateTurf,
);

module.exports = router;
