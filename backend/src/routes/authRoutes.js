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
  updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/register", registerValidation, validateRequest, register);
router.post("/login", loginValidation, validateRequest, login);
router.post("/logout", logout);
router.get("/profile", protect, getProfile);
router.get("/me", protect, getProfile);
router.put("/profile", protect, upload.single("profileImage"), updateProfile);
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
router.post("/forgot-password", body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(), validateRequest, forgotPassword);
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
