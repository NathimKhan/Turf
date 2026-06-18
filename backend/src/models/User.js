const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");

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
    accountStatus: {
      type: String,
      enum: ["active", "pending", "rejected", "suspended"],
      default: "active",
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
    membershipPlan: {
      type: String,
      enum: ["Starter", "Gold", "Elite", "Venue Pro", "Admin"],
      default: "Starter",
    },
    membershipUpdatedAt: Date,
    membershipHistory: [
      {
        plan: {
          type: String,
          enum: ["Starter", "Gold", "Elite"],
          required: true,
        },
        amount: {
          type: Number,
          min: 0,
          default: 0,
        },
        reference: {
          type: String,
          trim: true,
          default: "",
        },
        upgradedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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

userSchema.virtual("membership").get(function getMembership() {
  return this.membershipPlan;
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
