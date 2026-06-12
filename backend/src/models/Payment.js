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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Card", "Cash"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "paid",
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

module.exports = mongoose.model("Payment", paymentSchema);
