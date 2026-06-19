const path = require("path");

const dotenvPath = path.join(__dirname, "../../.env");
require("dotenv").config({ path: dotenvPath });

const connectDatabase = require("../config/database");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const PlatformSetting = require("../models/PlatformSetting");
const Review = require("../models/Review");
const Tournament = require("../models/Tournament");
const Turf = require("../models/Turf");
const User = require("../models/User");
const { buildSlotKey, normalizeDate } = require("../services/availabilityService");

const PLATFORM_FEE_RATE = 0.1;

function revenueSplit(amount) {
  const platformFee = Number((Number(amount || 0) * PLATFORM_FEE_RATE).toFixed(2));
  return {
    ownerRevenue: Number((Number(amount || 0) - platformFee).toFixed(2)),
    platformFee,
    platformFeeRate: PLATFORM_FEE_RATE,
  };
}

function requiredEnvironment(name, developmentDefault = "") {
  const value = process.env[name]?.trim();

  if (!value) {
    if (process.env.NODE_ENV !== "production" && developmentDefault) {
      return developmentDefault;
    }
    throw new Error(`${name} is required for production bootstrap`);
  }

  return value;
}

async function bootstrapPlatformOwner() {
  const email = requiredEnvironment("ADMIN_EMAIL", "admin@turfx.com").toLowerCase();
  const password = requiredEnvironment("ADMIN_PASSWORD", "Admin@123");
  const name = process.env.ADMIN_NAME?.trim() || "TURFX Platform Owner";
  let admin = await User.findOne({ email }).select("+password");

  if (!admin) {
    admin = await User.create({
      name,
      email,
      password,
      role: "admin",
      approvalStatus: "ACTIVE",
      accountStatus: "active",
      membershipPlan: "Admin",
    });
    return { admin, created: true };
  }

  admin.name = name;
  admin.role = "admin";
  admin.approvalStatus = "ACTIVE";
  admin.accountStatus = "active";
  admin.membershipPlan = "Admin";

  if (String(process.env.ADMIN_ROTATE_PASSWORD).toLowerCase() === "true") {
    admin.password = password;
  }

  await admin.save();
  return { admin, created: false };
}

async function bootstrapSettings(adminId) {
  const settings = [
    {
      key: "booking.service_fee_percent",
      value: 0,
      category: "booking",
      description: "Platform service fee percentage applied to new bookings.",
    },
    {
      key: "booking.cancellation_hours",
      value: 2,
      category: "booking",
      description: "Minimum notice in hours for user booking cancellation.",
    },
    {
      key: "platform.support_email",
      value: process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL,
      category: "support",
      description: "Primary support contact shown by platform workflows.",
      isPublic: true,
    },
  ];

  await Promise.all(
    settings.map((setting) =>
      PlatformSetting.findOneAndUpdate(
        { key: setting.key },
        { ...setting, updatedBy: adminId },
        { upsert: true, runValidators: true },
      ),
    ),
  );
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return normalizeDate(date);
}

async function ensureDemoUser({ email, password, ...updates }) {
  let user = await User.findOne({ email }).select("+password");

  if (!user) {
    user = await User.create({
      ...updates,
      email,
      password,
    });
    return user;
  }

  Object.entries(updates).forEach(([key, value]) => {
    user[key] = value;
  });

  if (String(process.env.DEMO_ROTATE_PASSWORD || "true").toLowerCase() === "true") {
    user.password = password;
  }

  await user.save();
  return user;
}

async function upsertByQuery(Model, query, payload) {
  return Model.findOneAndUpdate(query, payload, {
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true,
    upsert: true,
  });
}

async function bootstrapDemoData() {
  if (process.env.NODE_ENV === "production" && String(process.env.DEMO_SEED).toLowerCase() !== "true") {
    return { created: false, skipped: true };
  }

  const admin = await ensureDemoUser({
    name: "TURFX Platform Owner",
    email: "admin@turfx.com",
    password: "Admin@123",
    role: "admin",
    approvalStatus: "ACTIVE",
    accountStatus: "active",
    membershipPlan: "Admin",
  });
  const owner = await ensureDemoUser({
    name: "Priya Menon",
    businessName: "TURFX Pro Venues",
    address: "12 Arena Road, Mumbai",
    phone: "9876543210",
    email: "owner1@turfx.com",
    password: "Owner@123",
    role: "owner",
    approvalStatus: "ACTIVE",
    accountStatus: "active",
    membershipPlan: "Venue Pro",
    approvedAt: new Date(),
    approvedBy: admin._id,
  });
  const user = await ensureDemoUser({
    name: "Alex Thompson",
    email: "user1@turfx.com",
    password: "User@123",
    phone: "9123456780",
    bio: "Weekend football captain and TURFX Gold member.",
    role: "user",
    approvalStatus: "ACTIVE",
    accountStatus: "active",
    membershipPlan: "Gold",
    walletBalance: 2500,
  });

  const demoTurfs = [
    {
      name: "The Stadium",
      description: "Premium football turf with broadcast lighting, seating, washrooms, and digital check-in.",
      location: "Bandra West",
      address: "20 Stadium Avenue",
      city: "Mumbai",
      state: "Maharashtra",
      sportsSupported: ["Football"],
      sportRates: { Football: 1800 },
      amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"],
      pricePerHour: 1800,
      rating: 4.8,
      totalReviews: 18,
    },
    {
      name: "Skyline Cricket Box",
      description: "Compact cricket box for evening leagues, training sessions, and group bookings.",
      location: "Andheri East",
      address: "7 Skyline Park",
      city: "Mumbai",
      state: "Maharashtra",
      sportsSupported: ["Cricket"],
      sportRates: { Cricket: 1400 },
      amenities: ["Parking", "Drinking Water", "Flood Lights"],
      pricePerHour: 1400,
      rating: 4.6,
      totalReviews: 11,
    },
    {
      name: "Ace Indoor Arena",
      description: "Indoor badminton and basketball venue with recovery zones and member priority access.",
      location: "Koregaon Park",
      address: "5 Ace Street",
      city: "Pune",
      state: "Maharashtra",
      sportsSupported: ["Badminton", "Basketball"],
      sportRates: { Badminton: 950, Basketball: 1200 },
      amenities: ["Washroom", "Drinking Water", "Seating Area"],
      pricePerHour: 950,
      rating: 4.7,
      totalReviews: 14,
    },
  ];

  const turfs = [];
  for (const turf of demoTurfs) {
    turfs.push(
      await upsertByQuery(
        Turf,
        { name: turf.name, ownerId: owner._id },
        {
          ...turf,
          ownerId: owner._id,
          status: "LIVE",
          isApproved: true,
          moderationStatus: "approved",
          approvedAt: new Date(),
          approvedBy: admin._id,
          schedule: {
            minimumBookingMinutes: 60,
            startIntervalMinutes: 30,
            slotMinutes: 60,
            weeklyAvailability: {
              monday: ["06:00-23:00"],
              tuesday: ["06:00-23:00"],
              wednesday: ["06:00-23:00"],
              thursday: ["06:00-23:00"],
              friday: ["06:00-23:00"],
              saturday: ["06:00-23:00"],
              sunday: ["06:00-23:00"],
            },
            blackoutDates: [],
          },
        },
      ),
    );
  }

  user.favorites = [...new Set([...(user.favorites || []).map(String), String(turfs[0]._id)])];
  await user.save();

  const tomorrow = futureDate(1);
  const completedDate = futureDate(-2);
  const confirmedBooking = await upsertByQuery(
    Booking,
    {
      userId: user._id,
      turfId: turfs[0]._id,
      ownerId: turfs[0].ownerId,
      sport: "Football",
      bookingDate: tomorrow,
      slotStartTime: "18:00",
    },
    {
      userId: user._id,
      turfId: turfs[0]._id,
      bookingDate: tomorrow,
      slotStartTime: "18:00",
      slotEndTime: "19:00",
      hoursBooked: 1,
      totalAmount: turfs[0].pricePerHour,
      paymentStatus: "paid",
      bookingStatus: "confirmed",
      slotKey: buildSlotKey(turfs[0]._id, tomorrow, "18:00", "19:00"),
    },
  );
  const completedBooking = await upsertByQuery(
    Booking,
    {
      userId: user._id,
      turfId: turfs[1]._id,
      ownerId: turfs[1].ownerId,
      sport: "Cricket",
      bookingDate: completedDate,
      slotStartTime: "20:00",
    },
    {
      userId: user._id,
      turfId: turfs[1]._id,
      bookingDate: completedDate,
      slotStartTime: "20:00",
      slotEndTime: "21:00",
      hoursBooked: 1,
      totalAmount: turfs[1].pricePerHour,
      paymentStatus: "paid",
      bookingStatus: "completed",
    },
  );

  for (const { booking, turf } of [
    { booking: confirmedBooking, turf: turfs[0] },
    { booking: completedBooking, turf: turfs[1] },
  ]) {
    const split = revenueSplit(booking.totalAmount);
    await upsertByQuery(
      Payment,
      { bookingId: booking._id, paymentStatus: "paid" },
      {
        userId: user._id,
        bookingId: booking._id,
        ownerId: turf.ownerId,
        venueId: turf._id,
        amount: booking.totalAmount,
        ...split,
        paymentMethod: "Card",
        paymentStatus: "paid",
        transactionId: `DEMO-${String(booking._id).slice(-8).toUpperCase()}`,
        provider: "mock",
        providerReference: "demo-seed",
        paidAt: new Date(),
      },
    );
  }

  await upsertByQuery(
    Review,
    { userId: user._id, turfId: turfs[1]._id },
    {
      userId: user._id,
      turfId: turfs[1]._id,
      rating: 5,
      comment: "Smooth check-in, bright lighting, and a great post-match experience.",
    },
  );

  await upsertByQuery(
    Event,
    { title: "Corporate Athletics Challenge" },
    {
      title: "Corporate Athletics Challenge",
      description: "A high-energy team challenge with mock ticketing and athlete check-in.",
      eventDate: futureDate(14),
      location: "Mumbai Sports District",
      entryFee: 499,
      maxParticipants: 80,
      currentParticipants: 32,
      createdBy: admin._id,
    },
  );
  await upsertByQuery(
    Tournament,
    { title: "TURFX Pro Elite Cup" },
    {
      title: "TURFX Pro Elite Cup",
      description: "Portfolio-ready competitive bracket with prize pool, participants, and registration CTA.",
      sport: "Football",
      prizePool: 75000,
      startDate: futureDate(21),
      endDate: futureDate(23),
      participants: [user._id],
      createdBy: admin._id,
    },
  );

  const notificationTemplates = [
    [user._id, "Welcome to TURFX Gold", "Your Gold benefits are active for priority booking and rewards."],
    [user._id, "Upcoming booking confirmed", `${turfs[0].name} is confirmed for tomorrow at 18:00.`],
    [owner._id, "Venue portfolio ready", "Your approved demo venues are live for bookings."],
    [admin._id, "Prototype data ready", "Demo accounts, venues, events, and bookings are available."],
  ];

  for (const [userId, title, message] of notificationTemplates) {
    await upsertByQuery(Notification, { userId, title }, { userId, title, message, isRead: false });
  }

  return {
    admin,
    created: true,
    owner,
    turfs,
    user,
  };
}

async function seed() {
  await connectDatabase();
  const { admin, created } = await bootstrapPlatformOwner();
  await bootstrapSettings(admin._id);
  const demo = await bootstrapDemoData();

  console.log(`Platform Owner ${created ? "created" : "verified"}: ${admin.email}`);
  console.log("Baseline platform settings are ready.");
  if (demo.skipped) {
    console.log("Demo prototype data skipped in production. Set DEMO_SEED=true to enable it.");
  } else {
    console.log("Demo prototype accounts ready: admin@turfx.com, owner1@turfx.com, user1@turfx.com");
  }
  return { admin, created, demo };
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  bootstrapDemoData,
  bootstrapPlatformOwner,
  bootstrapSettings,
  seed,
};
