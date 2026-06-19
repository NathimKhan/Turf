const { authorizeRoles } = require("./authMiddleware");
const { isOwnerActive } = require("../utils/approval");

const ownerOrAdmin = authorizeRoles("owner", "admin");

function activeOwnerOrAdmin(req, res, next) {
  if (!req.user || !["owner", "admin"].includes(req.user.role)) {
    const error = new Error("You do not have permission to perform this action");
    error.statusCode = 403;
    return next(error);
  }

  if (req.user.role === "owner" && !isOwnerActive(req.user)) {
    const error = new Error("Your account is pending approval from Platform Owner.");
    error.statusCode = 403;
    return next(error);
  }

  return next();
}

module.exports = ownerOrAdmin;
module.exports.activeOwnerOrAdmin = activeOwnerOrAdmin;
