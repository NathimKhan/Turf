import { assetImages } from "../../data/turfxData.js";

function identifier(value) {
  if (typeof value === "string") return value;
  return String(value?._id || value?.id || "");
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function generatedMediaPayload(value = "") {
  const match = cleanString(value).match(/\/api\/turfs\/generated-media\/([^/?#]+)\.svg/);
  if (!match) return null;

  try {
    const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const payload = JSON.parse(decoded);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function normalizeImageUrl(value) {
  const clean = cleanString(value);
  if (!clean) return "";

  const payload = generatedMediaPayload(clean);
  if (payload) {
    return generatedSvgDataUrl({
      city: payload.city,
      field: payload.field,
      identity: payload.identity,
      index: payload.index,
      label: payload.label,
      name: payload.name,
      sport: payload.sport,
    });
  }

  return clean;
}

function uniqueImages(values = []) {
  const seen = new Set();
  return values.flat().map(normalizeImageUrl).filter(Boolean).filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function stableHash(value = "") {
  let hash = 2166136261;
  const text = String(value);

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generatedSvgDataUrl({ city, field, identity, index, label, name, sport }) {
  const venueName = cleanString(name) || "TURFX Venue";
  const venueCity = cleanString(city) || "Sports City";
  const venueSport = cleanString(sport) || "Turf";
  const imageLabel = cleanString(label) || "Venue view";
  const imageIndex = Number(index) || 0;
  const imageField = cleanString(field) || "gallery";
  const seed = `${cleanString(identity) || `${venueName}:${venueCity}:${venueSport}`}:${imageField}:${imageLabel}:${imageIndex}`;
  const hash = stableHash(seed);
  const hue = hash % 360;
  const accent = (hue + 118) % 360;
  const warm = (hue + 42) % 360;
  const xOffset = 120 + (hash % 180);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${escapeXml(name)} ${escapeXml(label)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 44% 18%)"/>
      <stop offset="0.58" stop-color="hsl(${warm} 68% 34%)"/>
      <stop offset="1" stop-color="hsl(${accent} 76% 48%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="76%" cy="18%" r="42%">
      <stop offset="0" stop-color="white" stop-opacity="0.78"/>
      <stop offset="0.42" stop-color="hsl(${accent} 88% 62%)" stop-opacity="0.36"/>
      <stop offset="1" stop-color="hsl(${accent} 88% 62%)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sky)"/>
  <rect width="1200" height="800" fill="url(#glow)"/>
  <path d="M0 545 C240 485 390 500 610 535 C820 568 1000 540 1200 488 L1200 800 L0 800 Z" fill="rgba(5, 12, 26, 0.54)"/>
  <path d="M96 660 L1104 660 L965 452 L235 452 Z" fill="rgba(13, 148, 136, 0.38)" stroke="rgba(255,255,255,0.76)" stroke-width="7"/>
  <path d="M235 452 L600 660 L965 452" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="5"/>
  <path d="M600 452 L600 660" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="5"/>
  <circle cx="600" cy="558" r="54" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="5"/>
  <rect x="${xOffset}" y="156" width="88" height="214" rx="12" fill="rgba(255,255,255,0.2)"/>
  <rect x="${940 - (hash % 140)}" y="126" width="88" height="244" rx="12" fill="rgba(255,255,255,0.17)"/>
  <text x="78" y="112" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800">${escapeXml(imageLabel)}</text>
  <text x="78" y="172" fill="rgba(255,255,255,0.86)" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${escapeXml(venueName)}</text>
  <text x="78" y="218" fill="rgba(255,255,255,0.72)" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700">${escapeXml(venueSport)} - ${escapeXml(venueCity)}</text>
  <text x="78" y="738" fill="rgba(255,255,255,0.68)" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">TURFX verified venue media</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function generatedTurfImage(turf = {}, label, index, field) {
  const name = cleanString(turf.name) || "TURFX Venue";
  const city = cleanString(turf.city || turf.area || turf.location) || "Sports City";
  const sport = turf.sportsSupported?.[0] || turf.sport || "Turf";
  return generatedSvgDataUrl({
    city,
    field,
    identity: `${identifier(turf)}:${name}:${city}:${sport}`,
    index,
    label,
    name,
    sport,
  });
}

function generatedTurfImages(turf = {}) {
  const sports = turf.sportsSupported?.length ? turf.sportsSupported : turf.sport ? [turf.sport] : ["Turf"];
  const sportsLabels = sports.flatMap((sport) => [`${sport} play area`, `${sport} equipment`]);
  return {
    heroImage: generatedTurfImage(turf, "Hero venue view", 0, "heroImage"),
    coverImage: generatedTurfImage(turf, "Cover venue view", 0, "coverImage"),
    profileImage: generatedTurfImage(turf, "Venue profile", 0, "profileImage"),
    thumbnail: generatedTurfImage(turf, "Venue thumbnail", 0, "thumbnail"),
    videoThumbnail: generatedTurfImage(turf, "360 tour preview", 0, "videoThumbnail"),
    gallery: [
      "Hero turf view",
      "Day match angle",
      "Night lights",
      "Entrance view",
      "Player area",
      "Premium surface",
      "Seating side",
      "Scoreboard view",
    ].map((label, index) => generatedTurfImage(turf, label, index, "gallery")),
    groundImages: ["Main ground", "Day surface", "Night flood lights", "Scoreboard angle"]
      .map((label, index) => generatedTurfImage(turf, label, index, "groundImages")),
    amenityImages: ["Entrance", "Parking", "Washroom", "Cafeteria", "Changing room", "Seating area", "Sports equipment", "Drinking water"]
      .map((label, index) => generatedTurfImage(turf, label, index, "amenityImages")),
    locationImages: ["Venue entrance", "Parking access", "Nearby area", "Map preview"]
      .map((label, index) => generatedTurfImage(turf, label, index, "locationImages")),
    sportsImages: sportsLabels.map((label, index) => generatedTurfImage(turf, label, index, "sportsImages")),
  };
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

function coordinatePair(turf = {}) {
  const coordinates = turf.geoLocation?.coordinates ||
    turf.locationDetails?.coordinates ||
    (typeof turf.location === "object" ? turf.location?.coordinates : null);
  if (!Array.isArray(coordinates) || coordinates.length < 2) return {};

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

function distanceLabel(value, fallback) {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance <= 0) return fallback;
  return `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km`;
}

function normalizeVenueStatus(value, fallback = "PENDING") {
  const normalized = String(value || "").trim();
  const upper = normalized.toUpperCase();
  const lower = normalized.toLowerCase();

  if (["DRAFT", "PENDING", "ACTIVE", "LIVE", "REJECTED", "SUSPENDED", "ARCHIVED", "EXPIRED", "NEED_CHANGES"].includes(upper)) return upper;
  if (lower === "active" || lower === "approved" || lower === "published" || lower === "available") return "ACTIVE";
  if (lower === "review" || lower === "pending") return "PENDING";
  if (lower === "changes" || lower === "need_changes" || lower === "needs_changes" || lower === "changes_requested") return "NEED_CHANGES";
  if (lower === "rejected") return "REJECTED";
  if (lower === "suspended") return "SUSPENDED";
  if (lower === "archived") return "ARCHIVED";
  if (lower === "expired") return "EXPIRED";

  return fallback;
}

function venueStatusLabel(value) {
  const labels = {
    DRAFT: "Draft",
    ACTIVE: "Active",
    LIVE: "Live",
    PENDING: "Pending Approval",
    NEED_CHANGES: "Needs Changes",
    REJECTED: "Rejected",
    ARCHIVED: "Archived",
    EXPIRED: "Expired",
    SUSPENDED: "Suspended",
  };

  return labels[normalizeVenueStatus(value)] || labels.PENDING;
}

export function normalizeTurf(turf = {}) {
  const generatedImages = generatedTurfImages(turf);
  const heroImage = normalizeImageUrl(turf.heroImage) || generatedImages.heroImage;
  const coverImage = normalizeImageUrl(turf.coverImage) || generatedImages.coverImage;
  const profileImage = normalizeImageUrl(turf.profileImage) || generatedImages.profileImage;
  const thumbnail = normalizeImageUrl(turf.thumbnail) || heroImage || generatedImages.thumbnail;
  const videoThumbnail = normalizeImageUrl(turf.videoThumbnail) || generatedImages.videoThumbnail;
  const groundImages = uniqueImages([turf.groundImages || [], generatedImages.groundImages]).slice(0, 8);
  const amenityImages = uniqueImages([turf.amenityImages || [], generatedImages.amenityImages]).slice(0, 12);
  const locationImages = uniqueImages([turf.locationImages || [], generatedImages.locationImages]).slice(0, 8);
  const sportsImages = uniqueImages([turf.sportsImages || [], generatedImages.sportsImages]).slice(0, 8);
  const createdImages = uniqueImages([turf.createdImages || []]);
  const updatedImages = uniqueImages([turf.updatedImages || []]);
  const gallery = uniqueImages([
    heroImage,
    coverImage,
    profileImage,
    turf.gallery || [],
    turf.images || [],
    groundImages,
    amenityImages.slice(0, 3),
    locationImages.slice(0, 2),
    sportsImages,
    generatedImages.gallery,
  ]);
  const images = uniqueImages([heroImage, coverImage, profileImage, gallery]);
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
  const approvalStatus = String(turf.approvalStatus || "").toUpperCase();
  const venueStatus = normalizeVenueStatus(
    turf.status || turf.moderationStatus || (turf.isApproved ? "ACTIVE" : "PENDING"),
  );
  const approved = approvalStatus === "APPROVED" || venueStatus === "ACTIVE" || venueStatus === "LIVE";
  const primarySport = sports[0] || "";
  const primaryPrice = Number(sportRates[primarySport] ?? turf.pricePerHour ?? turf.price ?? turf.pricing?.baseHourly?.amount ?? 0);
  const coordinates = coordinatePair(turf);
  const latitude = Number(turf.latitude ?? turf.locationDetails?.latitude ?? coordinates.latitude);
  const longitude = Number(turf.longitude ?? turf.locationDetails?.longitude ?? coordinates.longitude);
  const distanceInKm = turf.distanceInKm === undefined || turf.distanceInKm === null ? null : Number(turf.distanceInKm);
  const area = turf.area || turf.locationDetails?.area || (typeof turf.location === "string" ? turf.location : "");
  const displayLocation = area || turf.address || turf.locationDetails?.address || "";

  return {
    ...turf,
    id: identifier(turf),
    address: turf.address || turf.locationDetails?.address || "",
    amenities: turf.amenities || [],
    approvalHistory: turf.approvalHistory || [],
    approvalStatus: approvalStatus || (approved ? "APPROVED" : "PENDING"),
    city: turf.city || turf.locationDetails?.city || "",
    distance: distanceLabel(distanceInKm, turf.city || "TURFX venue"),
    distanceInKm,
    format: sports.join(", ") || "Sports venue",
    amenityImages,
    coverImage,
    createdImages,
    gallery,
    geoLocation: turf.geoLocation || (typeof turf.location === "object" ? turf.location : undefined),
    groundImages,
    heroImage,
    image: thumbnail || images[0],
    images,
    latitude: Number.isFinite(latitude) ? latitude : null,
    location: displayLocation,
    locationImages,
    longitude: Number.isFinite(longitude) ? longitude : null,
    price: primaryPrice,
    profileImage,
    sport: primarySport,
    sportRates,
    sportsImages,
    sportsSupported: sports,
    thumbnail,
    updatedImages,
    videoThumbnail,
    isLive: approved,
    isPublished: Boolean(turf.isPublished ?? approved),
    isVerified: Boolean(turf.isVerified ?? approved),
    rejectionReason: turf.rejectionReason || "",
    reviewProgress: Number(turf.reviewProgress || (approved ? 100 : approvalStatus === "REJECTED" || approvalStatus === "NEED_CHANGES" ? 75 : 50)),
    reviewedAt: turf.reviewedAt,
    submittedAt: turf.submittedAt || turf.createdAt,
    status: venueStatusLabel(venueStatus),
    statusValue: venueStatus,
    visibility: turf.visibility || (approved ? "PUBLIC" : "PRIVATE"),
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
  const demoId = overrides._id || overrides.id || "";
  const sport = overrides.sport || overrides.sportsSupported?.[0] || "Football";
  const image = demoSportImages[sport] || assetImages.football;
  const images = overrides.images || overrides.gallery || [image, assetImages.stadium, assetImages.training];

  return normalizeTurf({
    _id: demoId,
    id: demoId,
    name: "TURFX Demo Arena",
    slug: "turfx-demo-arena",
    description: "Prototype-ready sports arena with premium turf, live slots, transparent pricing, and demo booking data.",
    area: "TURFX Demo District",
    geoLocation: { type: "Point", coordinates: [77.5946, 12.9716] },
    latitude: 12.9716,
    location: "TURFX Demo District",
    longitude: 77.5946,
    address: "TURFX Demo District",
    city: "Bangalore",
    state: "Karnataka",
    sportsSupported: [sport],
    sportRates: { [sport]: Number(overrides.pricePerHour || overrides.price || 1200) },
    amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area", "Digital Check-in"],
    pricePerHour: 1200,
    images,
    gallery: images,
    approvalStatus: "APPROVED",
    status: "ACTIVE",
    visibility: "PUBLIC",
    moderationStatus: "approved",
    isApproved: true,
    isPublished: true,
    isVerified: true,
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
  const paymentStatus = booking.paymentStatus || booking.payment?.paymentStatus || booking.payment?.status || "pending";
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
    completedAt: booking.completedAt,
    invoiceGeneratedAt: booking.invoiceGeneratedAt,
    invoiceId: booking.invoiceId || booking.payment?.invoiceId || "",
    invoiceStatus: booking.invoiceStatus || booking.payment?.invoiceStatus || "pending",
    paid: Number(booking.totalAmount ?? booking.total?.amount ?? 0),
    payment: booking.payment ? normalizePayment(booking.payment) : null,
    paymentStatus,
    qrExpiresAt: booking.qrExpiresAt,
    qrStatus: booking.qrStatus || (String(status).toLowerCase() === "completed" ? "expired" : paymentStatus === "paid" ? "active" : "inactive"),
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
    refundedAmount: Number(payment.refundedAmount || 0),
    refundStatus: payment.refundStatus || "none",
    finalizedAt: payment.finalizedAt,
    invoiceGeneratedAt: payment.invoiceGeneratedAt,
    invoiceId: payment.invoiceId || "",
    invoiceStatus: payment.invoiceStatus || "pending",
    platformFee: Number(payment.platformFee || 0),
    status: payment.paymentStatus || payment.status || "pending",
    time: booking.slotStartTime && booking.slotEndTime ? `${booking.slotStartTime} - ${booking.slotEndTime}` : "",
    turf,
    venue: turf.name || booking.turfId?.name || "TURFX Venue",
  };
}

export function normalizeCoach(coach = {}) {
  const turf = normalizeTurf(coach.turf || coach.turfId || {});

  return {
    ...coach,
    id: coach.coachId || identifier(coach),
    coachId: coach.coachId || identifier(coach),
    coachName: coach.coachName || "TURFX Coach",
    experience: coach.experience || "6+ years",
    monthlyFee: Number(coach.monthlyFee || 0),
    planName: coach.planName || "Monthly Coaching",
    sessionsPerMonth: Number(coach.sessionsPerMonth || 12),
    sport: coach.sport || turf.sport || "Football",
    specialty: coach.specialty || "Private coaching and match preparation",
    timings: coach.timings || [],
    turf,
    turfId: String(coach.turfId || coach.turf?._id || coach.turf?.id || ""),
    venue: turf.name || coach.turf?.name || "TURFX Venue",
  };
}

export function normalizeCoachRequest(request = {}) {
  const turf = normalizeTurf(request.turfId || {});
  const owner = request.ownerId || {};
  const user = request.userId || {};
  const approvalStatus = request.approvalStatus || "pending";

  return {
    ...request,
    id: identifier(request),
    approvalStatus,
    coachName: request.coachName || "TURFX Coach",
    customerName: user.name || user.email || "Customer",
    date: dateLabel(request.preferredStartDate || request.createdAt),
    monthlyFee: Number(request.monthlyFee || 0),
    owner,
    ownerName: owner.businessName || owner.name || "Turf Owner",
    ownerRevenue: Number(request.ownerRevenue || 0),
    paidAtLabel: dateLabel(request.paidAt || request.createdAt),
    paymentStatus: request.paymentStatus || "pending",
    planName: request.planName || "Monthly Coaching",
    platformFee: Number(request.platformFee || 0),
    sessionsPerMonth: Number(request.sessionsPerMonth || 12),
    sport: request.sport || turf.sport || "Football",
    status: approvalStatus === "approved" ? "Successful" : titleCase(approvalStatus),
    timing: request.timing || "",
    transactionId: request.transactionId || "",
    turf,
    user,
    venue: turf.name || "TURFX Venue",
  };
}

export function normalizeTournament(tournament = {}) {
  const turf = typeof tournament.turfId === "object" && tournament.turfId ? normalizeTurf(tournament.turfId) : null;
  const owner = tournament.ownerId || tournament.turfId?.ownerId || {};
  const startDate = new Date(tournament.startDate);
  const endDate = new Date(tournament.endDate);
  const now = new Date();
  const status = Number.isNaN(startDate.getTime())
    ? "Registration Open"
    : startDate > now
      ? "Registration Open"
      : endDate < now
        ? "Completed"
        : "In Progress";
  const teams = tournament.participants?.length || 0;
  const maxTeams = Number(tournament.maxTeams || 8);

  return {
    ...tournament,
    id: identifier(tournament),
    date: dateLabel(tournament.startDate),
    endDateLabel: dateLabel(tournament.endDate),
    entryFee: Number(tournament.entryFee || 0),
    location: turf?.location || turf?.city || "",
    maxTeams,
    owner,
    ownerName: owner.businessName || owner.name || "TURFX Owner",
    prize: tournament.prizePool ? `INR ${Number(tournament.prizePool).toLocaleString()}` : "",
    status,
    teams,
    turf,
    turfIdValue: turf?.id || identifier(tournament.turfId),
    venue: turf?.name || "TURFX Tournament Venue",
  };
}

export function normalizeTournamentRegistration(registration = {}) {
  const tournament = normalizeTournament(
    typeof registration.tournamentId === "object" && registration.tournamentId
      ? registration.tournamentId
      : {},
  );
  const turf = typeof registration.turfId === "object" && registration.turfId
    ? normalizeTurf(registration.turfId)
    : tournament.turf || normalizeTurf({});
  const user = registration.userId || {};
  const approvalStatus = registration.approvalStatus || "pending";

  return {
    ...registration,
    id: identifier(registration),
    approvalStatus,
    approvedAtLabel: dateLabel(registration.approvedAt),
    captainName: registration.captainName || user.name || "Captain",
    customerName: user.name || user.email || "Customer",
    entryFee: Number(registration.entryFee || 0),
    ownerRevenue: Number(registration.ownerRevenue || 0),
    paidAtLabel: dateLabel(registration.paidAt || registration.createdAt),
    participantCount: Number(registration.participantCount || 1),
    paymentStatus: registration.paymentStatus || "pending",
    platformFee: Number(registration.platformFee || 0),
    registrationStatus: registration.registrationStatus || (approvalStatus === "approved" ? "successful" : approvalStatus),
    rejectionReason: registration.rejectionReason || "",
    status: approvalStatus === "approved" ? "Successful" : titleCase(approvalStatus),
    teamName: registration.teamName || "Tournament Team",
    transactionId: registration.transactionId || "",
    tournament,
    tournamentIdValue: tournament.id || identifier(registration.tournamentId),
    tournamentTitle: tournament.title || "Tournament",
    turf,
    user,
    venue: turf.name || tournament.venue || "TURFX Venue",
  };
}
