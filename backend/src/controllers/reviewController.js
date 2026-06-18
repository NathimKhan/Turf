const { body, param } = require("express-validator");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Review = require("../models/Review");
const Turf = require("../models/Turf");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

async function refreshTurfRating(turfId) {
  const stats = await Review.aggregate([
    { $match: { turfId } },
    {
      $group: {
        _id: "$turfId",
        rating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const rating = stats[0]?.rating || 0;
  const totalReviews = stats[0]?.totalReviews || 0;

  await Turf.findByIdAndUpdate(turfId, {
    rating: Number(rating.toFixed(1)),
    totalReviews,
  });
}

const reviewValidation = [
  body("turfId").isMongoId().withMessage("Valid turf id is required"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").trim().isLength({ min: 3 }).withMessage("Comment must be at least 3 characters"),
];

const reviewUpdateValidation = [
  param("id").isMongoId().withMessage("Valid review id is required"),
  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional().trim().isLength({ min: 3 }).withMessage("Comment must be at least 3 characters"),
];

const createReview = asyncHandler(async (req, res) => {
  const turf = await Turf.findById(req.body.turfId);

  if (!turf) {
    const error = new Error("Turf not found");
    error.statusCode = 404;
    throw error;
  }

  const completedBooking = await Booking.exists({
    userId: req.user._id,
    turfId: turf._id,
    bookingStatus: "completed",
  });

  if (!completedBooking) {
    const error = new Error("A completed booking is required before reviewing this turf");
    error.statusCode = 403;
    throw error;
  }

  const review = await Review.create({
    userId: req.user._id,
    turfId: req.body.turfId,
    rating: req.body.rating,
    comment: req.body.comment,
  });

  await refreshTurfRating(turf._id);

  await Notification.create({
    userId: turf.ownerId,
    title: "New review received",
    message: `${req.user.name} rated ${turf.name} ${req.body.rating}/5.`,
    metadata: { reviewId: review._id, turfId: turf._id },
    targetUrl: "/owner/reviews",
    type: "review",
  });

  return successResponse(res, "Review created", { review }, 201);
});

const getReviewsByTurf = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ turfId: req.params.id })
    .populate("userId", "name profileImage")
    .sort({ createdAt: -1 });

  return successResponse(res, "Reviews fetched", { reviews });
});

const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ userId: req.user._id })
    .populate("turfId", "name city images")
    .sort({ createdAt: -1 });

  return successResponse(res, "Reviews fetched", { reviews });
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(review.userId) !== String(req.user._id) && req.user.role !== "admin") {
    const error = new Error("You cannot edit this review");
    error.statusCode = 403;
    throw error;
  }

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();
  await refreshTurfRating(review.turfId);

  return successResponse(res, "Review updated", { review });
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    const error = new Error("Review not found");
    error.statusCode = 404;
    throw error;
  }

  const turf = await Turf.findById(review.turfId);
  const isTurfOwner = turf && String(turf.ownerId) === String(req.user._id);
  const isReviewOwner = String(review.userId) === String(req.user._id);

  if (!isReviewOwner && !isTurfOwner && req.user.role !== "admin") {
    const error = new Error("You cannot delete this review");
    error.statusCode = 403;
    throw error;
  }

  const turfId = review.turfId;
  await review.deleteOne();
  await refreshTurfRating(turfId);

  return successResponse(res, "Review deleted");
});

module.exports = {
  createReview,
  deleteReview,
  getMyReviews,
  getReviewsByTurf,
  reviewUpdateValidation,
  reviewValidation,
  updateReview,
};
