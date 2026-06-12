const express = require("express");
const { param } = require("express-validator");
const { createReview, deleteReview, getReviewsByTurf, reviewValidation } = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.post("/", protect, reviewValidation, validateRequest, createReview);
router.get("/turf/:id", param("id").isMongoId().withMessage("Valid turf id is required"), validateRequest, getReviewsByTurf);
router.delete("/:id", protect, param("id").isMongoId().withMessage("Valid review id is required"), validateRequest, deleteReview);

module.exports = router;
