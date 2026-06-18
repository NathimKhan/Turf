const express = require("express");
const { body } = require("express-validator");
const {
  changePassword,
  forgotPassword,
  getProfile,
  login,
  loginValidation,
  logout,
  register,
  registerValidation,
  resetPassword,
  upgradeMembership,
  updateProfile,
  updateWallet,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");
const { authLimiter } = require("../middleware/securityMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/register", authLimiter, registerValidation, validateRequest, register);
router.post(
  "/register-owner",
  authLimiter,
  (req, res, next) => {
    req.body.role = "owner";
    next();
  },
  registerValidation,
  validateRequest,
  register,
);
router.post("/login", authLimiter, loginValidation, validateRequest, login);
router.post("/logout", logout);
router.get("/profile", protect, getProfile);
router.get("/me", protect, getProfile);
router.put("/profile", protect, upload.single("profileImage"), updateProfile);
router.post(
  "/membership/upgrade",
  protect,
  body("plan").isIn(["Gold", "Elite"]).withMessage("Plan must be Gold or Elite"),
  validateRequest,
  upgradeMembership,
);
router.post(
  "/wallet",
  protect,
  [
    body("action").isIn(["topup", "transfer"]).withMessage("Invalid wallet action"),
    body("amount").isFloat({ min: 1, max: 100000 }).withMessage("Amount must be between 1 and 100000"),
  ],
  validateRequest,
  updateWallet,
);
router.put(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  validateRequest,
  changePassword,
);
router.post(
  "/forgot-password",
  authLimiter,
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  validateRequest,
  forgotPassword,
);
router.post(
  "/reset-password",
  [
    body("resetToken").notEmpty().withMessage("Reset token is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validateRequest,
  resetPassword,
);
router.post(
  "/reset-password/:token",
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  validateRequest,
  resetPassword,
);

module.exports = router;
