const crypto = require("crypto");
const { body } = require("express-validator");
const User = require("../models/User");
const Notification = require("../models/Notification");
const generateToken = require("../utils/generateToken");
const {
  OWNER_ACCOUNT_STATUS_BY_APPROVAL,
  approvalStatusForUser,
  canAuthenticateUser,
} = require("../utils/approval");
const { asyncHandler, successResponse } = require("../utils/responseHandler");
const { isEmailSimulationEnabled, sendPasswordResetEmail } = require("../services/emailService");

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
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/\d/)
    .withMessage("Password must contain a number"),
  body("confirmPassword")
    .optional()
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
  body("role").optional().isIn(["user", "owner"]).withMessage("Role must be user or owner"),
  body("phone")
    .if(body("role").equals("owner"))
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Phone is required for turf owners"),
  body("businessName")
    .if(body("role").equals("owner"))
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Business name is required for turf owners"),
  body("address")
    .if(body("role").equals("owner"))
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("Address is required for turf owners"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const register = asyncHandler(async (req, res) => {
  const {
    address = "",
    businessName = "",
    name,
    email,
    password,
    phone = "",
    role = "user",
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const approvalStatus = role === "owner" ? "PENDING" : "ACTIVE";
  const user = await User.create({
    name,
    email,
    password,
    phone,
    address,
    businessName,
    role,
    approvalStatus,
    accountStatus: OWNER_ACCOUNT_STATUS_BY_APPROVAL[approvalStatus],
  });

  if (role === "owner") {
    const admins = await User.find({ role: "admin" }).select("_id");
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          userId: admin._id,
          title: "New Turf Owner registered",
          message: `${businessName || name} submitted a turf owner application.`,
          metadata: { ownerId: user._id },
          targetUrl: "/admin/owners",
          type: "venue",
        })),
      );
    }

    return sendTokenResponse(
      res,
      user,
      "Owner application submitted. Your account is pending approval from Platform Owner.",
      201,
    );
  }

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

  if (user.role === "admin" || user.role === "user") {
    return sendTokenResponse(res, user, "Login successful");
  }

  const approvalStatus = approvalStatusForUser(user);
  if (!canAuthenticateUser(user)) {
    const messages = {
      PENDING: "Your turf owner application is awaiting approval",
      REJECTED: user.rejectionReason || "Your turf owner application was rejected",
      SUSPENDED: "Your account has been suspended. Contact platform support.",
    };
    const error = new Error(messages[approvalStatus] || "Your account is not active");
    error.statusCode = 403;
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
  const allowedFields = ["name", "phone", "profileImage", "bio", "businessName", "address"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });

  if (req.file) {
    req.user.profileImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  }

  await req.user.save();

  if (req.user.role === "owner") {
    const admins = await User.find({ role: "admin" }).select("_id");
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          userId: admin._id,
          title: "Owner profile updated",
          message: `${req.user.businessName || req.user.name} updated their owner profile.`,
          metadata: { ownerId: req.user._id },
          targetUrl: "/admin/owners",
          type: "venue",
        })),
      );
    }
  }

  return successResponse(res, "Profile updated", { user: req.user });
});

const updateWallet = asyncHandler(async (req, res) => {
  if (req.user.role !== "user") {
    const error = new Error("Wallet actions are available to user accounts");
    error.statusCode = 403;
    throw error;
  }

  const amount = Number(req.body.amount);
  const action = req.body.action;
  if (action === "transfer" && req.user.walletBalance < amount) {
    const error = new Error("Wallet balance is too low for this transfer");
    error.statusCode = 409;
    throw error;
  }

  req.user.walletBalance = Number((
    req.user.walletBalance + (action === "topup" ? amount : -amount)
  ).toFixed(2));
  await req.user.save();

  await Notification.create({
    userId: req.user._id,
    title: action === "topup" ? "Wallet topped up" : "Wallet transfer completed",
    message: `${amount} was ${action === "topup" ? "added to" : "transferred from"} your TURFX wallet.`,
    metadata: { action, amount },
    targetUrl: "/payments",
    type: "payment",
  });

  return successResponse(res, "Wallet updated", {
    action,
    amount,
    balance: req.user.walletBalance,
    user: req.user,
  });
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
  const simulated = isEmailSimulationEnabled();

  if (!user) {
    return successResponse(res, "If an account exists, a reset link has been sent", { simulated });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  await sendPasswordResetEmail(user, resetToken, req);

  const data = {
    ...(process.env.NODE_ENV === "production" ? {} : { resetToken }),
    simulated,
  };
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
  updateWallet,
};
