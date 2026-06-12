const express = require("express");
const { getAdminDashboard } = require("../controllers/adminController");
const adminOnly = require("../middleware/adminMiddleware");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", protect, adminOnly, getAdminDashboard);

module.exports = router;
