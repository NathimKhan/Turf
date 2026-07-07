const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const {
  OWNER_ACCOUNT_STATUS_BY_APPROVAL,
  OWNER_APPROVAL_BY_ACCOUNT_STATUS,
  OWNER_APPROVAL_STATUSES,
  normalizeOwnerApprovalStatus,
} = require("../utils/approval");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    businessName: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "owner", "admin"],
      default: "user",
    },
    approvalStatus: {
      type: String,
      enum: OWNER_APPROVAL_STATUSES,
      default: "PENDING",
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ["active", "pending", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    profileImage: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [300, "Bio cannot exceed 300 characters"],
      default: "",
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Turf",
      },
    ],
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.pre("validate", function syncApprovalStatus(next) {
  if (this.role === "admin" || this.role === "user") {
    this.approvalStatus = "ACTIVE";
    this.accountStatus = "active";
    return next();
  }

  const accountWasSet =
    typeof this.$isDefault === "function"
      ? !this.$isDefault("accountStatus")
      : Boolean(this.accountStatus);
  const approvalWasSet =
    typeof this.$isDefault === "function"
      ? !this.$isDefault("approvalStatus")
      : Boolean(this.approvalStatus);

  if (this.isModified("approvalStatus") && !this.isModified("accountStatus")) {
    this.approvalStatus = normalizeOwnerApprovalStatus(this.approvalStatus);
    this.accountStatus = OWNER_ACCOUNT_STATUS_BY_APPROVAL[this.approvalStatus];
    return next();
  }

  if (this.isModified("accountStatus") && !this.isModified("approvalStatus")) {
    this.accountStatus = String(this.accountStatus || "pending").toLowerCase();
    this.approvalStatus = OWNER_APPROVAL_BY_ACCOUNT_STATUS[this.accountStatus] || "PENDING";
    return next();
  }

  if (accountWasSet && !approvalWasSet) {
    this.accountStatus = String(this.accountStatus || "pending").toLowerCase();
    this.approvalStatus = OWNER_APPROVAL_BY_ACCOUNT_STATUS[this.accountStatus] || "PENDING";
    return next();
  }

  this.approvalStatus = normalizeOwnerApprovalStatus(this.approvalStatus);
  this.accountStatus = OWNER_ACCOUNT_STATUS_BY_APPROVAL[this.approvalStatus];
  return next();
});

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject({ virtuals: true });
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.__v;
  return user;
};

module.exports = mongoose.model("User", userSchema);
