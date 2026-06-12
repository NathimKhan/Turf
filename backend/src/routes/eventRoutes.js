const express = require("express");
const { param } = require("express-validator");
const { createEvent, deleteEvent, eventValidation, getEventById, getEvents, updateEvent } = require("../controllers/eventController");
const { protect } = require("../middleware/authMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.post("/", protect, ownerOrAdmin, eventValidation, validateRequest, createEvent);
router.get("/", getEvents);
router.get("/:id", param("id").isMongoId().withMessage("Valid event id is required"), validateRequest, getEventById);
router.put("/:id", protect, ownerOrAdmin, param("id").isMongoId(), eventValidation, validateRequest, updateEvent);
router.delete("/:id", protect, ownerOrAdmin, param("id").isMongoId().withMessage("Valid event id is required"), validateRequest, deleteEvent);

module.exports = router;
