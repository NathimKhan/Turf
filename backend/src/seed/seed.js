const path = require("path");

const dotenvPath = path.join(__dirname, "../../.env");
const dotenvResult = require("dotenv").config({ path: dotenvPath });
if (dotenvResult.error) {
  console.warn(`[env] backend/.env not loaded from ${dotenvPath}; using existing process environment.`);
} else {
  console.log(`[env] backend/.env loaded from ${dotenvPath}`);
}

const connectDatabase = require("../config/database");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const Tournament = require("../models/Tournament");
const Turf = require("../models/Turf");
const User = require("../models/User");

const sports = ["Football", "Cricket", "Badminton", "Volleyball", "Basketball"];
const amenities = ["Parking", "Washroom", "Drinking Water", "Flood Lights", "Seating Area"];
const cities = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Delhi", state: "Delhi" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Pune", state: "Maharashtra" },
];
const imagePool = [
  "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=1200&q=80",
];

function addDays(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function transactionId(index) {
  return `SEED-TXN-${String(index + 1).padStart(4, "0")}`;
}

async function clearDatabase() {
  await Promise.all([
    Booking.deleteMany(),
    Event.deleteMany(),
    Notification.deleteMany(),
    Payment.deleteMany(),
    Review.deleteMany(),
    Tournament.deleteMany(),
    Turf.deleteMany(),
    User.deleteMany(),
  ]);
}

async function seed() {
  await connectDatabase();
  await clearDatabase();

  const users = await User.create(
    Array.from({ length: 10 }).map((_, index) => ({
      name: `Demo User ${index + 1}`,
      email: `user${index + 1}@turfx.com`,
      phone: `90000000${String(index + 1).padStart(2, "0")}`,
      password: "User@123",
      role: "user",
      walletBalance: 500 + index * 100,
      membershipPlan: index % 3 === 0 ? "Gold" : index % 3 === 1 ? "Elite" : "Starter",
    })),
  );

  const owners = await User.create(
    Array.from({ length: 5 }).map((_, index) => ({
      name: `Demo Owner ${index + 1}`,
      email: `owner${index + 1}@turfx.com`,
      phone: `91000000${String(index + 1).padStart(2, "0")}`,
      password: "Owner@123",
      role: "owner",
      membershipPlan: "Venue Pro",
    })),
  );

  const admin = await User.create({
    name: "Super Admin",
    email: "admin@turfx.com",
    phone: "9999999999",
    password: "Admin@123",
    role: "admin",
    membershipPlan: "Admin",
  });

  const turfs = await Turf.create(
    Array.from({ length: 20 }).map((_, index) => {
      const place = cities[index % cities.length];
      const primarySport = sports[index % sports.length];
      const secondarySport = sports[(index + 2) % sports.length];

      return {
        name: `${primarySport} Arena ${index + 1}`,
        description: `Premium ${primarySport.toLowerCase()} turf with well-maintained playing surface, lighting, seating, and clean support facilities.`,
        location: `${place.city} Sports District ${index + 1}`,
        address: `${100 + index}, Turf Street, ${place.city}`,
        city: place.city,
        state: place.state,
        sportsSupported: [primarySport, secondarySport],
        pricePerHour: 700 + (index % 6) * 150,
        images: [imagePool[index % imagePool.length], imagePool[(index + 1) % imagePool.length]],
        amenities: amenities.filter((_, amenityIndex) => (amenityIndex + index) % 2 === 0).slice(0, 4),
        ownerId: owners[index % owners.length]._id,
        isApproved: true,
      };
    }),
  );

  const slotPairs = [
    ["06:00", "07:00"],
    ["07:00", "08:00"],
    ["08:00", "09:00"],
    ["17:00", "18:00"],
    ["18:00", "19:00"],
    ["19:00", "20:00"],
    ["20:00", "21:00"],
    ["21:00", "22:00"],
    ["22:00", "23:00"],
    ["16:00", "17:00"],
  ];

  const bookingPayloads = Array.from({ length: 50 }).map((_, index) => {
    const turf = turfs[index % turfs.length];
    const [slotStartTime, slotEndTime] = slotPairs[index % slotPairs.length];

    return {
      userId: users[index % users.length]._id,
      turfId: turf._id,
      bookingDate: addDays(1 + Math.floor(index / 10)),
      slotStartTime,
      slotEndTime,
      hoursBooked: 1,
      totalAmount: turf.pricePerHour,
      paymentStatus: index % 3 === 0 ? "pending" : "paid",
      bookingStatus: index % 11 === 0 ? "completed" : "upcoming",
    };
  });

  const bookings = await Booking.create(bookingPayloads);

  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid");
  await Payment.create(
    paidBookings.map((booking, index) => ({
      userId: booking.userId,
      bookingId: booking._id,
      amount: booking.totalAmount,
      paymentMethod: ["UPI", "Card", "Cash"][index % 3],
      paymentStatus: "paid",
      transactionId: transactionId(index),
    })),
  );

  const reviews = await Review.create(
    Array.from({ length: 20 }).map((_, index) => ({
      userId: users[index % users.length]._id,
      turfId: turfs[index]._id,
      rating: 4 + (index % 2),
      comment: `Great playing experience, clean facility, and smooth booking process. Visit ${index + 1} was worth it.`,
    })),
  );

  await Promise.all(
    turfs.map(async (turf) => {
      const turfReviews = reviews.filter((review) => String(review.turfId) === String(turf._id));
      if (!turfReviews.length) return;

      turf.totalReviews = turfReviews.length;
      turf.rating = Number((turfReviews.reduce((sum, review) => sum + review.rating, 0) / turfReviews.length).toFixed(1));
      await turf.save();
    }),
  );

  await Event.create(
    Array.from({ length: 10 }).map((_, index) => ({
      title: `TURFX Community Event ${index + 1}`,
      description: "A friendly sports event for local athletes, teams, and venue members.",
      eventDate: addDays(10 + index * 3),
      location: `${cities[index % cities.length].city} Sports Hub`,
      entryFee: 250 + index * 50,
      maxParticipants: 40 + index * 10,
      currentParticipants: 10 + index,
      createdBy: owners[index % owners.length]._id,
    })),
  );

  await Tournament.create(
    Array.from({ length: 10 }).map((_, index) => ({
      title: `${sports[index % sports.length]} Championship ${index + 1}`,
      description: "Competitive tournament with knockout rounds, leaderboard tracking, and prize distribution.",
      sport: sports[index % sports.length],
      prizePool: 10000 + index * 2500,
      startDate: addDays(20 + index * 4),
      endDate: addDays(22 + index * 4),
      participants: users.slice(0, 4 + (index % 4)).map((user) => user._id),
      createdBy: index % 2 === 0 ? admin._id : owners[index % owners.length]._id,
    })),
  );

  await Notification.create([
    ...users.map((user, index) => ({
      userId: user._id,
      title: "Welcome to TURFX",
      message: `Your demo user account is ready. Use user${index + 1}@turfx.com with password User@123.`,
    })),
    ...owners.map((owner, index) => ({
      userId: owner._id,
      title: "Owner workspace ready",
      message: `Your demo owner account is ready. Use owner${index + 1}@turfx.com with password Owner@123.`,
    })),
    {
      userId: admin._id,
      title: "Admin workspace ready",
      message: "Use admin@turfx.com with password Admin@123.",
    },
  ]);

  console.log("Seed completed");
  console.log("Admin: admin@turfx.com / Admin@123");
  console.log("Owner: owner1@turfx.com / Owner@123");
  console.log("User: user1@turfx.com / User@123");

  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
