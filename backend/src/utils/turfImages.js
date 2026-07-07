const SINGLE_IMAGE_FIELDS = [
  "heroImage",
  "coverImage",
  "profileImage",
  "thumbnail",
  "videoThumbnail",
];

const IMAGE_COLLECTION_FIELDS = [
  "gallery",
  "groundImages",
  "amenityImages",
  "locationImages",
  "sportsImages",
  "createdImages",
  "updatedImages",
];

const TURF_IMAGE_UPLOAD_FIELDS = [
  { name: "images", maxCount: 16 },
  { name: "gallery", maxCount: 16 },
  { name: "groundImages", maxCount: 12 },
  { name: "amenityImages", maxCount: 12 },
  { name: "locationImages", maxCount: 8 },
  { name: "sportsImages", maxCount: 8 },
  { name: "heroImage", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
  { name: "videoThumbnail", maxCount: 1 },
];

const GALLERY_LABELS = [
  "Hero turf view",
  "Day match angle",
  "Night lights",
  "Entrance view",
  "Player area",
  "Premium surface",
  "Seating side",
  "Scoreboard view",
];

const GROUND_LABELS = [
  "Main ground",
  "Day surface",
  "Night flood lights",
  "Scoreboard angle",
];

const AMENITY_LABELS = [
  "Entrance",
  "Parking",
  "Washroom",
  "Cafeteria",
  "Changing room",
  "Seating area",
  "Sports equipment",
  "Drinking water",
];

const LOCATION_LABELS = [
  "Venue entrance",
  "Parking access",
  "Nearby area",
  "Map preview",
];

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter(Boolean);
}

function unique(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const clean = cleanString(value);
    if (!clean || seen.has(clean)) return false;
    seen.add(clean);
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

function turfIdentity(turf = {}) {
  const id = cleanString(turf._id || turf.id);
  const sport = Array.isArray(turf.sportsSupported) ? turf.sportsSupported.join("-") : cleanString(turf.sport);
  return [id, turf.name, turf.city, turf.area, sport].map(cleanString).filter(Boolean).join(":") || "turfx-venue";
}

function sportsFor(turf = {}) {
  const sports = Array.isArray(turf.sportsSupported) && turf.sportsSupported.length
    ? turf.sportsSupported
    : cleanString(turf.sport)
      ? [turf.sport]
      : ["Turf"];

  return sports.map(cleanString).filter(Boolean);
}

function generatedImagePayload(turf, label, index, field) {
  const name = cleanString(turf.name) || "TURFX Venue";
  const city = cleanString(turf.city || turf.area || turf.location) || "Sports City";
  const sport = sportsFor(turf)[0] || "Turf";

  return {
    city,
    field,
    identity: stableHash(turfIdentity(turf)).toString(36),
    index,
    label,
    name,
    sport,
  };
}

function generatedImageToken(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function generatedImageUrl(payload) {
  return `/api/turfs/generated-media/${generatedImageToken(payload)}.svg`;
}

function generatedImageSvg(payload = {}) {
  const name = cleanString(payload.name) || "TURFX Venue";
  const city = cleanString(payload.city) || "Sports City";
  const sport = cleanString(payload.sport) || "Turf";
  const label = cleanString(payload.label) || "Venue view";
  const index = Number(payload.index) || 0;
  const field = cleanString(payload.field) || "gallery";
  const seed = `${cleanString(payload.identity) || name}:${field}:${label}:${index}`;
  const hash = stableHash(seed);
  const hue = hash % 360;
  const accent = (hue + 118) % 360;
  const warm = (hue + 42) % 360;
  const lineColor = `hsl(${accent} 88% 62%)`;
  const dark = `hsl(${hue} 44% 18%)`;
  const mid = `hsl(${warm} 68% 34%)`;
  const light = `hsl(${accent} 76% 48%)`;
  const xOffset = 120 + (hash % 180);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${escapeXml(name)} ${escapeXml(label)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="0.58" stop-color="${mid}"/>
      <stop offset="1" stop-color="${light}"/>
    </linearGradient>
    <radialGradient id="glow" cx="76%" cy="18%" r="42%">
      <stop offset="0" stop-color="white" stop-opacity="0.78"/>
      <stop offset="0.42" stop-color="${lineColor}" stop-opacity="0.36"/>
      <stop offset="1" stop-color="${lineColor}" stop-opacity="0"/>
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
  <path d="M${xOffset + 44} 156 L${xOffset + 44} 86 M${984 - (hash % 140)} 126 L${984 - (hash % 140)} 62" stroke="rgba(255,255,255,0.72)" stroke-width="8" stroke-linecap="round"/>
  <text x="78" y="112" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800">${escapeXml(label)}</text>
  <text x="78" y="172" fill="rgba(255,255,255,0.86)" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${escapeXml(name)}</text>
  <text x="78" y="218" fill="rgba(255,255,255,0.72)" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700">${escapeXml(sport)} - ${escapeXml(city)}</text>
  <text x="78" y="738" fill="rgba(255,255,255,0.68)" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">TURFX verified venue media</text>
</svg>`;
}

function imageDataUrl(turf, label, index, field) {
  return generatedImageUrl(generatedImagePayload(turf, label, index, field));
}

function generatedTurfImageSvgFromToken(token = "") {
  try {
    const decoded = Buffer.from(String(token), "base64url").toString("utf8");
    const payload = JSON.parse(decoded);
    if (!payload || typeof payload !== "object") return "";
    return generatedImageSvg(payload);
  } catch {
    return "";
  }
}

function buildGeneratedTurfImages(turf = {}) {
  const sports = sportsFor(turf);
  const sportsLabels = sports.flatMap((sport) => [
    `${sport} play area`,
    `${sport} equipment`,
  ]);
  const sportsImageLabels = sportsLabels.length ? sportsLabels : ["Sports equipment", "Training area"];

  const gallery = GALLERY_LABELS.map((label, index) => imageDataUrl(turf, label, index, "gallery"));
  const groundImages = GROUND_LABELS.map((label, index) => imageDataUrl(turf, label, index, "groundImages"));
  const amenityImages = AMENITY_LABELS.map((label, index) => imageDataUrl(turf, label, index, "amenityImages"));
  const locationImages = LOCATION_LABELS.map((label, index) => imageDataUrl(turf, label, index, "locationImages"));
  const sportsImages = sportsImageLabels.map((label, index) => imageDataUrl(turf, label, index, "sportsImages"));
  const videoThumbnail = imageDataUrl(turf, "360 tour preview", 0, "videoThumbnail");

  return {
    heroImage: imageDataUrl(turf, "Hero venue view", 0, "heroImage"),
    coverImage: imageDataUrl(turf, "Cover venue view", 0, "coverImage"),
    profileImage: imageDataUrl(turf, "Venue profile", 0, "profileImage"),
    thumbnail: imageDataUrl(turf, "Venue thumbnail", 0, "thumbnail"),
    videoThumbnail,
    gallery,
    groundImages,
    amenityImages,
    locationImages,
    sportsImages,
    createdImages: unique([
      ...gallery,
      ...groundImages,
      ...amenityImages,
      ...locationImages,
      ...sportsImages,
      videoThumbnail,
    ]),
  };
}

function isUploadedMedia(value = "") {
  const clean = cleanString(value);
  return clean.startsWith("data:image/") || /\/uploads\//.test(clean);
}

function fillCollection(currentValues, fallbackValues, minimum) {
  const current = cleanArray(currentValues);
  const fallback = cleanArray(fallbackValues);
  const merged = unique([...current, ...fallback]);
  return merged.slice(0, Math.max(minimum, current.length || minimum));
}

function ensureTurfImages(target = {}) {
  const generated = buildGeneratedTurfImages(target);
  const legacyImages = cleanArray(target.images);
  const legacyUploaded = legacyImages.filter(isUploadedMedia);

  target.heroImage = cleanString(target.heroImage) || legacyUploaded[0] || generated.heroImage;
  target.coverImage = cleanString(target.coverImage) || legacyUploaded[1] || generated.coverImage;
  target.profileImage = cleanString(target.profileImage) || legacyUploaded[2] || generated.profileImage;
  target.thumbnail = cleanString(target.thumbnail) || target.heroImage || generated.thumbnail;
  target.videoThumbnail = cleanString(target.videoThumbnail) || generated.videoThumbnail;

  target.gallery = fillCollection(
    target.gallery,
    [target.heroImage, target.coverImage, target.profileImage, ...legacyImages, ...generated.gallery],
    8,
  );
  target.groundImages = fillCollection(target.groundImages, generated.groundImages, 4);
  target.amenityImages = fillCollection(target.amenityImages, generated.amenityImages, 8);
  target.locationImages = fillCollection(target.locationImages, generated.locationImages, 4);
  target.sportsImages = fillCollection(target.sportsImages, generated.sportsImages, 2);
  target.createdImages = fillCollection(target.createdImages, generated.createdImages, generated.createdImages.length);
  target.updatedImages = cleanArray(target.updatedImages);
  target.images = unique([
    target.heroImage,
    target.coverImage,
    target.profileImage,
    ...legacyImages,
    ...target.gallery,
  ]).slice(0, 16);

  return target;
}

module.exports = {
  IMAGE_COLLECTION_FIELDS,
  SINGLE_IMAGE_FIELDS,
  TURF_IMAGE_UPLOAD_FIELDS,
  buildGeneratedTurfImages,
  ensureTurfImages,
  generatedTurfImageSvgFromToken,
  uniqueImageValues: unique,
};
