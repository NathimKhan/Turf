const {
  normalizeVenueApprovalStatus,
  normalizeVenueStatus,
  venueModerationStatus,
} = require("../utils/approval");

const BLOCKED_PUBLIC_STATUSES = ["PENDING", "REJECTED", "SUSPENDED", "ARCHIVED", "EXPIRED", "NEED_CHANGES"];

function normalizeMarketplaceAction(value = "") {
  const status = normalizeVenueStatus(value, "");
  const approvalStatus = normalizeVenueApprovalStatus(value, "");

  if (approvalStatus === "APPROVED" || status === "ACTIVE" || status === "LIVE") return "APPROVED";
  if (approvalStatus === "NEED_CHANGES" || status === "NEED_CHANGES") return "NEED_CHANGES";
  if (approvalStatus === "REJECTED" || status === "REJECTED") return "REJECTED";
  if (approvalStatus === "SUSPENDED" || status === "SUSPENDED") return "SUSPENDED";
  if (approvalStatus === "ARCHIVED" || status === "ARCHIVED") return "ARCHIVED";
  if (approvalStatus === "EXPIRED" || status === "EXPIRED") return "EXPIRED";
  return "PENDING";
}

function stateForAction(action) {
  const normalized = normalizeMarketplaceAction(action);

  if (normalized === "APPROVED") {
    return {
      approvalStatus: "APPROVED",
      isApproved: true,
      isPublished: true,
      isVerified: true,
      moderationStatus: "approved",
      status: "ACTIVE",
      visibility: "PUBLIC",
    };
  }

  const statusByAction = {
    ARCHIVED: "ARCHIVED",
    EXPIRED: "EXPIRED",
    NEED_CHANGES: "NEED_CHANGES",
    PENDING: "PENDING",
    REJECTED: "REJECTED",
    SUSPENDED: "SUSPENDED",
  };

  const status = statusByAction[normalized] || "PENDING";

  return {
    approvalStatus: normalized,
    isApproved: false,
    isPublished: false,
    isVerified: false,
    moderationStatus: venueModerationStatus(status),
    status,
    visibility: "PRIVATE",
  };
}

function approvalHistoryEntry({ action, actorId, fromStatus, reason = "", toStatus }) {
  return {
    action,
    actorId,
    at: new Date(),
    fromStatus: fromStatus || "",
    reason,
    toStatus,
  };
}

function pushHistory(turf, entry) {
  const current = Array.isArray(turf.approvalHistory) ? turf.approvalHistory : [];
  turf.approvalHistory = [...current, entry];
}

function applyVenueState(turf, action, { actorId, reason = "", recordHistory = true } = {}) {
  const fromStatus = turf.approvalStatus || "";
  const next = stateForAction(action);

  Object.assign(turf, next);

  if (next.approvalStatus === "APPROVED") {
    turf.approvedAt = new Date();
    turf.approvedBy = actorId || turf.approvedBy;
    turf.reviewedAt = turf.approvedAt;
    turf.reviewedBy = actorId || turf.reviewedBy;
    turf.rejectionReason = "";
  } else if (next.approvalStatus === "PENDING") {
    turf.reviewedAt = null;
    turf.reviewedBy = null;
    turf.rejectionReason = "";
    turf.approvedAt = undefined;
    turf.approvedBy = undefined;
  } else {
    turf.reviewedAt = new Date();
    turf.reviewedBy = actorId || turf.reviewedBy;
    turf.rejectionReason = reason || defaultReasonFor(next.approvalStatus);
    turf.approvedAt = undefined;
    turf.approvedBy = undefined;
  }

  if (recordHistory) {
    pushHistory(turf, approvalHistoryEntry({
      action: next.approvalStatus === "APPROVED" ? "APPROVED" : next.approvalStatus,
      actorId,
      fromStatus,
      reason: turf.rejectionReason || reason,
      toStatus: next.approvalStatus,
    }));
  }

  return turf;
}

function defaultReasonFor(status) {
  const reasons = {
    ARCHIVED: "Venue archived by platform owner.",
    EXPIRED: "Venue approval expired.",
    NEED_CHANGES: "Platform owner requested venue changes.",
    REJECTED: "Venue did not meet platform requirements.",
    SUSPENDED: "Venue has been suspended by platform owner.",
  };

  return reasons[status] || "";
}

function initializeVenueSubmission(turf, ownerId) {
  turf.submittedAt = turf.submittedAt || new Date();
  turf.submittedBy = turf.submittedBy || ownerId;
  turf.reviewedBy = null;
  turf.reviewedAt = null;
  turf.rejectionReason = "";
  if (!Array.isArray(turf.approvalHistory)) turf.approvalHistory = [];
  applyVenueState(turf, "PENDING", { actorId: ownerId, recordHistory: false });
  return turf;
}

function resubmitVenue(turf, ownerId) {
  turf.submittedAt = new Date();
  turf.submittedBy = ownerId;
  applyVenueState(turf, "PENDING", {
    actorId: ownerId,
    reason: "Venue resubmitted for platform approval.",
  });
  return turf;
}

function migrateVenueApprovalFields(turf) {
  const approvalIsDefault =
    typeof turf.$isDefault === "function" ? turf.$isDefault("approvalStatus") : false;
  const hasApprovalStatus = Boolean(turf.approvalStatus) && !approvalIsDefault;
  const legacyApproved =
    turf.isApproved === true ||
    normalizeVenueStatus(turf.status, "") === "ACTIVE" ||
    normalizeVenueStatus(turf.status, "") === "LIVE" ||
    normalizeVenueStatus(turf.moderationStatus, "") === "ACTIVE" ||
    normalizeVenueStatus(turf.moderationStatus, "") === "LIVE";

  if (!hasApprovalStatus && legacyApproved) {
    Object.assign(turf, stateForAction("APPROVED"));
    turf.approvedAt = turf.approvedAt || turf.updatedAt || turf.createdAt || new Date();
    return turf;
  }

  if (!hasApprovalStatus) {
    initializeVenueSubmission(turf, turf.submittedBy || turf.ownerId);
    return turf;
  }

  const next = stateForAction(turf.approvalStatus);
  Object.assign(turf, next);
  return turf;
}

function publicVenueFilter() {
  return {
    $and: [
      {
        $or: [
          { approvalStatus: "APPROVED", visibility: "PUBLIC", isPublished: true },
          { approvalStatus: "APPROVED", isApproved: true },
          { approvalStatus: { $exists: false }, isApproved: true, moderationStatus: "approved" },
          { approvalStatus: { $exists: false }, isApproved: true, status: { $in: ["ACTIVE", "LIVE"] } },
          { approvalStatus: { $exists: false }, isApproved: true, status: { $exists: false } },
        ],
      },
      { approvalStatus: { $nin: BLOCKED_PUBLIC_STATUSES } },
      { status: { $nin: ["REJECTED", "SUSPENDED", "ARCHIVED", "EXPIRED", "NEED_CHANGES"] } },
      { visibility: { $ne: "PRIVATE" } },
      { isPublished: { $ne: false } },
    ],
  };
}

module.exports = {
  applyVenueState,
  initializeVenueSubmission,
  migrateVenueApprovalFields,
  normalizeMarketplaceAction,
  publicVenueFilter,
  resubmitVenue,
  stateForAction,
};
