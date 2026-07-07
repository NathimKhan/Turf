const mongoose = require("mongoose");

const coachBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    turfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turf",
      required: true,
      index: true,
    },
    coachId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    coachName: {
      type: String,
      required: true,
      trim: true,
    },
    sport: {
      type: String,
      required: true,
      trim: true,
    },
    planName: {
      type: String,
      default: "Monthly Coaching",
      trim: true,
    },
    timing: {
      type: String,
      required: true,
      trim: true,
    },
    sessionsPerMonth: {
      type: Number,
      default: 12,
      min: 1,
    },
    monthlyFee: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    ownerRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Card", "Cash", "Mock Payment"],
      default: "Mock Payment",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    preferredStartDate: Date,
    paidAt: Date,
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
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

coachBookingSchema.index({ userId: 1, approvalStatus: 1, createdAt: -1 });
coachBookingSchema.index({ ownerId: 1, approvalStatus: 1, createdAt: -1 });

coachBookingSchema.virtual("status").get(function getStatus() {
  return this.approvalStatus;
});

coachBookingSchema.methods.toJSON = function toJSON() {
  const request = this.toObject({ virtuals: true });
  delete request.__v;
  return request;
};

module.exports = mongoose.model("CoachBooking", coachBookingSchema);
