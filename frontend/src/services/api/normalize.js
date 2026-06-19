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

function normalizeVenueStatus(value, fallback = "PENDING") {
  const normalized = String(value || "").trim();
  const upper = normalized.toUpperCase();
  const lower = normalized.toLowerCase();

  if (["DRAFT", "PENDING", "LIVE", "REJECTED", "SUSPENDED"].includes(upper)) return upper;
  if (lower === "active" || lower === "approved" || lower === "published" || lower === "available") return "LIVE";
  if (lower === "review" || lower === "pending") return "PENDING";
  if (lower === "rejected") return "REJECTED";
  if (lower === "suspended") return "SUSPENDED";

  return fallback;
}

function venueStatusLabel(value) {
  const labels = {
    DRAFT: "Draft",
    LIVE: "Live",
    PENDING: "Pending Approval",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };

  return labels[normalizeVenueStatus(value)] || labels.PENDING;
}

export function normalizeTurf(turf = {}) {
  const images = turf.images?.length ? turf.images : turf.gallery?.length ? turf.gallery : [assetImages.stadium];
  const sports = turf.sportsSupported?.length
    ? turf.sportsSupported
    : turf.sport
      ? [turf.sport]
      : [];
  const rawSportRates = turf.sportRates || turf.pricing?.sportsHourly || {};
  const sportRates = Object.fromEntries(
    sports.map((sport) => [
      sport,
      Number(rawSportRates[sport] ?? turf.pricePerHour ?? turf.price ?? turf.pricing?.baseHourly?.amount ?? 0),
    ]),
  );
  const venueStatus = normalizeVenueStatus(
    turf.status || turf.moderationStatus || (turf.isApproved ? "LIVE" : "PENDING"),
  );
  const approved = venueStatus === "LIVE";
  const primarySport = sports[0] || "";
  const primaryPrice = Number(sportRates[primarySport] ?? turf.pricePerHour ?? turf.price ?? turf.pricing?.baseHourly?.amount ?? 0);

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
    price: primaryPrice,
    rating: Number(turf.rating || 0),
    reviews: Number(turf.totalReviews ?? turf.reviews ?? 0),
    sport: primarySport,
    sportRates,
    sportsSupported: sports,
    isLive: approved,
    status: venueStatusLabel(venueStatus),
    statusValue: venueStatus,
  };
}

const demoSportImages = {
  Badminton: assetImages.indoor,
  Basketball: assetImages.basketball,
  Cricket: assetImages.cricket,
  Football: assetImages.football,
  Tennis: assetImages.tennis,
  Volleyball: assetImages.stadium,
};

const demoAvailabilitySlots = [
  { endTime: "18:00", reason: "Available", startTime: "17:00", status: "available" },
  { endTime: "19:00", reason: "Available", startTime: "18:00", status: "available" },
  { endTime: "20:00", reason: "Available", startTime: "19:00", status: "available" },
  { endTime: "21:00", reason: "Available", startTime: "20:00", status: "available" },
  { endTime: "22:00", reason: "Available", startTime: "21:00", status: "available" },
  { endTime: "23:00", reason: "Available", startTime: "22:00", status: "available" },
];

function compactObject(values = {}) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

export function createDemoTurf(overrides = {}) {
  const sport = overrides.sport || overrides.sportsSupported?.[0] || "Football";
  const image = demoSportImages[sport] || assetImages.football;
  const images = overrides.images || overrides.gallery || [image, assetImages.stadium, assetImages.training];

  return normalizeTurf({
    _id: "demo-venue",
    id: "demo-venue",
    name: "TURFX Demo Arena",
    slug: "turfx-demo-arena",
    description: "Prototype-ready sports arena with premium turf, live slots, member pricing, and demo booking data.",
    location: "Bangalore",
    address: "TURFX Demo District",
    city: "Bangalore",
    state: "Karnataka",
    sportsSupported: [sport],
    sportRates: { [sport]: Number(overrides.pricePerHour || overrides.price || 1200) },
    amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area", "Digital Check-in"],
    pricePerHour: 1200,
    rating: 4.8,
    totalReviews: 24,
    images,
    gallery: images,
    status: "LIVE",
    moderationStatus: "approved",
    isApproved: true,
    isDemo: true,
    ...compactObject(overrides),
  });
}

export function createDemoAvailability(date = "") {
  return {
    date,
    rules: {
      minimumBookingMinutes: 60,
      slotMinutes: 60,
      startIntervalMinutes: 30,
      weeklyAvailability: {
        monday: ["06:00-23:00"],
        tuesday: ["06:00-23:00"],
        wednesday: ["06:00-23:00"],
        thursday: ["06:00-23:00"],
        friday: ["06:00-23:00"],
        saturday: ["06:00-23:00"],
        sunday: ["06:00-23:00"],
      },
    },
    slotMinutes: 60,
    slots: demoAvailabilitySlots,
    timeline: demoAvailabilitySlots,
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
  const duration = Number(booking.hoursBooked ?? booking.duration ?? 0);

  return {
    ...booking,
    id: identifier(booking),
    bookingReference: `BK-${identifier(booking).slice(-8).toUpperCase()}`,
    date: dateLabel(booking.bookingDate || booking.date),
    dateValue: booking.bookingDate || booking.date,
    format: turf.format,
    image: turf.image,
    location: turf.location || turf.city,
    duration,
    paid: Number(booking.totalAmount ?? booking.total?.amount ?? 0),
    sport: booking.sport || turf.sport,
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
