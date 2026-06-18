const express = require("express");
const { param } = require("express-validator");
const {
  addFavorite,
  getFavorites,
  removeFavorite,
} = require("../controllers/favoriteController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("user", "admin"));

router.get("/", getFavorites);
router.post(
  "/:turfId",
  param("turfId").isMongoId().withMessage("Valid turf id is required"),
  validateRequest,
  addFavorite,
);
router.delete(
  "/:turfId",
  param("turfId").isMongoId().withMessage("Valid turf id is required"),
  validateRequest,
  removeFavorite,
);

module.exports = router;
