const express = require("express");
const { param } = require("express-validator");
const adminOnly = require("../middleware/adminMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");
const {
  createPayment,
  getPaymentHistory,
  paymentValidation,
  refundPayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.use(protect);

router.post("/create", authorizeRoles("user", "admin"), paymentValidation, validateRequest, createPayment);
router.post("/checkout", authorizeRoles("user", "admin"), paymentValidation, validateRequest, createPayment);
router.get("/history", getPaymentHistory);
router.patch(
  "/:id/refund",
  adminOnly,
  param("id").isMongoId().withMessage("Valid payment id is required"),
  validateRequest,
  refundPayment,
);

module.exports = router;
