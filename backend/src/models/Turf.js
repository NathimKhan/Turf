const mongoose = require("mongoose");
const {
  VENUE_STATUSES,
  VENUE_APPROVAL_STATUSES,
  isVenueLive,
  normalizeVenueStatus,
  venueModerationStatus,
  venueStatusLabel,
} = require("../utils/approval");
const {
  coordinatesFromGeoPoint,
  geocodeVenue,
  isGeoPoint,
} = require("../services/geocodingService");
const { migrateVenueApprovalFields } = require("../services/venueApprovalService");
const { ensureTurfImages } = require("../utils/turfImages");

const allowedSports = ["Football", "Cricket", "Volleyball", "Basketball", "Badminton", "Tennis"];
const allowedAmenities = ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"];

const turfSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Turf name is required"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Turf description is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      index: true,
    },
    location: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Coordinates are required"],
      validate: {
        validator: isGeoPoint,
        message: "Valid latitude and longitude are required",
      },
    },
    latitude: {
      type: Number,
      min: [-90, "Latitude must be between -90 and 90"],
      max: [90, "Latitude must be between -90 and 90"],
      required: [true, "Latitude is required"],
    },
    longitude: {
      type: Number,
      min: [-180, "Longitude must be between -180 and 180"],
      max: [180, "Longitude must be between -180 and 180"],
      required: [true, "Longitude is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    sportsSupported: [
      {
        type: String,
        enum: allowedSports,
        required: true,
      },
    ],
    pricePerHour: {
      type: Number,
      required: [true, "Price per hour is required"],
      min: [0, "Price must be positive"],
    },
    sportRates: {
      type: Map,
      of: {
        type: Number,
        min: [0, "Sport rate must be positive"],
      },
      default: {},
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    heroImage: {
      type: String,
      trim: true,
      default: "",
    },
    coverImage: {
      type: String,
      trim: true,
      default: "",
    },
    profileImage: {
      type: String,
      trim: true,
      default: "",
    },
    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },
    videoThumbnail: {
      type: String,
      trim: true,
      default: "",
    },
    gallery: [
      {
        type: String,
        trim: true,
      },
    ],
    groundImages: [
      {
        type: String,
        trim: true,
      },
    ],
    amenityImages: [
      {
        type: String,
        trim: true,
      },
    ],
    locationImages: [
      {
        type: String,
        trim: true,
      },
    ],
    sportsImages: [
      {
        type: String,
        trim: true,
      },
    ],
    createdImages: [
      {
        type: String,
        trim: true,
      },
    ],
    updatedImages: [
      {
        type: String,
        trim: true,
      },
    ],
    amenities: [
      {
        type: String,
        enum: allowedAmenities,
      },
    ],
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: VENUE_STATUSES,
      default: "PENDING",
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: VENUE_APPROVAL_STATUSES,
      default: "PENDING",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PRIVATE",
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    submittedAt: Date,
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalHistory: {
      type: [
        {
          action: {
            type: String,
            trim: true,
          },
          actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          at: {
            type: Date,
            default: Date.now,
          },
          fromStatus: {
            type: String,
            trim: true,
            default: "",
          },
          reason: {
            type: String,
            trim: true,
            default: "",
          },
          toStatus: {
            type: String,
            trim: true,
            default: "",
          },
        },
      ],
      default: [],
    },
    schedule: {
      slotMinutes: {
        type: Number,
        default: 60,
      },
      startIntervalMinutes: {
        type: Number,
        default: 30,
      },
      minimumBookingMinutes: {
        type: Number,
        default: 60,
      },
      bufferMinutes: {
        type: Number,
        default: 0,
      },
      weeklyAvailability: {
        monday: { type: [String], default: ["06:00-23:00"] },
        tuesday: { type: [String], default: ["06:00-23:00"] },
        wednesday: { type: [String], default: ["06:00-23:00"] },
        thursday: { type: [String], default: ["06:00-23:00"] },
        friday: { type: [String], default: ["06:00-23:00"] },
        saturday: { type: [String], default: ["06:00-23:00"] },
        sunday: { type: [String], default: ["06:00-23:00"] },
      },
      blackoutDates: {
        type: [Date],
        default: [],
      },
      blackouts: {
        type: [
          {
            date: {
              type: Date,
              required: true,
            },
            reason: {
              type: String,
              trim: true,
              default: "Blackout",
            },
          },
        ],
        default: [],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

turfSchema.pre("validate", function syncVenueStatus(next) {
  migrateVenueApprovalFields(this);
  this.status = normalizeVenueStatus(this.status);
  this.moderationStatus = venueModerationStatus(this.status);

  return next();
});

turfSchema.pre("validate", async function ensureGeoLocation() {
  if (typeof this.location === "string") {
    this.area = this.area || this.location;
    this.location = undefined;
  }

  let coordinates = coordinatesFromGeoPoint(this.location);

  if (!coordinates) {
    const geocoded = await geocodeVenue({
      address: this.address,
      area: this.area,
      city: this.city,
      latitude: this.latitude,
      location: this.location,
      longitude: this.longitude,
      state: this.state,
    });

    this.area = geocoded.area || this.area || this.city;
    this.location = geocoded.location;
    coordinates = coordinatesFromGeoPoint(this.location);
  }

  if (coordinates) {
    this.latitude = coordinates.latitude;
    this.longitude = coordinates.longitude;
  }
});

turfSchema.pre("validate", function syncTurfImages(next) {
  ensureTurfImages(this);
  return next();
});

turfSchema.post("init", function hydrateMarketplaceApprovalState(doc) {
  migrateVenueApprovalFields(doc);
});

turfSchema.index({
  name: "text",
  area: "text",
  city: "text",
  sportsSupported: "text",
  description: "text",
});

turfSchema.index({ approvalStatus: 1, visibility: 1, isPublished: 1, createdAt: -1 });
turfSchema.index({ ownerId: 1, approvalStatus: 1, createdAt: -1 });

turfSchema.index(
  { location: "2dsphere" },
  {
    partialFilterExpression: {
      "location.coordinates": { $type: "array" },
      "location.type": "Point",
    },
  },
);

turfSchema.virtual("sport").get(function getPrimarySport() {
  return this.sportsSupported?.[0] || "";
});

turfSchema.virtual("price").get(function getPrice() {
  const rates = this.sportRates instanceof Map ? this.sportRates : new Map(Object.entries(this.sportRates || {}));
  const primarySport = this.sportsSupported?.[0] || "";
  return Number(rates.get(primarySport) ?? this.pricePerHour);
});

turfSchema.methods.toJSON = function toJSON() {
  const turf = this.toObject({ virtuals: true });
  ensureTurfImages(turf);
  turf.isLive = isVenueLive(turf);
  turf.statusLabel = venueStatusLabel(turf.status);
  turf.reviewProgress = turf.approvalStatus === "APPROVED"
    ? 100
    : turf.approvalStatus === "REJECTED" || turf.approvalStatus === "NEED_CHANGES"
      ? 75
      : 50;
  const coordinates = coordinatesFromGeoPoint(turf.location);
  turf.area = turf.area || turf.city || "";
  turf.geoLocation = turf.location;
  turf.location = turf.area;
  turf.latitude = coordinates?.latitude ?? turf.latitude;
  turf.longitude = coordinates?.longitude ?? turf.longitude;
  turf.locationDetails = {
    address: turf.address,
    area: turf.area,
    city: turf.city,
    coordinates: turf.geoLocation?.coordinates || [],
    latitude: turf.latitude,
    longitude: turf.longitude,
    state: turf.state,
  };
  if (this.$locals?.distanceInKm !== undefined) {
    turf.distanceInKm = this.$locals.distanceInKm;
  } else if (turf.distanceInKm !== undefined) {
    turf.distanceInKm = Number(turf.distanceInKm);
  }
  turf.pricing = {
    baseHourly: {
      amount: turf.pricePerHour,
      currency: "INR",
    },
    sportsHourly: turf.sportRates || {},
  };
  delete turf.__v;
  return turf;
};

module.exports = mongoose.model("Turf", turfSchema);
module.exports.allowedSports = allowedSports;
module.exports.allowedAmenities = allowedAmenities;
