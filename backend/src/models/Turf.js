const mongoose = require("mongoose");
const {
  VENUE_STATUSES,
  isVenueLive,
  normalizeVenueStatus,
  venueModerationStatus,
  venueStatusLabel,
} = require("../utils/approval");

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
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
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
    amenities: [
      {
        type: String,
        enum: allowedAmenities,
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
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
  const statusIsDefault =
    typeof this.$isDefault === "function"
      ? this.$isDefault("status")
      : !this.status;
  const legacyStatus = this.moderationStatus
    ? normalizeVenueStatus(this.moderationStatus)
    : this.isApproved
      ? "LIVE"
      : "PENDING";
  const shouldUseLegacy =
    statusIsDefault &&
    (this.isModified("isApproved") || this.isModified("moderationStatus") || this.isApproved || this.moderationStatus);
  const nextStatus = shouldUseLegacy
    ? legacyStatus
    : normalizeVenueStatus(this.status || legacyStatus);

  this.status = nextStatus;
  this.isApproved = nextStatus === "LIVE";
  this.moderationStatus = venueModerationStatus(nextStatus);

  return next();
});

turfSchema.index({
  name: "text",
  city: "text",
  sportsSupported: "text",
  description: "text",
});

turfSchema.virtual("sport").get(function getPrimarySport() {
  return this.sportsSupported?.[0] || "";
});

turfSchema.virtual("price").get(function getPrice() {
  const rates = this.sportRates instanceof Map ? this.sportRates : new Map(Object.entries(this.sportRates || {}));
  const primarySport = this.sportsSupported?.[0] || "";
  return Number(rates.get(primarySport) ?? this.pricePerHour);
});

turfSchema.virtual("gallery").get(function getGallery() {
  return this.images || [];
});

turfSchema.virtual("reviews").get(function getReviewCount() {
  return this.totalReviews;
});

turfSchema.methods.toJSON = function toJSON() {
  const turf = this.toObject({ virtuals: true });
  turf.isLive = isVenueLive(turf);
  turf.statusLabel = venueStatusLabel(turf.status);
  turf.locationDetails = {
    address: turf.address,
    city: turf.city,
    state: turf.state,
  };
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
