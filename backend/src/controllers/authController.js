const crypto = require("crypto");
const { body } = require("express-validator");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const { sendPasswordResetEmail } = require("../services/emailService");

function cookieOptions() {
  const days = Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7);

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  };
}

function sendTokenResponse(res, user, message, statusCode = 200) {
  const token = generateToken(user._id);
  res.cookie("token", token, cookieOptions());
  return successResponse(res, message, { user, token }, statusCode);
}

const registerValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").optional().isIn(["user", "owner"]).withMessage("Role must be user or owner"),
  body("phone").optional().trim(),
];

const loginValidation = [
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role = "user" } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role,
    membershipPlan: role === "owner" ? "Venue Pro" : "Starter",
  });

  return sendTokenResponse(res, user, "Registration successful", 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return sendTokenResponse(res, user, "Login successful");
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return successResponse(res, "Logout successful");
});

const getProfile = asyncHandler(async (req, res) => {
  return successResponse(res, "Profile fetched", { user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ["name", "phone", "profileImage", "membershipPlan"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });

  if (req.file) {
    req.user.profileImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  }

  await req.user.save();

  return successResponse(res, "Profile updated", { user: req.user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!currentPassword || !newPassword) {
    const error = new Error("Current password and new password are required");
    error.statusCode = 400;
    throw error;
  }

  if (!(await user.matchPassword(currentPassword))) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  return sendTokenResponse(res, user, "Password changed successfully");
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return successResponse(res, "If an account exists, a reset link has been sent");
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  await sendPasswordResetEmail(user, resetToken, req);

  const data = process.env.NODE_ENV === "production" ? {} : { resetToken };
  return successResponse(res, "Password reset email sent", data);
});

const resetPassword = asyncHandler(async (req, res) => {
  const resetToken = req.body.resetToken || req.params.token;
  const { password } = req.body;

  if (!resetToken || !password) {
    const error = new Error("Reset token and password are required");
    error.statusCode = 400;
    throw error;
  }

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    const error = new Error("Reset token is invalid or expired");
    error.statusCode = 400;
    throw error;
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return sendTokenResponse(res, user, "Password reset successful");
});

module.exports = {
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
};
