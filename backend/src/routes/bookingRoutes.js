const express = require("express");
const { param } = require("express-validator");
const { bookingValidation, cancelBooking, createBooking, getBookingById, getMyBookings } = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", bookingValidation, validateRequest, createBooking);
router.get("/", getMyBookings);
router.get("/my-bookings", getMyBookings);
router.get("/:id", param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest, getBookingById);
router.put("/cancel/:id", param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest, cancelBooking);

module.exports = router;
