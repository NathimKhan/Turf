const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_START_INTERVAL_MINUTES = 30;
const MINIMUM_BOOKING_MINUTES = 60;

function normalizeDate(input) {
  const date =
    typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? new Date(`${input}T00:00:00.000Z`)
      : new Date(input);

  if (Number.isNaN(date.getTime())) {
    const error = new Error("Valid booking date is required");
    error.statusCode = 400;
    throw error;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isValidTime(time) {
  return TIME_PATTERN.test(String(time || ""));
}

function minutes(time) {
  const [hours, mins] = String(time).split(":").map(Number);
  return hours * 60 + mins;
}

function formatTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 24 * 60));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function parseRange(range) {
  const [rangeStart, rangeEnd] = String(range || "").split("-");

  if (!isValidTime(rangeStart) || !isValidTime(rangeEnd)) return null;

  const start = minutes(rangeStart);
  const end = minutes(rangeEnd);

  if (end <= start) return null;

  return {
    end,
    endTime: rangeEnd,
    start,
    startTime: rangeStart,
  };
}

function calculateHours(startTime, endTime) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    const error = new Error("Slot times must use HH:mm format");
    error.statusCode = 400;
    throw error;
  }

  const diff = minutes(endTime) - minutes(startTime);

  if (diff <= 0) {
    const error = new Error("Slot end time must be after slot start time");
    error.statusCode = 400;
    throw error;
  }

  return diff / 60;
}

function calculateDurationMinutes(startTime, endTime) {
  return calculateHours(startTime, endTime) * 60;
}

function isSameUtcDate(date, compareDate) {
  return (
    date.getUTCFullYear() === compareDate.getUTCFullYear() &&
    date.getUTCMonth() === compareDate.getUTCMonth() &&
    date.getUTCDate() === compareDate.getUTCDate()
  );
}

function blackoutEntries(turf) {
  const legacyDates = turf.schedule?.blackoutDates || [];
  const detailedBlackouts = turf.schedule?.blackouts || [];
  const entries = [];

  detailedBlackouts.forEach((blackout) => {
    const rawDate = blackout?.date || blackout;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    entries.push({
      date,
      reason: blackout?.reason || "Blackout",
    });
  });

  legacyDates.forEach((blackoutDate) => {
    const date = new Date(blackoutDate);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    if (!entries.some((entry) => entry.date.toISOString().slice(0, 10) === key)) {
      entries.push({ date, reason: "Blackout" });
    }
  });

  return entries.sort((first, second) => first.date - second.date);
}

function getBlackoutForDate(turf, bookingDate) {
  return blackoutEntries(turf).find((blackout) => isSameUtcDate(blackout.date, bookingDate)) || null;
}

function isBlackoutDate(turf, bookingDate) {
  return Boolean(getBlackoutForDate(turf, bookingDate));
}

function scheduleRangesForDate(turf, bookingDate, options = {}) {
  if (!options.includeBlackouts && isBlackoutDate(turf, bookingDate)) return [];

  return turf.schedule?.weeklyAvailability?.[DAY_KEYS[bookingDate.getUTCDay()]] || [];
}

function isSlotAvailableInSchedule(turf, bookingDate, startTime, endTime) {
  const start = minutes(startTime);
  const end = minutes(endTime);

  return scheduleRangesForDate(turf, bookingDate).some((range) => {
    const parsedRange = parseRange(range);
    return parsedRange && start >= parsedRange.start && end <= parsedRange.end;
  });
}

function getBufferMinutes(turf) {
  return Number(turf.schedule?.bufferMinutes || 0);
}

function getSlotMinutes(turf) {
  return Number(turf.schedule?.slotMinutes || 60);
}

function getStartIntervalMinutes(turf) {
  const interval = Number(turf.schedule?.startIntervalMinutes || DEFAULT_START_INTERVAL_MINUTES);
  return interval > 0 ? interval : DEFAULT_START_INTERVAL_MINUTES;
}

function getMinimumBookingMinutes(turf) {
  const minimum = Number(turf.schedule?.minimumBookingMinutes || MINIMUM_BOOKING_MINUTES);
  return Math.max(minimum, MINIMUM_BOOKING_MINUTES);
}

function mapToObject(value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value.toObject === "function") return value.toObject();
  return value;
}

function configuredSportsForTurf(turf) {
  return (turf.sportsSupported || []).filter(Boolean);
}

function sportRateForTurf(turf, sport) {
  const rates = mapToObject(turf.sportRates);
  const selectedSport = sport || configuredSportsForTurf(turf)[0] || "";
  return Number(rates?.[selectedSport] ?? turf.pricePerHour ?? 0);
}

function overlaps(startTime, endTime, compareStartTime, compareEndTime) {
  return minutes(startTime) < minutes(compareEndTime) && minutes(endTime) > minutes(compareStartTime);
}

function expandedBookingWindow(booking, bufferMinutes) {
  return {
    endTime: formatTime(minutes(booking.slotEndTime) + bufferMinutes),
    startTime: formatTime(minutes(booking.slotStartTime) - bufferMinutes),
  };
}

function findBookingConflict(bookings, startTime, endTime, bufferMinutes) {
  const bookingOverlap = bookings.find((booking) =>
    overlaps(startTime, endTime, booking.slotStartTime, booking.slotEndTime),
  );

  if (bookingOverlap) {
    return {
      message: "This time overlaps with another booking.",
      status: "booked",
      statusCode: 409,
    };
  }

  const bufferOverlap = bookings.find((booking) => {
    const bufferWindow = expandedBookingWindow(booking, bufferMinutes);
    return overlaps(startTime, endTime, bufferWindow.startTime, bufferWindow.endTime);
  });

  if (bufferOverlap) {
    return {
      message: "This time is blocked by the venue buffer.",
      status: "blocked",
      statusCode: 409,
    };
  }

  return null;
}

function uniqueSlots(slots) {
  const seen = new Set();
  return slots
    .filter((slot) => {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((first, second) => minutes(first.startTime) - minutes(second.startTime));
}

function generateScheduledSlots(turf, bookingDate, bookings = [], options = {}) {
  const slotMinutes = Number(options.durationMinutes || getSlotMinutes(turf) || getMinimumBookingMinutes(turf));
  const startIntervalMinutes = Number(options.startIntervalMinutes || getStartIntervalMinutes(turf));
  const bufferMinutes = getBufferMinutes(turf);
  const slots = [];

  scheduleRangesForDate(turf, bookingDate, options).forEach((range) => {
    const parsedRange = parseRange(range);
    if (!parsedRange) return;

    const { end, start } = parsedRange;

    for (let cursor = start; cursor + slotMinutes <= end; cursor += startIntervalMinutes) {
      slots.push({
        startTime: formatTime(cursor),
        endTime: formatTime(cursor + slotMinutes),
      });
    }

    bookings.forEach((booking) => {
      if (isSlotAvailableInSchedule(turf, bookingDate, booking.slotStartTime, booking.slotEndTime)) {
        slots.push({
          endTime: booking.slotEndTime,
          startTime: booking.slotStartTime,
        });
      }

      const cursor = minutes(booking.slotEndTime) + bufferMinutes;
      if (cursor >= start && cursor + slotMinutes <= end) {
        slots.push({
          startTime: formatTime(cursor),
          endTime: formatTime(cursor + slotMinutes),
        });
      }
    });
  });

  return uniqueSlots(slots);
}

function classifySlot(slot, bookings = [], bufferMinutes = 0, blockedReason = "") {
  if (blockedReason) {
    return {
      status: /maintenance/i.test(blockedReason) ? "maintenance" : "blocked",
      reason: blockedReason,
    };
  }

  const booked = bookings.find((booking) =>
    overlaps(slot.startTime, slot.endTime, booking.slotStartTime, booking.slotEndTime),
  );
  if (booked) {
    const pendingPayment = booked.bookingStatus === "pending" || booked.paymentStatus === "pending";
    return {
      status: pendingPayment ? "pending" : "booked",
      reason: pendingPayment ? "Pending Payment" : "Booked",
    };
  }

  const buffered = bookings.find((booking) => {
    const window = expandedBookingWindow(booking, bufferMinutes);
    return overlaps(slot.startTime, slot.endTime, window.startTime, window.endTime);
  });
  if (buffered) return { status: "blocked", reason: "Buffer" };

  return { status: "available", reason: "Available" };
}

function buildAvailabilityTimeline(turf, bookingDate, bookings = []) {
  const bufferMinutes = getBufferMinutes(turf);
  const blackout = getBlackoutForDate(turf, bookingDate);
  return generateScheduledSlots(turf, bookingDate, bookings, { includeBlackouts: Boolean(blackout) }).map((slot) => ({
    ...slot,
    ...classifySlot(slot, bookings, bufferMinutes, blackout?.reason || ""),
  }));
}

function buildSlotKey(turfId, bookingDate, startTime, endTime) {
  return `${turfId}:${bookingDate.toISOString().slice(0, 10)}:${startTime}:${endTime}`;
}

function buildOccupancyKeys(turfId, bookingDate, startTime, endTime, bufferMinutes = 0) {
  const dateKey = bookingDate.toISOString().slice(0, 10);
  const start = minutes(startTime);
  const end = Math.min(minutes(endTime) + Number(bufferMinutes || 0), 24 * 60);
  const keys = [];

  for (let minute = start; minute < end; minute += 1) {
    keys.push(`${turfId}:${dateKey}:${minute}`);
  }

  return keys;
}

function validateSlotRequest(turf, bookingDate, startTime, endTime, bookings = []) {
  const durationMinutes = calculateDurationMinutes(startTime, endTime);
  const minimumBookingMinutes = getMinimumBookingMinutes(turf);
  const blackout = getBlackoutForDate(turf, bookingDate);

  if (blackout) {
    return {
      available: false,
      message: blackout.reason === "Blackout" ? "This slot is blocked." : `This slot is blocked: ${blackout.reason}.`,
      status: "blocked",
      statusCode: 409,
    };
  }

  if (durationMinutes < minimumBookingMinutes) {
    return {
      available: false,
      message: "Minimum booking duration is 1 hour",
      status: "invalid_duration",
      statusCode: 400,
    };
  }

  if (!isSlotAvailableInSchedule(turf, bookingDate, startTime, endTime)) {
    return {
      available: false,
      message: "Venue is closed during this period.",
      status: "closed",
      statusCode: 409,
    };
  }

  const conflict = findBookingConflict(bookings, startTime, endTime, getBufferMinutes(turf));
  if (conflict) {
    return {
      available: false,
      ...conflict,
    };
  }

  return {
    available: true,
    message: "Slot is available.",
    status: "available",
    statusCode: 200,
  };
}

module.exports = {
  blackoutEntries,
  buildAvailabilityTimeline,
  buildOccupancyKeys,
  buildSlotKey,
  calculateHours,
  calculateDurationMinutes,
  expandedBookingWindow,
  findBookingConflict,
  generateScheduledSlots,
  getBlackoutForDate,
  getBufferMinutes,
  getMinimumBookingMinutes,
  getStartIntervalMinutes,
  getSlotMinutes,
  isBlackoutDate,
  isSlotAvailableInSchedule,
  isValidTime,
  minutes,
  normalizeDate,
  overlaps,
  scheduleRangesForDate,
  sportRateForTurf,
  configuredSportsForTurf,
  validateSlotRequest,
};
