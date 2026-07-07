const express = require("express");
const {
  coachRequestValidation,
  coachStatusValidation,
  createCoachRequest,
  getCoaches,
  getMyCoachRequests,
  getOwnerCoachRequests,
  updateCoachRequestStatus,
} = require("../controllers/coachingController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.get("/coaches", getCoaches);
router.get("/mine", protect, authorizeRoles("user", "admin"), getMyCoachRequests);
router.post("/requests", protect, authorizeRoles("user", "admin"), coachRequestValidation, validateRequest, createCoachRequest);
router.get("/owner/requests", protect, ownerOrAdmin, getOwnerCoachRequests);
router.patch("/requests/:id/status", protect, ownerOrAdmin, coachStatusValidation, validateRequest, updateCoachRequestStatus);

module.exports = router;
