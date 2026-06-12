const { validationResult } = require("express-validator");
const { errorResponse } = require("../utils/responseHandler");

function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || res.statusCode;
  statusCode = statusCode && statusCode !== 200 ? statusCode : 500;

  let message = err.message || "Server error";

  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `${field} already exists`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
  }

  return errorResponse(res, message, statusCode);
}

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error(errors.array().map((item) => item.msg).join(", "));
    error.statusCode = 400;
    return next(error);
  }

  return next();
}

module.exports = {
  errorMiddleware,
  notFound,
  validateRequest,
};
