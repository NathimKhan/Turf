const express = require("express");
const { getOwnerDashboard } = require("../controllers/ownerController");
const { protect } = require("../middleware/authMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");

const router = express.Router();

router.get("/dashboard", protect, ownerOrAdmin, getOwnerDashboard);

module.exports = router;
