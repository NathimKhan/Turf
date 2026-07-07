const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "checked_in", "upcoming", "ongoing"];
const PAID_BOOKING_PAYMENT_STATUSES = ["paid", "partially_refunded"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateOnlyFromLocalDate(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function bookingDateKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function timeToMinutes(time = "") {
  const [hours, minutes] = String(time).split(":").map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function localTimeToMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(Number(totalMinutes) || 0, 24 * 60));
  return `${pad(Math.floor(safeMinutes / 60))}:${pad(safeMinutes % 60)}`;
}

function currentTimeKey(date = new Date()) {
  return formatTime(localTimeToMinutes(date));
}

function hasBookingStarted(booking, now = new Date()) {
  const bookingKey = bookingDateKey(booking.bookingDate || booking.date);
  const nowKey = localDateKey(now);

  if (!bookingKey) return false;
  if (bookingKey < nowKey) return true;
  if (bookingKey > nowKey) return false;

  return timeToMinutes(booking.slotStartTime || booking.startTime) <= localTimeToMinutes(now);
}

function hasBookingEnded(booking, now = new Date()) {
  const bookingKey = bookingDateKey(booking.bookingDate || booking.date);
  const nowKey = localDateKey(now);

  if (!bookingKey) return false;
  if (bookingKey < nowKey) return true;
  if (bookingKey > nowKey) return false;

  return timeToMinutes(booking.slotEndTime || booking.endTime) <= localTimeToMinutes(now);
}

function isBookingOngoing(booking, now = new Date()) {
  return hasBookingStarted(booking, now) && !hasBookingEnded(booking, now);
}

function getBookingLifecycleStatus(booking, now = new Date()) {
  const storedStatus = String(booking.bookingStatus || booking.status || "pending").toLowerCase();

  if (storedStatus === "cancelled" || storedStatus === "completed") return storedStatus;
  if (!ACTIVE_BOOKING_STATUSES.includes(storedStatus)) return storedStatus;
  if (!PAID_BOOKING_PAYMENT_STATUSES.includes(booking.paymentStatus)) {
    return ["upcoming", "ongoing"].includes(storedStatus) ? "pending" : storedStatus;
  }
  if (hasBookingEnded(booking, now)) return "completed";
  if (isBookingOngoing(booking, now)) return "ongoing";

  return "upcoming";
}

function expiredBookingsFilter(now = new Date(), paymentStatuses = PAID_BOOKING_PAYMENT_STATUSES) {
  const today = dateOnlyFromLocalDate(now);
  return {
    bookingStatus: { $in: ACTIVE_BOOKING_STATUSES },
    paymentStatus: { $in: paymentStatuses },
    $or: [
      { bookingDate: { $lt: today } },
      {
        bookingDate: today,
        slotEndTime: { $lte: currentTimeKey(now) },
      },
    ],
  };
}

function expiredPaidBookingsFilter(now = new Date()) {
  return expiredBookingsFilter(now, PAID_BOOKING_PAYMENT_STATUSES);
}

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  PAID_BOOKING_PAYMENT_STATUSES,
  bookingDateKey,
  currentTimeKey,
  dateOnlyFromLocalDate,
  expiredBookingsFilter,
  expiredPaidBookingsFilter,
  getBookingLifecycleStatus,
  hasBookingEnded,
  hasBookingStarted,
  isBookingOngoing,
  localDateKey,
  timeToMinutes,
};
