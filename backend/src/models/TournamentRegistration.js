const mongoose = require("mongoose");

const tournamentRegistrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
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
      required: true,
      index: true,
    },
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
    captainName: {
      type: String,
      trim: true,
      default: "",
    },
    participantCount: {
      type: Number,
      default: 1,
      min: 1,
      max: 30,
    },
    entryFee: {
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
      default: "pending",
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
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tournamentRegistrationSchema.index({ tournamentId: 1, userId: 1, approvalStatus: 1 });

tournamentRegistrationSchema.virtual("registrationStatus").get(function getRegistrationStatus() {
  if (this.approvalStatus === "approved") return "successful";
  if (this.approvalStatus === "rejected") return "rejected";
  return "pending";
});

tournamentRegistrationSchema.methods.toJSON = function toJSON() {
  const registration = this.toObject({ virtuals: true });
  delete registration.__v;
  return registration;
};

module.exports = mongoose.model("TournamentRegistration", tournamentRegistrationSchema);
