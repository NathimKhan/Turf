const express = require("express");
const { param } = require("express-validator");
const {
  createTurf,
  deleteTurf,
  getTurfById,
  getTurfs,
  getTurfsByCity,
  searchTurfs,
  turfUpdateValidation,
  turfValidation,
  updateTurf,
  updateTurfSlots,
} = require("../controllers/turfController");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getTurfs);
router.get("/search", searchTurfs);
router.get("/city/:city", getTurfsByCity);
router.get("/:id", param("id").isMongoId().withMessage("Valid turf id is required"), validateRequest, getTurfById);
router.post("/", protect, ownerOrAdmin, upload.array("images", 8), turfValidation, validateRequest, createTurf);
router.put("/:id", protect, ownerOrAdmin, upload.array("images", 8), param("id").isMongoId(), turfUpdateValidation, validateRequest, updateTurf);
router.put("/:id/slots", protect, ownerOrAdmin, param("id").isMongoId(), validateRequest, updateTurfSlots);
router.delete("/:id", protect, ownerOrAdmin, param("id").isMongoId().withMessage("Valid turf id is required"), validateRequest, deleteTurf);

module.exports = router;
