const { body, param } = require("express-validator");
const Notification = require("../models/Notification");
const Turf = require("../models/Turf");
const Tournament = require("../models/Tournament");
const TournamentRegistration = require("../models/TournamentRegistration");
const { publicVenueFilter } = require("../services/venueApprovalService");
const { isOwnerActive, isVenueLive } = require("../utils/approval");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const PLATFORM_FEE_RATE = 0.1;

function canManage(user, tournament) {
  return user.role === "admin" ||
    String(tournament.createdBy) === String(user._id) ||
    String(tournament.ownerId || "") === String(user._id);
}

function createTransactionId() {
  return `TOURNEY-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function revenueSplit(amount) {
  const platformFee = money(amount * PLATFORM_FEE_RATE);
  return {
    ownerRevenue: money(amount - platformFee),
    platformFee,
  };
}

function rupees(amount) {
  return `INR ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function populateTournament(query) {
  return query
    .populate("createdBy", "name email role")
    .populate("ownerId", "name email businessName role")
    .populate({
      path: "turfId",
      populate: { path: "ownerId", select: "name email businessName approvalStatus accountStatus role" },
      select: "name area city state address location latitude longitude sportsSupported images pricePerHour sportRates ownerId status approvalStatus visibility isPublished isVerified isApproved moderationStatus",
    })
    .populate("participants", "name email");
}

function populateRegistration(query) {
  return query
    .populate("userId", "name email phone")
    .populate("ownerId", "name email businessName")
    .populate("turfId", "name area city state address sportsSupported images pricePerHour sportRates ownerId")
    .populate({
      path: "tournamentId",
      populate: [
        { path: "turfId", select: "name area city state address sportsSupported images pricePerHour sportRates ownerId" },
        { path: "ownerId", select: "name email businessName" },
      ],
    });
}

function liveTurfFilter(extra = {}) {
  return {
    ...extra,
    ...publicVenueFilter(),
  };
}

function fallbackEntryFee(tournament, turf) {
  const savedFee = Number(tournament.entryFee || 0);
  if (savedFee > 0) return savedFee;

  return Math.max(250, Math.round(Number(turf.pricePerHour || 1000) * 0.5 / 50) * 50);
}

async function findFallbackTurfForTournament(tournament) {
  const createdBy = tournament.createdBy;
  const creatorId = createdBy?._id || createdBy;
  const creatorRole = createdBy?.role;
  const sport = tournament.sport;
  const ownerId = tournament.ownerId || (creatorRole === "owner" ? creatorId : null);
  const populateOwner = { path: "ownerId", select: "name email businessName approvalStatus accountStatus role" };

  if (ownerId) {
    const ownerSportTurf = await Turf.findOne(liveTurfFilter({ ownerId, sportsSupported: sport }))
      .populate(populateOwner)
      .sort({ createdAt: -1 });
    if (ownerSportTurf) return ownerSportTurf;

    const ownerTurf = await Turf.findOne(liveTurfFilter({ ownerId }))
      .populate(populateOwner)
      .sort({ createdAt: -1 });
    if (ownerTurf) return ownerTurf;
  }

  const sportTurf = await Turf.findOne(liveTurfFilter({ sportsSupported: sport }))
    .populate(populateOwner)
    .sort({ createdAt: -1 });
  if (sportTurf) return sportTurf;

  return Turf.findOne(liveTurfFilter())
    .populate(populateOwner)
    .sort({ createdAt: -1 });
}

async function resolvedTournamentVenue(tournament) {
  if (tournament.turfId) {
    return {
      entryFee: Number(tournament.entryFee || 0),
      ownerId: tournament.ownerId?._id || tournament.ownerId || tournament.turfId.ownerId?._id || tournament.turfId.ownerId,
      turf: tournament.turfId,
    };
  }

  const turf = await findFallbackTurfForTournament(tournament);
  if (!turf) return null;

  return {
    entryFee: fallbackEntryFee(tournament, turf),
    ownerId: turf.ownerId?._id || turf.ownerId,
    turf,
  };
}

async function withResolvedTournamentVenues(tournaments) {
  return Promise.all(
    tournaments.map(async (tournament) => {
      if (tournament.turfId) return tournament;

      const resolved = await resolvedTournamentVenue(tournament);
      if (!resolved) return tournament;

      const output = typeof tournament.toObject === "function"
        ? tournament.toObject({ virtuals: true })
        : { ...tournament };

      output.entryFee = resolved.entryFee;
      output.ownerId = resolved.turf.ownerId;
      output.turfId = resolved.turf;
      return output;
    }),
  );
}

const tournamentValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("sport").isIn(["Football", "Cricket", "Volleyball", "Basketball", "Badminton", "Tennis"]).withMessage("Invalid sport"),
  body("prizePool").isFloat({ min: 0 }).withMessage("Prize pool must be positive"),
  body("entryFee").optional().isFloat({ min: 0 }).withMessage("Entry fee must be positive"),
  body("maxTeams").optional().isInt({ min: 1, max: 128 }).withMessage("Max teams must be between 1 and 128"),
  body("turfId").optional({ checkFalsy: true }).isMongoId().withMessage("Valid turf id is required"),
  body("startDate").isISO8601().withMessage("Valid start date is required"),
  body("endDate").isISO8601().withMessage("Valid end date is required"),
];

const tournamentRegistrationValidation = [
  param("id").isMongoId().withMessage("Valid tournament id is required"),
  body("teamName").trim().notEmpty().withMessage("Team name is required").isLength({ max: 80 }).withMessage("Team name cannot exceed 80 characters"),
  body("captainName").optional().trim().isLength({ max: 80 }).withMessage("Captain name cannot exceed 80 characters"),
  body("participantCount").optional().isInt({ min: 1, max: 30 }).withMessage("Players must be between 1 and 30"),
  body("paymentMethod").optional().isIn(["UPI", "Card", "Cash", "Mock Payment"]).withMessage("Invalid payment method"),
  body("notes").optional().trim().isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters"),
];

const tournamentRegistrationStatusValidation = [
  param("id").isMongoId().withMessage("Valid registration id is required"),
  body("status").isIn(["approved", "rejected"]).withMessage("Status must be approved or rejected"),
  body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason cannot exceed 500 characters"),
];

const createTournament = asyncHandler(async (req, res) => {
  let turf = null;
  if (req.body.turfId) {
    turf = await Turf.findById(req.body.turfId).populate("ownerId", "name email businessName approvalStatus accountStatus role");

    if (!turf) {
      const error = new Error("Selected turf was not found");
      error.statusCode = 404;
      throw error;
    }

    if (req.user.role === "owner" && String(turf.ownerId?._id || turf.ownerId) !== String(req.user._id)) {
      const error = new Error("You can create tournaments only for your own turfs");
      error.statusCode = 403;
      throw error;
    }

    if (!isVenueLive(turf) || !isOwnerActive(turf.ownerId)) {
      const error = new Error("Tournaments can be created only for live turfs with active owners");
      error.statusCode = 403;
      throw error;
    }
  } else if (req.user.role === "owner") {
    const error = new Error("Select one of your existing turfs for this tournament");
    error.statusCode = 400;
    throw error;
  }

  const tournament = await Tournament.create({
    title: req.body.title,
    description: req.body.description,
    sport: req.body.sport,
    prizePool: req.body.prizePool,
    entryFee: req.body.entryFee || 0,
    maxTeams: req.body.maxTeams || 8,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    participants: req.body.participants || [],
    createdBy: req.user._id,
    ownerId: turf?.ownerId?._id || turf?.ownerId,
    turfId: turf?._id,
  });

  const populated = await populateTournament(Tournament.findById(tournament._id));

  return successResponse(res, "Tournament created", { tournament: populated }, 201);
});

const getTournaments = asyncHandler(async (req, res) => {
  const { sport, turfId } = req.query;
  const filter = {};
  if (sport) filter.sport = sport;
  if (turfId) filter.turfId = turfId;

  const tournaments = await populateTournament(Tournament.find(filter).sort({ startDate: 1 }));

  return successResponse(res, "Tournaments fetched", { tournaments: await withResolvedTournamentVenues(tournaments) });
});

const getOwnerTournaments = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === "admin"
      ? {}
      : { $or: [{ ownerId: req.user._id }, { createdBy: req.user._id }] };

  const tournaments = await populateTournament(Tournament.find(filter).sort({ startDate: 1 }));

  return successResponse(res, "Owner tournaments fetched", { tournaments: await withResolvedTournamentVenues(tournaments) });
});

const getTournamentById = asyncHandler(async (req, res) => {
  const tournament = await populateTournament(Tournament.findById(req.params.id));

  if (!tournament) {
    const error = new Error("Tournament not found");
    error.statusCode = 404;
    throw error;
  }

  const [resolvedTournament] = await withResolvedTournamentVenues([tournament]);

  return successResponse(res, "Tournament fetched", { tournament: resolvedTournament });
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
  if (req.body.entryFee !== undefined) tournament.entryFee = req.body.entryFee;
  if (req.body.maxTeams !== undefined) tournament.maxTeams = req.body.maxTeams;
  fields.forEach((field) => {
    if (req.body[field] !== undefined) tournament[field] = req.body[field];
  });

  await tournament.save();

  const populated = await populateTournament(Tournament.findById(tournament._id));

  return successResponse(res, "Tournament updated", { tournament: populated });
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

const createTournamentRegistration = asyncHandler(async (req, res) => {
  const tournament = await populateTournament(Tournament.findById(req.params.id));

  if (!tournament) {
    const error = new Error("Tournament not found");
    error.statusCode = 404;
    throw error;
  }

  const resolved = await resolvedTournamentVenue(tournament);

  if (!resolved?.turf || !resolved.ownerId) {
    const error = new Error("This tournament is not linked to a turf yet");
    error.statusCode = 409;
    throw error;
  }

  if (new Date(tournament.startDate) <= new Date()) {
    const error = new Error("Tournament registration is closed");
    error.statusCode = 409;
    throw error;
  }

  if (!isVenueLive(resolved.turf) || !isOwnerActive(resolved.turf.ownerId)) {
    const error = new Error("This tournament is not accepting registrations");
    error.statusCode = 403;
    throw error;
  }

  const existingRegistration = await TournamentRegistration.findOne({
    userId: req.user._id,
    tournamentId: tournament._id,
    approvalStatus: { $in: ["pending", "approved"] },
    paymentStatus: "paid",
  });

  if (existingRegistration) {
    const error = new Error("You already have a paid registration for this tournament");
    error.statusCode = 409;
    throw error;
  }

  const reservedTeams = await TournamentRegistration.countDocuments({
    tournamentId: tournament._id,
    approvalStatus: { $in: ["pending", "approved"] },
    paymentStatus: "paid",
  });

  if (reservedTeams >= Number(tournament.maxTeams || 1)) {
    const error = new Error("This tournament is full");
    error.statusCode = 409;
    throw error;
  }

  const split = revenueSplit(resolved.entryFee);
  const registration = await TournamentRegistration.create({
    userId: req.user._id,
    ownerId: resolved.ownerId,
    turfId: resolved.turf._id || resolved.turf,
    tournamentId: tournament._id,
    teamName: req.body.teamName,
    captainName: req.body.captainName || req.user.name,
    participantCount: req.body.participantCount || 1,
    entryFee: resolved.entryFee,
    ...split,
    paymentMethod: req.body.paymentMethod || "Mock Payment",
    paymentStatus: "paid",
    approvalStatus: "pending",
    transactionId: createTransactionId(),
    paidAt: new Date(),
    notes: req.body.notes || "",
  });

  await Notification.create([
    {
      userId: req.user._id,
      title: "Tournament entry fee paid",
      message: `${rupees(resolved.entryFee)} paid for ${tournament.title} at ${resolved.turf.name}. Waiting for turf owner approval.`,
      metadata: { registrationId: registration._id, tournamentId: tournament._id, transactionId: registration.transactionId },
      targetUrl: "/tournaments/my",
      type: "tournament",
    },
    {
      userId: resolved.ownerId,
      title: "Tournament approval needed",
      message: `${req.user.name} paid the entry fee for ${tournament.title} at ${resolved.turf.name}. Approve the team registration.`,
      metadata: { registrationId: registration._id, tournamentId: tournament._id, transactionId: registration.transactionId },
      targetUrl: "/owner/tournaments",
      type: "tournament",
    },
  ]);

  const populated = await populateRegistration(TournamentRegistration.findById(registration._id));

  return successResponse(res, "Tournament payment successful. Waiting for turf owner approval.", { registration: populated }, 201);
});

const getMyTournamentRegistrations = asyncHandler(async (req, res) => {
  const registrations = await populateRegistration(
    TournamentRegistration.find({ userId: req.user._id }).sort({ createdAt: -1 }),
  );

  return successResponse(res, "Tournament registrations fetched", { registrations });
});

const getOwnerTournamentRegistrations = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { ownerId: req.user._id };
  const registrations = await populateRegistration(
    TournamentRegistration.find(filter).sort({ createdAt: -1 }),
  );

  return successResponse(res, "Owner tournament registrations fetched", { registrations });
});

const updateTournamentRegistrationStatus = asyncHandler(async (req, res) => {
  const registration = await populateRegistration(TournamentRegistration.findById(req.params.id));

  if (!registration) {
    const error = new Error("Tournament registration not found");
    error.statusCode = 404;
    throw error;
  }

  if (req.user.role !== "admin" && String(registration.ownerId?._id || registration.ownerId) !== String(req.user._id)) {
    const error = new Error("You cannot manage this tournament registration");
    error.statusCode = 403;
    throw error;
  }

  if (req.user.role === "owner" && !isOwnerActive(req.user)) {
    const error = new Error("Your account is pending approval from Platform Owner.");
    error.statusCode = 403;
    throw error;
  }

  if (req.body.status === "approved" && registration.approvalStatus !== "approved") {
    const approvedTeams = await TournamentRegistration.countDocuments({
      _id: { $ne: registration._id },
      tournamentId: registration.tournamentId._id || registration.tournamentId,
      approvalStatus: "approved",
      paymentStatus: "paid",
    });

    if (approvedTeams >= Number(registration.tournamentId.maxTeams || 1)) {
      const error = new Error("This tournament has reached its approved team limit");
      error.statusCode = 409;
      throw error;
    }
  }

  registration.approvalStatus = req.body.status;
  registration.approvedAt = req.body.status === "approved" ? new Date() : undefined;
  registration.approvedBy = req.user._id;
  registration.rejectionReason = req.body.status === "rejected" ? req.body.reason || "Not approved by turf owner" : "";
  await registration.save();

  if (req.body.status === "approved") {
    await Tournament.findByIdAndUpdate(registration.tournamentId._id || registration.tournamentId, {
      $addToSet: { participants: registration.userId._id || registration.userId },
    });
  } else {
    await Tournament.findByIdAndUpdate(registration.tournamentId._id || registration.tournamentId, {
      $pull: { participants: registration.userId._id || registration.userId },
    });
  }

  await Notification.create({
    userId: registration.userId._id || registration.userId,
    title: req.body.status === "approved" ? "Tournament registration approved" : "Tournament registration rejected",
    message:
      req.body.status === "approved"
        ? `${registration.teamName} is approved for ${registration.tournamentId.title}. Your tournament status is successful.`
        : `${registration.teamName} was rejected for ${registration.tournamentId.title}. ${registration.rejectionReason}`,
    metadata: { registrationId: registration._id, tournamentId: registration.tournamentId._id || registration.tournamentId, transactionId: registration.transactionId },
    targetUrl: "/tournaments/my",
    type: "tournament",
  });

  const populated = await populateRegistration(TournamentRegistration.findById(registration._id));

  return successResponse(res, "Tournament registration updated", { registration: populated });
});

module.exports = {
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
};
