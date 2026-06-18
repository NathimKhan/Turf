const { rateLimit } = require("express-rate-limit");

function containsUnsafeKey(value) {
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).some(([key, child]) => {
    if (key.startsWith("$") || key.includes(".")) return true;
    return containsUnsafeKey(child);
  });
}

function rejectUnsafeKeys(req, res, next) {
  if (containsUnsafeKey(req.body) || containsUnsafeKey(req.query) || containsUnsafeKey(req.params)) {
    const error = new Error("Request contains unsupported field names");
    error.statusCode = 400;
    return next(error);
  }

  return next();
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT || (process.env.NODE_ENV === "production" ? 600 : 5000)),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  rejectUnsafeKeys,
};
