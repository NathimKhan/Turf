function successResponse(res, message, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function errorResponse(res, message, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = {
  asyncHandler,
  errorResponse,
  successResponse,
};
