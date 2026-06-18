const express = require("express");
const { getOwnerDashboard, getOwnerReviews } = require("../controllers/ownerController");
const { protect } = require("../middleware/authMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");

const router = express.Router();

router.get("/dashboard", protect, ownerOrAdmin, getOwnerDashboard);
router.get("/reviews", protect, ownerOrAdmin, getOwnerReviews);

module.exports = router;
