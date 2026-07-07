const mongoose = require("mongoose");
const { allowedSports } = require("./Turf");

const tournamentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    sport: {
      type: String,
      enum: allowedSports,
      required: true,
      index: true,
    },
    prizePool: {
      type: Number,
      required: true,
      min: 0,
    },
    entryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxTeams: {
      type: Number,
      default: 8,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    turfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turf",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Tournament", tournamentSchema);
