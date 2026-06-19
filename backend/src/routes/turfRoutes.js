const express = require("express");
const { param } = require("express-validator");
const {
  createTurf,
  deleteTurf,
  getMyTurfs,
  getTurfById,
  getTurfAvailability,
  getTurfMetadata,
  getTurfs,
  getTurfsByCity,
  searchTurfs,
  turfUpdateValidation,
  turfValidation,
  updateTurf,
  updateTurfSlots,
} = require("../controllers/turfController");
const { optionalProtect, protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");
const { activeOwnerOrAdmin } = require("../middleware/ownerMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", optionalProtect, getTurfs);
router.get("/search", optionalProtect, searchTurfs);
router.get("/meta", getTurfMetadata);
router.get("/mine", protect, ownerOrAdmin, getMyTurfs);
router.get("/city/:city", optionalProtect, getTurfsByCity);
router.get(
  "/:id/availability",
  param("id").isMongoId().withMessage("Valid turf id is required"),
  validateRequest,
  getTurfAvailability,
);
router.get(
  "/:id",
  optionalProtect,
  param("id").isMongoId().withMessage("Valid turf id is required"),
  validateRequest,
  getTurfById,
);
router.post("/", protect, activeOwnerOrAdmin, upload.array("images", 8), turfValidation, validateRequest, createTurf);
router.put("/:id", protect, activeOwnerOrAdmin, upload.array("images", 8), param("id").isMongoId(), turfUpdateValidation, validateRequest, updateTurf);
router.put("/:id/slots", protect, activeOwnerOrAdmin, param("id").isMongoId(), validateRequest, updateTurfSlots);
router.delete("/:id", protect, activeOwnerOrAdmin, param("id").isMongoId().withMessage("Valid turf id is required"), validateRequest, deleteTurf);

module.exports = router;
