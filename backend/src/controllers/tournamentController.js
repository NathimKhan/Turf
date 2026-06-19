const { body } = require("express-validator");
const Tournament = require("../models/Tournament");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

function canManage(user, tournament) {
  return user.role === "admin" || String(tournament.createdBy) === String(user._id);
}

const tournamentValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("sport").isIn(["Football", "Cricket", "Volleyball", "Basketball", "Badminton", "Tennis"]).withMessage("Invalid sport"),
  body("prizePool").isFloat({ min: 0 }).withMessage("Prize pool must be positive"),
  body("startDate").isISO8601().withMessage("Valid start date is required"),
  body("endDate").isISO8601().withMessage("Valid end date is required"),
];

const createTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.create({
    title: req.body.title,
    description: req.body.description,
    sport: req.body.sport,
    prizePool: req.body.prizePool,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    participants: req.body.participants || [],
    createdBy: req.user._id,
  });

  return successResponse(res, "Tournament created", { tournament }, 201);
});

const getTournaments = asyncHandler(async (req, res) => {
  const { sport } = req.query;
  const filter = sport ? { sport } : {};

  const tournaments = await Tournament.find(filter)
    .populate("createdBy", "name email role")
    .populate("participants", "name email")
    .sort({ startDate: 1 });

  return successResponse(res, "Tournaments fetched", { tournaments });
});

const getTournamentById = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id)
    .populate("createdBy", "name email role")
    .populate("participants", "name email");

  if (!tournament) {
    const error = new Error("Tournament not found");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(res, "Tournament fetched", { tournament });
});

const updateTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    const error = new Error("Tournament not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManage(req.user, tournament)) {
    const error = new Error("You cannot update this tournament");
    error.statusCode = 403;
    throw error;
  }

  const fields = ["title", "description", "sport", "prizePool", "startDate", "endDate", "participants"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) tournament[field] = req.body[field];
  });

  await tournament.save();

  return successResponse(res, "Tournament updated", { tournament });
});

const deleteTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    const error = new Error("Tournament not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManage(req.user, tournament)) {
    const error = new Error("You cannot delete this tournament");
    error.statusCode = 403;
    throw error;
  }

  await tournament.deleteOne();

  return successResponse(res, "Tournament deleted");
});

module.exports = {
  createTournament,
  deleteTournament,
  getTournamentById,
  getTournaments,
  tournamentValidation,
  updateTournament,
};
