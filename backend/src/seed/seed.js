const path = require("path");

const dotenvPath = path.join(__dirname, "../../.env");
require("dotenv").config({ path: dotenvPath });

const connectDatabase = require("../config/database");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
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
    });
    return { admin, created: true };
  }

  admin.name = name;
  admin.role = "admin";
  admin.approvalStatus = "ACTIVE";
  admin.accountStatus = "active";

  if (String(process.env.ADMIN_ROTATE_PASSWORD).toLowerCase() === "true") {
    admin.password = password;
  }

  await admin.save();
  return { admin, created: false };
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return normalizeDate(date);
}

function geoPoint(longitude, latitude) {
  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
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
    approvedAt: new Date(),
    approvedBy: admin._id,
  });
  const user = await ensureDemoUser({
    name: "Alex Thompson",
    email: "user1@turfx.com",
    password: "User@123",
    phone: "9123456780",
    bio: "Weekend football captain and regular TURFX player.",
    role: "user",
    approvalStatus: "ACTIVE",
    accountStatus: "active",
    walletBalance: 2500,
  });

  const demoTurfs = [
    {
      name: "Marina Football Arena",
      description: "Premium football turf with broadcast lighting, seating, washrooms, and digital check-in.",
      area: "Anna Nagar",
      location: geoPoint(80.2707, 13.0827),
      latitude: 13.0827,
      longitude: 80.2707,
      address: "20 Marina Sports Avenue",
      city: "Chennai",
      state: "Tamil Nadu",
      sportsSupported: ["Football"],
      sportRates: { Football: 1800 },
      amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"],
      pricePerHour: 1800,
    },
    {
      name: "Bangalore Turf Club",
      description: "Multi-sport arena for football and volleyball with bright evening slots.",
      area: "Indiranagar",
      location: geoPoint(77.5946, 12.9716),
      latitude: 12.9716,
      longitude: 77.5946,
      address: "12 Arena Cross",
      city: "Bangalore",
      state: "Karnataka",
      sportsSupported: ["Football", "Volleyball"],
      sportRates: { Football: 1600, Volleyball: 1100 },
      amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights"],
      pricePerHour: 1600,
    },
    {
      name: "The Stadium",
      description: "Premium football turf with broadcast lighting, seating, washrooms, and digital check-in.",
      area: "Bandra West",
      location: geoPoint(72.8777, 19.076),
      latitude: 19.076,
      longitude: 72.8777,
      address: "20 Stadium Avenue",
      city: "Mumbai",
      state: "Maharashtra",
      sportsSupported: ["Football"],
      sportRates: { Football: 1800 },
      amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"],
      pricePerHour: 1800,
    },
    {
      name: "Skyline Cricket Box",
      description: "Compact cricket box for evening leagues, training sessions, and group bookings.",
      area: "Nagercoil Central",
      location: geoPoint(77.4344, 8.178),
      latitude: 8.178,
      longitude: 77.4344,
      address: "7 Skyline Park",
      city: "Nagercoil",
      state: "Tamil Nadu",
      sportsSupported: ["Cricket"],
      sportRates: { Cricket: 1400 },
      amenities: ["Parking", "Drinking Water", "Flood Lights"],
      pricePerHour: 1400,
    },
    {
      name: "Madurai Smash Hub",
      description: "Indoor badminton venue with recovery zones and fast booking access.",
      area: "KK Nagar",
      location: geoPoint(78.1198, 9.9252),
      latitude: 9.9252,
      longitude: 78.1198,
      address: "5 Smash Street",
      city: "Madurai",
      state: "Tamil Nadu",
      sportsSupported: ["Badminton"],
      sportRates: { Badminton: 900 },
      amenities: ["Washroom", "Drinking Water", "Seating Area"],
      pricePerHour: 900,
    },
    {
      name: "Coimbatore Court House",
      description: "Indoor basketball and badminton venue for leagues, coaching, and group bookings.",
      area: "RS Puram",
      location: geoPoint(76.9558, 11.0168),
      latitude: 11.0168,
      longitude: 76.9558,
      address: "14 Court House Road",
      city: "Coimbatore",
      state: "Tamil Nadu",
      sportsSupported: ["Basketball", "Badminton"],
      sportRates: { Basketball: 1250, Badminton: 950 },
      amenities: ["Parking", "Washroom", "Drinking Water", "Seating Area"],
      pricePerHour: 950,
    },
    {
      name: "Hyderabad Cricket Grid",
      description: "Cricket nets and box format play near the city core.",
      area: "Gachibowli",
      location: geoPoint(78.4867, 17.385),
      latitude: 17.385,
      longitude: 78.4867,
      address: "22 Grid Park",
      city: "Hyderabad",
      state: "Telangana",
      sportsSupported: ["Cricket"],
      sportRates: { Cricket: 1500 },
      amenities: ["Parking", "Drinking Water", "Flood Lights"],
      pricePerHour: 1500,
    },
    {
      name: "Kochi Five Sports",
      description: "Five-a-side football venue with fast check-in and evening availability.",
      area: "Edappally",
      location: geoPoint(76.2673, 9.9312),
      latitude: 9.9312,
      longitude: 76.2673,
      address: "8 Five Sports Lane",
      city: "Kochi",
      state: "Kerala",
      sportsSupported: ["Football"],
      sportRates: { Football: 1450 },
      amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights"],
      pricePerHour: 1450,
    },
    {
      name: "Trivandrum Tennis Point",
      description: "Tennis training courts with flood lights and flexible scheduling.",
      area: "Kowdiar",
      location: geoPoint(76.9366, 8.5241),
      latitude: 8.5241,
      longitude: 76.9366,
      address: "10 Tennis Point",
      city: "Trivandrum",
      state: "Kerala",
      sportsSupported: ["Tennis"],
      sportRates: { Tennis: 1200 },
      amenities: ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"],
      pricePerHour: 1200,
    },
    {
      name: "Ace Indoor Arena",
      description: "Indoor badminton and basketball venue with recovery zones and fast booking access.",
      area: "Koregaon Park",
      location: geoPoint(73.8567, 18.5204),
      latitude: 18.5204,
      longitude: 73.8567,
      address: "5 Ace Street",
      city: "Pune",
      state: "Maharashtra",
      sportsSupported: ["Badminton", "Basketball"],
      sportRates: { Badminton: 950, Basketball: 1200 },
      amenities: ["Washroom", "Drinking Water", "Seating Area"],
      pricePerHour: 950,
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
          approvalStatus: "APPROVED",
          status: "ACTIVE",
          visibility: "PUBLIC",
          isApproved: true,
          isPublished: true,
          isVerified: true,
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
    Tournament,
    { title: "TURFX Pro Elite Cup" },
    {
      title: "TURFX Pro Elite Cup",
      description: "Portfolio-ready competitive bracket with prize pool, participants, and registration CTA.",
      sport: "Football",
      prizePool: 75000,
      entryFee: 999,
      maxTeams: 8,
      startDate: futureDate(21),
      endDate: futureDate(23),
      participants: [user._id],
      createdBy: admin._id,
      ownerId: turfs[0].ownerId,
      turfId: turfs[0]._id,
    },
  );

  const notificationTemplates = [
    [user._id, "Welcome to TURFX", "Your account is ready for bookings, favorites, and rewards."],
    [user._id, "Upcoming booking confirmed", `${turfs[0].name} is confirmed for tomorrow at 18:00.`],
    [owner._id, "Venue portfolio ready", "Your approved demo venues are live for bookings."],
    [admin._id, "Prototype data ready", "Demo accounts, venues, tournaments, and bookings are available."],
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
  const demo = await bootstrapDemoData();

  console.log(`Platform Owner ${created ? "created" : "verified"}: ${admin.email}`);
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
  seed,
};
