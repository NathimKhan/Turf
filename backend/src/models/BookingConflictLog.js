const mongoose = require("mongoose");

const bookingConflictLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    turfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turf",
      required: true,
      index: true,
    },
    bookingDate: {
      type: Date,
      required: true,
      index: true,
    },
    slotStartTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format for slot start time"],
    },
    slotEndTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format for slot end time"],
    },
    status: {
      type: String,
      enum: ["booked", "blocked", "closed", "invalid_duration", "unavailable"],
      default: "unavailable",
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ["availability", "booking"],
      default: "booking",
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

bookingConflictLogSchema.index({ turfId: 1, bookingDate: 1, createdAt: -1 });

module.exports = mongoose.model("BookingConflictLog", bookingConflictLogSchema);
