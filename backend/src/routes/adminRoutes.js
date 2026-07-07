const express = require("express");
const { body, param } = require("express-validator");
const {
  getConflictLogs,
  getAdminDashboard,
  getAuditLogs,
  getOwners,
  getVenueSchedules,
  moderateTurf,
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
    .isIn([
      "DRAFT",
      "PENDING",
      "ACTIVE",
      "LIVE",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
      "ARCHIVED",
      "EXPIRED",
      "NEED_CHANGES",
      "pending",
      "approved",
      "active",
      "rejected",
      "suspended",
      "archived",
      "expired",
      "published",
      "live",
      "need_changes",
      "needs_changes",
      "changes_requested",
    ])
    .withMessage("Invalid venue status"),
  body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason is too long"),
  validateRequest,
  moderateTurf,
);

module.exports = router;
