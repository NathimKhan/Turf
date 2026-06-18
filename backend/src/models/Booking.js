const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
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
    bookingDate: {
      type: Date,
      required: [true, "Booking date is required"],
      index: true,
    },
    slotStartTime: {
      type: String,
      required: [true, "Slot start time is required"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format for slot start time"],
    },
    slotEndTime: {
      type: String,
      required: [true, "Slot end time is required"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format for slot end time"],
    },
    hoursBooked: {
      type: Number,
      required: true,
      min: [0.5, "Booking must be at least 30 minutes"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "cancelled", "completed", "upcoming"],
      default: "pending",
      index: true,
    },
    slotKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    occupancyKeys: {
      type: [String],
      default: [],
      select: false,
    },
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

bookingSchema.index({ turfId: 1, bookingDate: 1, slotStartTime: 1, slotEndTime: 1, bookingStatus: 1 });
bookingSchema.index(
  { occupancyKeys: 1 },
  {
    unique: true,
    partialFilterExpression: {
      occupancyKeys: { $type: "string" },
    },
  },
);

bookingSchema.virtual("athleteId").get(function getAthleteId() {
  return this.userId;
});

bookingSchema.virtual("date").get(function getDate() {
  return this.bookingDate;
});

bookingSchema.virtual("slot").get(function getSlot() {
  return `${this.slotStartTime}-${this.slotEndTime}`;
});

bookingSchema.virtual("status").get(function getStatus() {
  const map = {
    cancelled: "cancelled",
    completed: "completed",
    confirmed: "confirmed",
    checked_in: "checked_in",
    pending: "pending",
    upcoming: this.paymentStatus === "paid" ? "confirmed" : "pending",
  };
  return map[this.bookingStatus] || this.bookingStatus;
});

bookingSchema.virtual("total").get(function getTotal() {
  return {
    amount: this.totalAmount,
    currency: "INR",
  };
});

bookingSchema.methods.toJSON = function toJSON() {
  const booking = this.toObject({ virtuals: true });
  delete booking.__v;
  return booking;
};

module.exports = mongoose.model("Booking", bookingSchema);
