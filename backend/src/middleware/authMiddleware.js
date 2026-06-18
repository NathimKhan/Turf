const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

    if (user.accountStatus && user.accountStatus !== "active") {
      const messages = {
        pending: "Your account is awaiting approval",
        rejected: "Your account application was rejected",
        suspended: "Your account has been suspended",
      };
      const error = new Error(messages[user.accountStatus] || "Your account is not active");
      error.statusCode = 403;
      throw error;
    }

    req.user = user;
    next();
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
