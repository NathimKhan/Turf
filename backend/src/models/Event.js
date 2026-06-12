const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
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
    eventDate: {
      type: Date,
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    entryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: 1,
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Event", eventSchema);
