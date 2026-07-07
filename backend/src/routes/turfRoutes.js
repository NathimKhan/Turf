const express = require("express");
const { param } = require("express-validator");
const {
  createTurf,
  deleteTurf,
  geocodeTurfAddress,
  getGeneratedTurfMedia,
  getMyTurfs,
  getNearbyTurfs,
  getTurfById,
  getTurfAvailability,
  getTurfMetadata,
  getTurfs,
  getTurfsByCity,
  resubmitTurf,
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
const { TURF_IMAGE_UPLOAD_FIELDS } = require("../utils/turfImages");

const router = express.Router();

router.get("/", optionalProtect, getTurfs);
router.get("/search", optionalProtect, searchTurfs);
router.get("/meta", getTurfMetadata);
router.get("/geocode", protect, ownerOrAdmin, geocodeTurfAddress);
router.get("/nearby", optionalProtect, getNearbyTurfs);
router.get("/mine", protect, ownerOrAdmin, getMyTurfs);
router.get("/city/:city", optionalProtect, getTurfsByCity);
router.get("/generated-media/:token.svg", getGeneratedTurfMedia);
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
router.post("/", protect, activeOwnerOrAdmin, upload.fields(TURF_IMAGE_UPLOAD_FIELDS), turfValidation, validateRequest, createTurf);
router.put("/:id", protect, activeOwnerOrAdmin, upload.fields(TURF_IMAGE_UPLOAD_FIELDS), param("id").isMongoId(), turfUpdateValidation, validateRequest, updateTurf);
router.post("/:id/resubmit", protect, activeOwnerOrAdmin, param("id").isMongoId(), validateRequest, resubmitTurf);
router.put("/:id/slots", protect, activeOwnerOrAdmin, param("id").isMongoId(), validateRequest, updateTurfSlots);
router.delete("/:id", protect, activeOwnerOrAdmin, param("id").isMongoId().withMessage("Valid turf id is required"), validateRequest, deleteTurf);

module.exports = router;
