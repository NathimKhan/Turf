const express = require("express");
const { param } = require("express-validator");
const {
  createReview,
  deleteReview,
  getMyReviews,
  getReviewsByTurf,
  reviewUpdateValidation,
  reviewValidation,
  updateReview,
} = require("../controllers/reviewController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.post("/", protect, authorizeRoles("user"), reviewValidation, validateRequest, createReview);
router.get("/mine", protect, authorizeRoles("user"), getMyReviews);
router.get("/turf/:id", param("id").isMongoId().withMessage("Valid turf id is required"), validateRequest, getReviewsByTurf);
router.put("/:id", protect, reviewUpdateValidation, validateRequest, updateReview);
router.delete("/:id", protect, param("id").isMongoId().withMessage("Valid review id is required"), validateRequest, deleteReview);

module.exports = router;
