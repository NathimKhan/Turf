const express = require("express");
const { body, param } = require("express-validator");
const {
  bookingValidation,
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
  updateBookingStatus,
} = require("../controllers/bookingController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", authorizeRoles("user", "admin"), bookingValidation, validateRequest, createBooking);
router.get("/", getMyBookings);
router.get("/my-bookings", getMyBookings);
router.put("/cancel/:id", param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest, cancelBooking);
router.patch(
  "/:id/status",
  authorizeRoles("owner", "admin"),
  param("id").isMongoId().withMessage("Valid booking id is required"),
  body("status").isIn(["confirmed", "checked_in", "cancelled", "completed"]).withMessage("Invalid booking status"),
  validateRequest,
  updateBookingStatus,
);
router.get("/:id", param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest, getBookingById);

module.exports = router;
