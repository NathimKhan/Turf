const { body, param } = require("express-validator");
const Event = require("../models/Event");
const { asyncHandler, successResponse } = require("../utils/responseHandler");

function canManage(user, event) {
  return user.role === "admin" || String(event.createdBy) === String(user._id);
}

const eventValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("eventDate").isISO8601().withMessage("Valid event date is required"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("entryFee").optional().isFloat({ min: 0 }).withMessage("Entry fee must be positive"),
  body("maxParticipants").isInt({ min: 1 }).withMessage("Maximum participants must be at least 1"),
];

const createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({
    title: req.body.title,
    description: req.body.description,
    eventDate: req.body.eventDate,
    location: req.body.location,
    entryFee: req.body.entryFee || 0,
    maxParticipants: req.body.maxParticipants,
    currentParticipants: req.body.currentParticipants || 0,
    createdBy: req.user._id,
  });

  return successResponse(res, "Event created", { event }, 201);
});

const getEvents = asyncHandler(async (req, res) => {
  const events = await Event.find()
    .populate("createdBy", "name email role")
    .sort({ eventDate: 1 });

  return successResponse(res, "Events fetched", { events });
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate("createdBy", "name email role");

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(res, "Event fetched", { event });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManage(req.user, event)) {
    const error = new Error("You cannot update this event");
    error.statusCode = 403;
    throw error;
  }

  const fields = ["title", "description", "eventDate", "location", "entryFee", "maxParticipants", "currentParticipants"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  });

  await event.save();

  return successResponse(res, "Event updated", { event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (!canManage(req.user, event)) {
    const error = new Error("You cannot delete this event");
    error.statusCode = 403;
    throw error;
  }

  await event.deleteOne();

  return successResponse(res, "Event deleted");
});

module.exports = {
  createEvent,
  deleteEvent,
  eventValidation,
  getEventById,
  getEvents,
  updateEvent,
};
