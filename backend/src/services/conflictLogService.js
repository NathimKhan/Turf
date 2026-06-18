const BookingConflictLog = require("../models/BookingConflictLog");

async function recordBookingConflict({
  bookingDate,
  endTime,
  reason,
  source = "booking",
  startTime,
  status = "unavailable",
  turfId,
  userId,
}) {
  try {
    await BookingConflictLog.create({
      bookingDate,
      reason,
      slotEndTime: endTime,
      slotStartTime: startTime,
      source,
      status,
      turfId,
      userId,
    });
  } catch {
    // Conflict logging must never block the booking or availability response.
  }
}

module.exports = {
  recordBookingConflict,
};
