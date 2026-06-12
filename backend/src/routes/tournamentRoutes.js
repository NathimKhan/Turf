const express = require("express");
const { param } = require("express-validator");
const {
  createTournament,
  deleteTournament,
  getTournamentById,
  getTournaments,
  tournamentValidation,
  updateTournament,
} = require("../controllers/tournamentController");
const { protect } = require("../middleware/authMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.post("/", protect, ownerOrAdmin, tournamentValidation, validateRequest, createTournament);
router.get("/", getTournaments);
router.get("/:id", param("id").isMongoId().withMessage("Valid tournament id is required"), validateRequest, getTournamentById);
router.put("/:id", protect, ownerOrAdmin, param("id").isMongoId(), tournamentValidation, validateRequest, updateTournament);
router.delete("/:id", protect, ownerOrAdmin, param("id").isMongoId().withMessage("Valid tournament id is required"), validateRequest, deleteTournament);

module.exports = router;
