import { assetImages } from "../../data/turfxData.js";

function identifier(value) {
  return String(value?._id || value?.id || "");
}

function titleCase(value = "") {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function normalizeTurf(turf = {}) {
  const images = turf.images?.length ? turf.images : turf.gallery?.length ? turf.gallery : [assetImages.stadium];
  const sports = turf.sportsSupported?.length
    ? turf.sportsSupported
    : turf.sport
      ? [turf.sport]
      : [];
  const approved = turf.isApproved || turf.status === "published";

  return {
    ...turf,
    id: identifier(turf),
    amenities: turf.amenities || [],
    city: turf.city || turf.locationDetails?.city || "",
    distance: turf.city || "TURFX venue",
    format: sports.join(", ") || "Sports venue",
    gallery: images,
    image: images[0],
    location: turf.location || turf.address || turf.locationDetails?.address || "",
    price: Number(turf.pricePerHour ?? turf.price ?? turf.pricing?.baseHourly?.amount ?? 0),
    rating: Number(turf.rating || 0),
    reviews: Number(turf.totalReviews ?? turf.reviews ?? 0),
    sport: sports[0] || "",
    sportsSupported: sports,
    status: approved ? "Available" : titleCase(turf.moderationStatus || turf.status || "pending"),
  };
}

export function normalizeBooking(booking = {}) {
  const turf = normalizeTurf(booking.turfId || {});
  const user = booking.userId || {};
  const status = booking.status || booking.bookingStatus || "pending";
  const initials = user.name
    ? user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const startTime = booking.slotStartTime || String(booking.slot || "").split("-")[0] || "";
  const endTime = booking.slotEndTime || String(booking.slot || "").split("-")[1] || "";

  return {
    ...booking,
    id: identifier(booking),
    bookingReference: `BK-${identifier(booking).slice(-8).toUpperCase()}`,
    date: dateLabel(booking.bookingDate || booking.date),
    dateValue: booking.bookingDate || booking.date,
    format: turf.format,
    image: turf.image,
    location: turf.location || turf.city,
    paid: Number(booking.totalAmount ?? booking.total?.amount ?? 0),
    status: titleCase(status),
    statusValue: String(status).toLowerCase(),
    team: [initials],
    time: endTime ? `${startTime} - ${endTime}` : startTime,
    turf,
    user,
    userId: identifier(user) || identifier(booking.userId),
    venueId: turf.id || identifier(booking.turfId),
    venue: turf.name || "TURFX Venue",
  };
}

export function normalizeNotification(notification = {}) {
  return {
    ...notification,
    id: identifier(notification),
    body: notification.message || "",
    status: notification.isRead ? "info" : "success",
    targetUrl: notification.targetUrl || "",
    time: dateLabel(notification.createdAt),
    type: notification.type || "system",
  };
}

export function normalizePayment(payment = {}) {
  const booking = payment.bookingId || {};
  const turf = normalizeTurf(payment.venueId || booking.turfId || {});
  const owner = payment.ownerId || booking.turfId?.ownerId || {};
  const customer = payment.userId || booking.userId || {};

  return {
    ...payment,
    id: identifier(payment),
    amount: Number(payment.amount || 0),
    booking,
    bookingIdValue: identifier(booking),
    bookingReference: booking._id ? `BK-${identifier(booking).slice(-8).toUpperCase()}` : "",
    customer,
    customerName: customer.name || customer.email || "Customer",
    date: dateLabel(payment.paidAt || payment.createdAt),
    owner,
    ownerName: owner.businessName || owner.name || "TURFX Venue Manager",
    ownerRevenue: Number(payment.ownerRevenue || 0),
    paymentId: payment.paymentId || payment.transactionId || identifier(payment),
    platformFee: Number(payment.platformFee || 0),
    status: payment.paymentStatus || payment.status || "pending",
    time: booking.slotStartTime && booking.slotEndTime ? `${booking.slotStartTime} - ${booking.slotEndTime}` : "",
    turf,
    venue: turf.name || booking.turfId?.name || "TURFX Venue",
  };
}

export function normalizeEvent(event = {}) {
  return {
    ...event,
    id: identifier(event),
    capacity: `${event.currentParticipants || 0} / ${event.maxParticipants || 0} registered`,
    date: dateLabel(event.eventDate),
    image: event.image || assetImages.event,
    price: Number(event.entryFee || 0),
    type: "Event",
    venue: event.location || "",
  };
}

export function normalizeTournament(tournament = {}) {
  return {
    ...tournament,
    id: identifier(tournament),
    date: dateLabel(tournament.startDate),
    prize: tournament.prizePool ? `INR ${Number(tournament.prizePool).toLocaleString()}` : "",
    status: new Date(tournament.startDate) > new Date() ? "Registration Open" : "In Progress",
    teams: tournament.participants?.length || 0,
  };
}
