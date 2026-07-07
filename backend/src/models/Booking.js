const mongoose = require("mongoose");
const { getBookingLifecycleStatus } = require("../utils/bookingLifecycle");

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
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sport: {
      type: String,
      trim: true,
      default: "",
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
      min: [1, "Booking must be at least 1 hour"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
      index: true,
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "cancelled", "completed", "upcoming", "ongoing"],
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
    completedAt: Date,
    invoiceStatus: {
      type: String,
      enum: ["pending", "ready", "void", "not_required"],
      default: "pending",
      index: true,
    },
    invoiceId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    invoiceGeneratedAt: Date,
    qrStatus: {
      type: String,
      enum: ["inactive", "active", "expired", "cancelled"],
      default: "inactive",
      index: true,
    },
    qrExpiresAt: Date,
    lifecycleSyncedAt: Date,
    history: {
      type: [
        {
          status: { type: String, trim: true, required: true },
          at: { type: Date, default: Date.now },
          note: { type: String, trim: true, default: "" },
          source: { type: String, trim: true, default: "system" },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

bookingSchema.index({ turfId: 1, bookingDate: 1, slotStartTime: 1, slotEndTime: 1, bookingStatus: 1 });
bookingSchema.index({ ownerId: 1, sport: 1, bookingDate: 1 });
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

bookingSchema.virtual("venueId").get(function getVenueId() {
  return this.turfId;
});

bookingSchema.virtual("date").get(function getDate() {
  return this.bookingDate;
});

bookingSchema.virtual("startTime").get(function getStartTime() {
  return this.slotStartTime;
});

bookingSchema.virtual("endTime").get(function getEndTime() {
  return this.slotEndTime;
});

bookingSchema.virtual("duration").get(function getDuration() {
  return this.hoursBooked;
});

bookingSchema.virtual("amount").get(function getAmount() {
  return this.totalAmount;
});

bookingSchema.virtual("slot").get(function getSlot() {
  return `${this.slotStartTime}-${this.slotEndTime}`;
});

bookingSchema.virtual("status").get(function getStatus() {
  return getBookingLifecycleStatus(this);
});

bookingSchema.virtual("lifecycleStatus").get(function getLifecycleStatus() {
  return getBookingLifecycleStatus(this);
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
