const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");
const { createPayment, getPaymentHistory, paymentValidation } = require("../controllers/paymentController");

const router = express.Router();

router.use(protect);

router.post("/create", paymentValidation, validateRequest, createPayment);
router.post("/checkout", paymentValidation, validateRequest, createPayment);
router.get("/history", getPaymentHistory);

module.exports = router;
