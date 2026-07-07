const { body, param } = require("express-validator");
const CoachBooking = require("../models/CoachBooking");
const Notification = require("../models/Notification");
const Turf = require("../models/Turf");
const User = require("../models/User");
const { publicVenueFilter } = require("../services/venueApprovalService");
const { isOwnerActive, isVenueLive } = require("../utils/approval");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

const PLATFORM_FEE_RATE = 0.1;

const coachNames = {
  Badminton: ["Ananya Rao", "Vikram Bhat"],
  Basketball: ["Kabir Thomas", "Nisha Menon"],
  Cricket: ["Rohan Kapoor", "Meera Iyer"],
  Football: ["Arjun Mehta", "Sameer Khan"],
  Tennis: ["Diya Shah", "Neel Varma"],
  Volleyball: ["Ishaan Das", "Kavya Nair"],
};

const coachSpecialties = {
  Badminton: "Footwork, smash control, and match stamina",
  Basketball: "Shooting form, court movement, and defensive reads",
  Cricket: "Batting rhythm, bowling discipline, and match plans",
  Football: "First touch, finishing, and tactical conditioning",
  Tennis: "Serve technique, rally control, and recovery patterns",
  Volleyball: "Jump timing, receiving shape, and team rotations",
};

const timingOptions = [
  "Mon, Wed, Fri - 6:00 PM to 7:00 PM",
  "Tue, Thu, Sat - 7:00 AM to 8:00 AM",
  "Sat, Sun - 8:00 AM to 9:30 AM",
];

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function rupees(amount) {
  return `INR ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function createTransactionId() {
  return `COACH-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function revenueSplit(amount) {
  const platformFee = money(amount * PLATFORM_FEE_RATE);
  return {
    ownerRevenue: money(amount - platformFee),
    platformFee,
  };
}

function baseMonthlyFee(turf, sport, index) {
  const rates = turf.sportRates instanceof Map ? turf.sportRates : new Map(Object.entries(turf.sportRates || {}));
  const hourly = Number(rates.get(sport) || turf.pricePerHour || 1000);
  return Math.max(3500, Math.round((hourly * (6 + index * 1.5)) / 100) * 100);
}

function coachForSport(turf, sport, index = 0) {
  const names = coachNames[sport] || coachNames.Football;
  const monthlyFee = baseMonthlyFee(turf, sport, index);

  return {
    coachId: `${turf._id}:coach-${index + 1}`,
    coachName: names[index % names.length],
    experience: `${6 + index * 2}+ years`,
    monthlyFee,
    ownerId: turf.ownerId?._id || turf.ownerId,
    planName: index === 0 ? "Monthly Skills Plan" : "Monthly Elite Plan",
    sessionsPerMonth: index === 0 ? 12 : 16,
    sport,
    specialty: coachSpecialties[sport] || "Private coaching and match preparation",
    timings: [timingOptions[index % timingOptions.length], timingOptions[(index + 1) % timingOptions.length]],
    turf: {
      _id: turf._id,
      address: turf.address,
      area: turf.area,
      city: turf.city,
      name: turf.name,
      state: turf.state,
    },
    turfId: turf._id,
  };
}

function coachesForTurf(turf) {
  return (turf.sportsSupported || ["Football"]).slice(0, 2).map((sport, index) => coachForSport(turf, sport, index));
}

async function liveTurfQuery() {
  return Turf.find(publicVenueFilter())
    .populate("ownerId", "name businessName approvalStatus accountStatus role")
    .sort({ createdAt: -1 });
}

async function findCoach(coachId) {
  const turfId = String(coachId || "").split(":")[0];

  if (!/^[0-9a-fA-F]{24}$/.test(turfId)) return null;

  const turf = await Turf.findById(turfId).populate("ownerId", "name businessName approvalStatus accountStatus role");
  if (!turf || !isVenueLive(turf) || !isOwnerActive(turf.ownerId)) return null;

  return coachesForTurf(turf).find((coach) => coach.coachId === coachId) || null;
}

const coachRequestValidation = [
  body("coachId").trim().notEmpty().withMessage("Coach selection is required"),
  body("timing").trim().notEmpty().withMessage("Coach timing is required"),
  body("paymentMethod").optional().isIn(["UPI", "Card", "Cash", "Mock Payment"]).withMessage("Invalid payment method"),
  body("preferredStartDate").optional().isISO8601().withMessage("Valid start date is required"),
  body("notes").optional().trim().isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters"),
];

const coachStatusValidation = [
  param("id").isMongoId().withMessage("Valid coaching request id is required"),
  body("status").isIn(["approved", "rejected"]).withMessage("Status must be approved or rejected"),
  body("reason").optional().trim().isLength({ max: 500 }).withMessage("Reason cannot exceed 500 characters"),
];

const getCoaches = asyncHandler(async (req, res) => {
  const turfs = await liveTurfQuery();
  const coaches = turfs
    .filter((turf) => isOwnerActive(turf.ownerId))
    .flatMap(coachesForTurf);

  return successResponse(res, "Coaches fetched", { coaches });
});

const createCoachRequest = asyncHandler(async (req, res) => {
  const coach = await findCoach(req.body.coachId);

  if (!coach) {
    const error = new Error("Coach is not available for booking");
    error.statusCode = 404;
    throw error;
  }

  if (!coach.timings.includes(req.body.timing)) {
    const error = new Error("Selected timing is not available for this coach");
    error.statusCode = 400;
    throw error;
  }

  const existingPending = await CoachBooking.findOne({
    userId: req.user._id,
    coachId: coach.coachId,
    approvalStatus: { $in: ["pending", "approved"] },
    paymentStatus: "paid",
  });

  if (existingPending) {
    const error = new Error("You already have an active coaching request for this coach");
    error.statusCode = 409;
    throw error;
  }

  const split = revenueSplit(coach.monthlyFee);
  const coachRequest = await CoachBooking.create({
    userId: req.user._id,
    ownerId: coach.ownerId,
    turfId: coach.turfId,
    coachId: coach.coachId,
    coachName: coach.coachName,
    sport: coach.sport,
    planName: coach.planName,
    timing: req.body.timing,
    sessionsPerMonth: coach.sessionsPerMonth,
    monthlyFee: coach.monthlyFee,
    ...split,
    paymentMethod: req.body.paymentMethod || "Mock Payment",
    paymentStatus: "paid",
    approvalStatus: "pending",
    transactionId: createTransactionId(),
    preferredStartDate: req.body.preferredStartDate,
    paidAt: new Date(),
    notes: req.body.notes || "",
  });

  await Notification.create([
    {
      userId: req.user._id,
      title: "Coach payment successful",
      message: `${rupees(coach.monthlyFee)} paid for ${coach.coachName}. Waiting for turf owner approval.`,
      metadata: { coachRequestId: coachRequest._id, transactionId: coachRequest.transactionId },
      targetUrl: "/coaching/my",
      type: "coaching",
    },
    {
      userId: coach.ownerId,
      title: "Coach approval needed",
      message: `${req.user.name} paid for ${coach.coachName} at ${coach.turf.name}. Approve the monthly coaching request.`,
      metadata: { coachRequestId: coachRequest._id, transactionId: coachRequest.transactionId },
      targetUrl: "/owner/coaching",
      type: "coaching",
    },
  ]);

  const populated = await CoachBooking.findById(coachRequest._id)
    .populate("userId", "name email phone")
    .populate("ownerId", "name businessName email")
    .populate("turfId", "name area city state address sportsSupported images pricePerHour");

  return successResponse(res, "Coach payment successful. Waiting for turf owner approval.", { coachRequest: populated }, 201);
});

const getMyCoachRequests = asyncHandler(async (req, res) => {
  const coachRequests = await CoachBooking.find({ userId: req.user._id })
    .populate("ownerId", "name businessName email")
    .populate("turfId", "name area city state address sportsSupported images pricePerHour")
    .sort({ createdAt: -1 });

  return successResponse(res, "Coach requests fetched", { coachRequests });
});

const getOwnerCoachRequests = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { ownerId: req.user._id };
  const coachRequests = await CoachBooking.find(filter)
    .populate("userId", "name email phone")
    .populate("ownerId", "name businessName email")
    .populate("turfId", "name area city state address sportsSupported images pricePerHour")
    .sort({ createdAt: -1 });

  return successResponse(res, "Owner coach requests fetched", { coachRequests });
});

const updateCoachRequestStatus = asyncHandler(async (req, res) => {
  const coachRequest = await CoachBooking.findById(req.params.id)
    .populate("userId", "name email")
    .populate("turfId", "name area city state address")
    .populate("ownerId", "name businessName email approvalStatus accountStatus role");

  if (!coachRequest) {
    const error = new Error("Coach request not found");
    error.statusCode = 404;
    throw error;
  }

  if (req.user.role !== "admin" && String(coachRequest.ownerId?._id || coachRequest.ownerId) !== String(req.user._id)) {
    const error = new Error("You cannot manage this coaching request");
    error.statusCode = 403;
    throw error;
  }

  if (req.user.role === "owner" && !isOwnerActive(req.user)) {
    const error = new Error("Your account is pending approval from Platform Owner.");
    error.statusCode = 403;
    throw error;
  }

  coachRequest.approvalStatus = req.body.status;
  coachRequest.approvedAt = req.body.status === "approved" ? new Date() : undefined;
  coachRequest.approvedBy = req.user._id;
  coachRequest.rejectionReason = req.body.status === "rejected" ? req.body.reason || "Not approved by turf owner" : "";
  await coachRequest.save();

  await Notification.create({
    userId: coachRequest.userId._id || coachRequest.userId,
    title: req.body.status === "approved" ? "Coach request approved" : "Coach request rejected",
    message:
      req.body.status === "approved"
        ? `${coachRequest.coachName} is approved at ${coachRequest.turfId.name}. Your ${coachRequest.timing} coaching plan is active.`
        : `${coachRequest.coachName} at ${coachRequest.turfId.name} was rejected. ${coachRequest.rejectionReason}`,
    metadata: { coachRequestId: coachRequest._id, transactionId: coachRequest.transactionId },
    targetUrl: "/coaching/my",
    type: "coaching",
  });

  return successResponse(res, "Coach request updated", { coachRequest });
});

module.exports = {
  coachRequestValidation,
  coachStatusValidation,
  createCoachRequest,
  getCoaches,
  getMyCoachRequests,
  getOwnerCoachRequests,
  updateCoachRequestStatus,
};
