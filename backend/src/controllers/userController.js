const { body, param } = require("express-validator");
const User = require("../models/User");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const updateUserValidation = [
  param("id").isMongoId().withMessage("Valid user id is required"),
  body("email").optional().isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("role").optional().isIn(["user", "owner", "admin"]).withMessage("Invalid role"),
  body("accountStatus")
    .optional()
    .isIn(["active", "pending", "rejected", "suspended"])
    .withMessage("Invalid account status"),
  body("walletBalance").optional().isFloat({ min: 0 }).withMessage("Wallet balance must be positive"),
];

const getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const filter = {};

  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (safePage - 1) * safeLimit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    User.countDocuments(filter),
  ]);

  return successResponse(res, "Users fetched", {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1,
    },
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(res, "User fetched", { user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(user._id) === String(req.user._id) && req.body.role && req.body.role !== "admin") {
    const error = new Error("You cannot remove your own Platform Owner role");
    error.statusCode = 409;
    throw error;
  }

  const allowedFields = [
    "name",
    "email",
    "phone",
    "role",
    "profileImage",
    "walletBalance",
    "membershipPlan",
    "accountStatus",
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  if (req.file) {
    user.profileImage = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  }

  await user.save();

  return successResponse(res, "User updated", { user });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(user._id) === String(req.user._id)) {
    const error = new Error("You cannot delete your own Platform Owner account");
    error.statusCode = 409;
    throw error;
  }

  await user.deleteOne();

  return successResponse(res, "User deleted");
});

module.exports = {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
  updateUserValidation,
};
