const OWNER_APPROVAL_STATUSES = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"];
const VENUE_STATUSES = ["DRAFT", "PENDING", "ACTIVE", "LIVE", "REJECTED", "SUSPENDED", "ARCHIVED", "EXPIRED", "NEED_CHANGES"];
const VENUE_APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "ARCHIVED", "EXPIRED", "NEED_CHANGES"];

const OWNER_ACCOUNT_STATUS_BY_APPROVAL = {
  ACTIVE: "active",
  PENDING: "pending",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
};

const OWNER_APPROVAL_BY_ACCOUNT_STATUS = {
  active: "ACTIVE",
  pending: "PENDING",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
};

const VENUE_MODERATION_BY_STATUS = {
  ACTIVE: "approved",
  DRAFT: "pending",
  LIVE: "approved",
  PENDING: "pending",
  NEED_CHANGES: "pending",
  REJECTED: "rejected",
  ARCHIVED: "suspended",
  EXPIRED: "suspended",
  SUSPENDED: "suspended",
};

const VENUE_STATUS_BY_MODERATION = {
  approved: "LIVE",
  pending: "PENDING",
  rejected: "REJECTED",
  suspended: "SUSPENDED",
};

function normalizeOwnerApprovalStatus(value, fallback = "PENDING") {
  const normalized = String(value || "").trim();
  const upper = normalized.toUpperCase();
  const lower = normalized.toLowerCase();

  if (OWNER_APPROVAL_STATUSES.includes(upper)) return upper;
  if (OWNER_APPROVAL_BY_ACCOUNT_STATUS[lower]) return OWNER_APPROVAL_BY_ACCOUNT_STATUS[lower];
  if (lower === "approved") return "ACTIVE";

  return fallback;
}

function normalizeOwnerAccountStatus(value, fallback = "pending") {
  const approvalStatus = normalizeOwnerApprovalStatus(value, OWNER_APPROVAL_BY_ACCOUNT_STATUS[fallback] || "PENDING");
  return OWNER_ACCOUNT_STATUS_BY_APPROVAL[approvalStatus] || fallback;
}

function normalizeVenueStatus(value, fallback = "PENDING") {
  const normalized = String(value || "").trim();
  const upper = normalized.toUpperCase();
  const lower = normalized.toLowerCase();

  if (VENUE_STATUSES.includes(upper)) return upper;
  if (VENUE_STATUS_BY_MODERATION[lower]) return VENUE_STATUS_BY_MODERATION[lower] === "LIVE" ? "ACTIVE" : VENUE_STATUS_BY_MODERATION[lower];
  if (lower === "published" || lower === "available" || lower === "approved" || lower === "active") return "ACTIVE";
  if (lower === "review") return "PENDING";
  if (lower === "changes" || lower === "need_changes" || lower === "needs_changes" || lower === "changes_requested") return "NEED_CHANGES";

  return fallback;
}

function normalizeVenueApprovalStatus(value, fallback = "PENDING") {
  const normalized = String(value || "").trim();
  const upper = normalized.toUpperCase();
  const lower = normalized.toLowerCase();

  if (VENUE_APPROVAL_STATUSES.includes(upper)) return upper;
  if (lower === "active" || lower === "approved" || lower === "live" || lower === "published") return "APPROVED";
  if (lower === "review" || lower === "pending") return "PENDING";
  if (lower === "changes" || lower === "need_changes" || lower === "needs_changes" || lower === "changes_requested") return "NEED_CHANGES";
  if (lower === "rejected") return "REJECTED";
  if (lower === "suspended") return "SUSPENDED";
  if (lower === "archived") return "ARCHIVED";
  if (lower === "expired") return "EXPIRED";

  return fallback;
}

function venueModerationStatus(value) {
  return VENUE_MODERATION_BY_STATUS[normalizeVenueStatus(value)] || "pending";
}

function isOwnerActive(user = {}) {
  if (user.role === "admin" || user.role === "user") return true;
  return normalizeOwnerApprovalStatus(user.approvalStatus || user.accountStatus, "ACTIVE") === "ACTIVE";
}

function approvalStatusForUser(user = {}) {
  if (user.role === "admin" || user.role === "user") return "ACTIVE";
  return normalizeOwnerApprovalStatus(user.approvalStatus || user.accountStatus, "PENDING");
}

function canAuthenticateUser(user = {}) {
  if (user.role === "admin" || user.role === "user") return true;

  const approvalStatus = approvalStatusForUser(user);
  return approvalStatus === "ACTIVE" || approvalStatus === "PENDING";
}

function isVenueLive(turf = {}) {
  const status = turf.status ? normalizeVenueStatus(turf.status) : "";
  const moderationStatus = turf.moderationStatus ? normalizeVenueStatus(turf.moderationStatus) : "";
  const approvalStatus = turf.approvalStatus ? normalizeVenueApprovalStatus(turf.approvalStatus) : "";
  const explicitlyBlocked = [status, moderationStatus, approvalStatus].some((value) =>
    ["REJECTED", "SUSPENDED", "ARCHIVED", "EXPIRED", "NEED_CHANGES"].includes(value),
  );

  if (explicitlyBlocked) return false;

  if (approvalStatus === "APPROVED") return turf.visibility === "PUBLIC" || turf.visibility === undefined || turf.isPublished;
  if (approvalStatus === "PENDING") return false;

  return status === "ACTIVE" || status === "LIVE" || moderationStatus === "ACTIVE" || moderationStatus === "LIVE" || Boolean(turf.isApproved);
}

function venueStatusLabel(value) {
  const labels = {
    DRAFT: "Draft",
    ACTIVE: "Active",
    LIVE: "Live",
    PENDING: "Pending Approval",
    NEED_CHANGES: "Needs Changes",
    REJECTED: "Rejected",
    ARCHIVED: "Archived",
    EXPIRED: "Expired",
    SUSPENDED: "Suspended",
  };
  return labels[normalizeVenueStatus(value)] || "Pending Approval";
}

module.exports = {
  OWNER_ACCOUNT_STATUS_BY_APPROVAL,
  OWNER_APPROVAL_BY_ACCOUNT_STATUS,
  OWNER_APPROVAL_STATUSES,
  VENUE_MODERATION_BY_STATUS,
  VENUE_APPROVAL_STATUSES,
  VENUE_STATUS_BY_MODERATION,
  VENUE_STATUSES,
  approvalStatusForUser,
  canAuthenticateUser,
  isOwnerActive,
  isVenueLive,
  normalizeVenueApprovalStatus,
  normalizeOwnerAccountStatus,
  normalizeOwnerApprovalStatus,
  normalizeVenueStatus,
  venueModerationStatus,
  venueStatusLabel,
};
