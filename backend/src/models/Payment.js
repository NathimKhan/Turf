const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turf",
      index: true,
    },
    amount: {
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
    platformFeeRate: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Card", "Cash", "Mock Payment"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    provider: {
      type: String,
      default: "mock",
      trim: true,
    },
    providerReference: {
      type: String,
      trim: true,
      default: "",
    },
    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
    paidAt: Date,
    refundedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

paymentSchema.virtual("paymentId").get(function getPaymentId() {
  return this.transactionId;
});

paymentSchema.virtual("status").get(function getStatus() {
  return this.paymentStatus;
});

paymentSchema.methods.toJSON = function toJSON() {
  const payment = this.toObject({ virtuals: true });
  delete payment.__v;
  return payment;
};

module.exports = mongoose.model("Payment", paymentSchema);
