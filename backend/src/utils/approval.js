const OWNER_APPROVAL_STATUSES = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"];
const VENUE_STATUSES = ["DRAFT", "PENDING", "LIVE", "REJECTED", "SUSPENDED"];

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
  DRAFT: "pending",
  LIVE: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
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
  if (VENUE_STATUS_BY_MODERATION[lower]) return VENUE_STATUS_BY_MODERATION[lower];
  if (lower === "published" || lower === "available" || lower === "approved") return "LIVE";
  if (lower === "review") return "PENDING";

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
  if (turf.status) return normalizeVenueStatus(turf.status) === "LIVE";
  if (turf.moderationStatus) return normalizeVenueStatus(turf.moderationStatus) === "LIVE";
  return Boolean(turf.isApproved);
}

function venueStatusLabel(value) {
  const labels = {
    DRAFT: "Draft",
    LIVE: "Live",
    PENDING: "Pending Approval",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };
  return labels[normalizeVenueStatus(value)] || "Pending Approval";
}

module.exports = {
  OWNER_ACCOUNT_STATUS_BY_APPROVAL,
  OWNER_APPROVAL_BY_ACCOUNT_STATUS,
  OWNER_APPROVAL_STATUSES,
  VENUE_MODERATION_BY_STATUS,
  VENUE_STATUS_BY_MODERATION,
  VENUE_STATUSES,
  approvalStatusForUser,
  canAuthenticateUser,
  isOwnerActive,
  isVenueLive,
  normalizeOwnerAccountStatus,
  normalizeOwnerApprovalStatus,
  normalizeVenueStatus,
  venueModerationStatus,
  venueStatusLabel,
};
