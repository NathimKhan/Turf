const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { approvalStatusForUser, canAuthenticateUser } = require("../utils/approval");

async function protect(req, res, next) {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password -passwordResetToken -passwordResetExpires");

    if (!user) {
      const error = new Error("User attached to this token no longer exists");
      error.statusCode = 401;
      throw error;
    }

    if (user.role === "admin" || user.role === "user") {
      req.user = user;
      return next();
    }

    const approvalStatus = approvalStatusForUser(user);
    if (!canAuthenticateUser(user)) {
      const messages = {
        PENDING: "Your account is awaiting approval",
        REJECTED: "Your account application was rejected",
        SUSPENDED: "Your account has been suspended",
      };
      const error = new Error(messages[approvalStatus] || "Your account is not active");
      error.statusCode = 403;
      throw error;
    }

    req.user = user;
    return next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    next(error);
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error("You do not have permission to perform this action");
      error.statusCode = 403;
      return next(error);
    }

    return next();
  };
}

async function optionalProtect(req, res, next) {
  const hasBearerToken = req.headers.authorization?.startsWith("Bearer ");
  const hasCookieToken = Boolean(req.cookies?.token);

  if (!hasBearerToken && !hasCookieToken) {
    return next();
  }

  return protect(req, res, next);
}

module.exports = {
  authorizeRoles,
  optionalProtect,
  protect,
};
