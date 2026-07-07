const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "APPROVED",
        "ARCHIVED",
        "EXPIRED",
        "NEED_CHANGES",
        "PENDING",
        "REJECTED",
        "RESUBMITTED",
        "SUSPENDED",
        "UPDATED",
        "SUBMITTED",
      ],
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["USER", "VENUE"],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
