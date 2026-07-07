const express = require("express");
const { param } = require("express-validator");
const {
  createTournament,
  createTournamentRegistration,
  deleteTournament,
  getMyTournamentRegistrations,
  getOwnerTournamentRegistrations,
  getOwnerTournaments,
  getTournamentById,
  getTournaments,
  tournamentRegistrationStatusValidation,
  tournamentRegistrationValidation,
  tournamentValidation,
  updateTournamentRegistrationStatus,
  updateTournament,
} = require("../controllers/tournamentController");
const { authorizeRoles, protect } = require("../middleware/authMiddleware");
const ownerOrAdmin = require("../middleware/ownerMiddleware");
const { activeOwnerOrAdmin } = require("../middleware/ownerMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");

const router = express.Router();

router.post("/", protect, activeOwnerOrAdmin, tournamentValidation, validateRequest, createTournament);
router.get("/", getTournaments);
router.get("/mine/registrations", protect, authorizeRoles("user", "admin"), getMyTournamentRegistrations);
router.get("/owner/mine", protect, ownerOrAdmin, getOwnerTournaments);
router.get("/owner/registrations", protect, ownerOrAdmin, getOwnerTournamentRegistrations);
router.post("/:id/register", protect, authorizeRoles("user", "admin"), tournamentRegistrationValidation, validateRequest, createTournamentRegistration);
router.patch("/registrations/:id/status", protect, ownerOrAdmin, tournamentRegistrationStatusValidation, validateRequest, updateTournamentRegistrationStatus);
router.get("/:id", param("id").isMongoId().withMessage("Valid tournament id is required"), validateRequest, getTournamentById);
router.put("/:id", protect, activeOwnerOrAdmin, param("id").isMongoId(), tournamentValidation, validateRequest, updateTournament);
router.delete("/:id", protect, activeOwnerOrAdmin, param("id").isMongoId().withMessage("Valid tournament id is required"), validateRequest, deleteTournament);

module.exports = router;
