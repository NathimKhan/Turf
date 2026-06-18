const { after, before, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-with-sufficient-length";
process.env.JWT_EXPIRES_IN = "1h";
process.env.PAYMENT_PROVIDER = "mock";

const app = require("../src/server");
const generateToken = require("../src/utils/generateToken");
const Booking = require("../src/models/Booking");
const BookingConflictLog = require("../src/models/BookingConflictLog");
const Notification = require("../src/models/Notification");
const Payment = require("../src/models/Payment");
const PlatformSetting = require("../src/models/PlatformSetting");
const Review = require("../src/models/Review");
const Turf = require("../src/models/Turf");
const User = require("../src/models/User");
const {
  bootstrapPlatformOwner,
  bootstrapSettings,
} = require("../src/seed/seed");

let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Booking.syncIndexes(), BookingConflictLog.syncIndexes(), Payment.syncIndexes(), Review.syncIndexes(), Turf.syncIndexes(), User.syncIndexes()]);
});

beforeEach(async () => {
  await Promise.all([
    Booking.deleteMany(),
    BookingConflictLog.deleteMany(),
    Notification.deleteMany(),
    Payment.deleteMany(),
    PlatformSetting.deleteMany(),
    Review.deleteMany(),
    Turf.deleteMany(),
    User.deleteMany(),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createAdmin() {
  const admin = await User.create({
    name: "Platform Owner",
    email: "admin@test.local",
    password: "AdminPass1",
    role: "admin",
    accountStatus: "active",
    membershipPlan: "Admin",
  });
  return { admin, token: generateToken(admin._id) };
}

test("production user, owner, venue, booking, payment, and favorite workflows", async () => {
  const userRegistration = await request(app).post("/api/auth/register").send({
    name: "Booking User",
    email: "user@test.local",
    password: "UserPass1",
    confirmPassword: "UserPass1",
    role: "user",
  });
  assert.equal(userRegistration.status, 201);
  assert.ok(userRegistration.body.data.token);
  const userToken = userRegistration.body.data.token;

  const ownerRegistration = await request(app).post("/api/auth/register-owner").send({
    name: "Venue Owner",
    businessName: "Venue Company",
    address: "10 Booking Street",
    phone: "9876543210",
    email: "owner@test.local",
    password: "OwnerPass1",
    confirmPassword: "OwnerPass1",
  });
  assert.equal(ownerRegistration.status, 201);
  assert.equal(ownerRegistration.body.data.user.accountStatus, "pending");
  assert.equal(ownerRegistration.body.data.token, undefined);

  const pendingLogin = await request(app).post("/api/auth/login").send({
    email: "owner@test.local",
    password: "OwnerPass1",
  });
  assert.equal(pendingLogin.status, 403);

  const { token: adminToken } = await createAdmin();
  const ownerId = ownerRegistration.body.data.user._id;
  const approval = await request(app)
    .patch(`/api/admin/owners/${ownerId}/status`)
    .set(bearer(adminToken))
    .send({ status: "active" });
  assert.equal(approval.status, 200);

  const ownerLogin = await request(app).post("/api/auth/login").send({
    email: "owner@test.local",
    password: "OwnerPass1",
  });
  assert.equal(ownerLogin.status, 200);
  const ownerToken = ownerLogin.body.data.token;

  const turfCreation = await request(app)
    .post("/api/turfs")
    .set(bearer(ownerToken))
    .send({
      name: "Production Arena",
      description: "A production venue used for workflow validation.",
      location: "Central District",
      address: "20 Arena Road",
      city: "Mumbai",
      state: "Maharashtra",
      sportsSupported: ["Football"],
      amenities: ["Parking", "Flood Lights"],
      pricePerHour: 1200,
    });
  assert.equal(turfCreation.status, 201);
  const turfId = turfCreation.body.data.turf._id;
  assert.equal(turfCreation.body.data.turf.isApproved, false);

  const selfApprovalAttempt = await request(app)
    .put(`/api/turfs/${turfId}`)
    .set(bearer(ownerToken))
    .send({ isApproved: true, name: "Production Arena" });
  assert.equal(selfApprovalAttempt.status, 200);
  assert.equal(selfApprovalAttempt.body.data.turf.isApproved, false);

  const turfApproval = await request(app)
    .patch(`/api/admin/turfs/${turfId}/status`)
    .set(bearer(adminToken))
    .send({ status: "approved" });
  assert.equal(turfApproval.status, 200);
  assert.equal(turfApproval.body.data.turf.isApproved, true);

  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const availability = await request(app).get(`/api/turfs/${turfId}/availability`).query({ date });
  assert.equal(availability.status, 200);
  assert.ok(availability.body.data.slots.length > 0);
  const slot = availability.body.data.slots[0];

  const bookingResponse = await request(app)
    .post("/api/bookings")
    .set(bearer(userToken))
    .send({
      turfId,
      bookingDate: date,
      slotStartTime: slot.startTime,
      slotEndTime: slot.endTime,
    });
  assert.equal(bookingResponse.status, 201);
  assert.equal(bookingResponse.body.data.booking.bookingStatus, "pending");
  const bookingId = bookingResponse.body.data.booking._id;

  const secondUser = await request(app).post("/api/auth/register").send({
    name: "Second User",
    email: "second@test.local",
    password: "SecondPass1",
    confirmPassword: "SecondPass1",
    role: "user",
  });
  const duplicateBooking = await request(app)
    .post("/api/bookings")
    .set(bearer(secondUser.body.data.token))
    .send({
      turfId,
      bookingDate: date,
      slotStartTime: slot.startTime,
      slotEndTime: slot.endTime,
    });
  assert.equal(duplicateBooking.status, 409);

  const payment = await request(app)
    .post("/api/payments/checkout")
    .set(bearer(userToken))
    .send({ bookingId, paymentMethod: "Card" });
  assert.equal(payment.status, 201);
  assert.equal(payment.body.data.payment.paymentStatus, "paid");
  assert.equal(payment.body.data.payment.platformFee, 120);
  assert.equal(payment.body.data.payment.ownerRevenue, 1080);
  assert.ok(payment.body.data.payment.paidAt);
  assert.equal(payment.body.data.booking.bookingStatus, "confirmed");

  const userPayments = await request(app).get("/api/payments/history").set(bearer(userToken));
  assert.equal(userPayments.status, 200);
  assert.equal(userPayments.body.data.payments.length, 1);
  assert.equal(userPayments.body.data.payments[0].transactionId, payment.body.data.payment.transactionId);
  assert.equal(userPayments.body.data.payments[0].platformFee, 120);
  assert.equal(userPayments.body.data.payments[0].ownerRevenue, 1080);
  assert.equal(userPayments.body.data.payments[0].bookingId.turfId.name, "Production Arena");

  const ownerPayments = await request(app).get("/api/payments/history").set(bearer(ownerToken));
  assert.equal(ownerPayments.status, 200);
  assert.equal(ownerPayments.body.data.payments.length, 1);
  assert.equal(ownerPayments.body.data.payments[0].ownerRevenue, 1080);

  const ownerDashboard = await request(app).get("/api/owner/dashboard").set(bearer(ownerToken));
  assert.equal(ownerDashboard.status, 200);
  assert.equal(ownerDashboard.body.data.revenue, 1080);
  assert.equal(ownerDashboard.body.data.completedRevenue, 1080);

  const adminDashboard = await request(app).get("/api/admin/dashboard").set(bearer(adminToken));
  assert.equal(adminDashboard.status, 200);
  assert.equal(adminDashboard.body.data.platformRevenue, 120);
  assert.equal(adminDashboard.body.data.ownerRevenue, 1080);

  const membership = await request(app)
    .post("/api/auth/membership/upgrade")
    .set(bearer(userToken))
    .send({ plan: "Gold" });
  assert.equal(membership.status, 200);
  assert.equal(membership.body.data.user.membershipPlan, "Gold");

  const favorite = await request(app)
    .post(`/api/favorites/${turfId}`)
    .set(bearer(userToken));
  assert.equal(favorite.status, 200);
  const favorites = await request(app).get("/api/favorites").set(bearer(userToken));
  assert.equal(favorites.status, 200);
  assert.equal(favorites.body.data.favorites.length, 1);

  const ownerBookings = await request(app).get("/api/bookings").set(bearer(ownerToken));
  assert.equal(ownerBookings.status, 200);
  assert.equal(ownerBookings.body.data.bookings.length, 1);

  const checkedIn = await request(app)
    .patch(`/api/bookings/${bookingId}/status`)
    .set(bearer(ownerToken))
    .send({ status: "checked_in" });
  assert.equal(checkedIn.status, 200);
  assert.equal(checkedIn.body.data.booking.bookingStatus, "checked_in");

  const checkedInAvailability = await request(app).get(`/api/turfs/${turfId}/availability`).query({ date });
  assert.equal(checkedInAvailability.status, 200);
  assert.equal(
    checkedInAvailability.body.data.slots.some(
      (availableSlot) => availableSlot.startTime === slot.startTime && availableSlot.endTime === slot.endTime,
    ),
    false,
  );

  const completed = await request(app)
    .patch(`/api/bookings/${bookingId}/status`)
    .set(bearer(ownerToken))
    .send({ status: "completed" });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.data.booking.bookingStatus, "completed");

  const review = await request(app)
    .post("/api/reviews")
    .set(bearer(userToken))
    .send({ turfId, rating: 5, comment: "Excellent venue and booking experience." });
  assert.equal(review.status, 201);
  const reviewId = review.body.data.review._id;

  const updatedReview = await request(app)
    .put(`/api/reviews/${reviewId}`)
    .set(bearer(userToken))
    .send({ rating: 4, comment: "Updated review after another look at the venue." });
  assert.equal(updatedReview.status, 200);
  assert.equal(updatedReview.body.data.review.rating, 4);

  const myReviews = await request(app).get("/api/reviews/mine").set(bearer(userToken));
  assert.equal(myReviews.status, 200);
  assert.equal(myReviews.body.data.reviews.length, 1);

  const deletedReview = await request(app)
    .delete(`/api/reviews/${reviewId}`)
    .set(bearer(userToken));
  assert.equal(deletedReview.status, 200);

  const notifications = await request(app).get("/api/notifications").set(bearer(userToken));
  assert.equal(notifications.status, 200);
  assert.ok(notifications.body.data.notifications.length >= 3);
  assert.ok(notifications.body.data.notifications.some((notification) =>
    notification.title === "Payment successful" && notification.targetUrl?.startsWith("/payments")));
  assert.ok(notifications.body.data.notifications.some((notification) =>
    notification.title === "Booking confirmed" && notification.targetUrl === `/bookings/${bookingId}`));

  const ownerNotifications = await request(app).get("/api/notifications").set(bearer(ownerToken));
  assert.equal(ownerNotifications.status, 200);
  assert.ok(ownerNotifications.body.data.notifications.some((notification) =>
    /credited/i.test(notification.title) && notification.targetUrl === "/owner/revenue"));

  const platformNotifications = await request(app).get("/api/notifications").set(bearer(adminToken));
  assert.equal(platformNotifications.status, 200);
  assert.ok(platformNotifications.body.data.notifications.some((notification) =>
    notification.title === "Platform fee received" && notification.targetUrl === "/admin/revenue"));

  const broadcast = await request(app)
    .post("/api/notifications")
    .set(bearer(adminToken))
    .send({
      broadcast: true,
      title: "Platform broadcast",
      message: "All active demo accounts should receive this notification.",
    });
  assert.equal(broadcast.status, 201);
  assert.equal(broadcast.body.data.count, 4);

  const adminNotifications = await request(app).get("/api/notifications").set(bearer(adminToken));
  assert.equal(adminNotifications.status, 200);
  assert.ok(adminNotifications.body.data.notifications.some((notification) => notification.title === "Platform broadcast"));

  const markRead = await request(app)
    .put(`/api/notifications/${adminNotifications.body.data.notifications[0]._id}/read`)
    .set(bearer(adminToken));
  assert.equal(markRead.status, 200);
});

test("owners cannot manage venues belonging to another owner", async () => {
  const firstOwner = await User.create({
    name: "First Owner",
    email: "first-owner@test.local",
    password: "OwnerPass1",
    role: "owner",
    accountStatus: "active",
  });
  const secondOwner = await User.create({
    name: "Second Owner",
    email: "second-owner@test.local",
    password: "OwnerPass1",
    role: "owner",
    accountStatus: "active",
  });
  const turf = await Turf.create({
    name: "Private Arena",
    description: "Owned by the first owner.",
    location: "North District",
    address: "5 North Road",
    city: "Pune",
    state: "Maharashtra",
    sportsSupported: ["Cricket"],
    pricePerHour: 900,
    ownerId: firstOwner._id,
    isApproved: true,
    moderationStatus: "approved",
  });

  const response = await request(app)
    .put(`/api/turfs/${turf._id}`)
    .set(bearer(generateToken(secondOwner._id)))
    .send({ name: "Unauthorized Rename" });

  assert.equal(response.status, 403);
  assert.equal((await Turf.findById(turf._id)).name, "Private Arena");
});

test("venue creation rejects placeholder sport and amenity values", async () => {
  const owner = await User.create({
    name: "Placeholder Owner",
    email: "placeholder-owner@test.local",
    password: "OwnerPass1",
    role: "owner",
    accountStatus: "active",
  });

  const response = await request(app)
    .post("/api/turfs")
    .set(bearer(generateToken(owner._id)))
    .send({
      name: "Placeholder Arena",
      description: "A venue with placeholder selections.",
      location: "Central District",
      address: "12 Placeholder Road",
      city: "Mumbai",
      state: "Maharashtra",
      sportsSupported: ["Sports"],
      amenities: ["Amenities"],
      pricePerHour: 1000,
    });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /Sports must be one of/);
  assert.match(response.body.message, /Amenities must be one of/);
  assert.equal(await Turf.countDocuments(), 0);
});

test("dynamic booking engine supports buffers and flexible start times", async () => {
  const owner = await User.create({
    name: "Dynamic Slot Owner",
    email: "dynamic-owner@test.local",
    password: "OwnerPass1",
    role: "owner",
    accountStatus: "active",
  });
  const userA = await User.create({
    name: "Dynamic User A",
    email: "dynamic-a@test.local",
    password: "UserPass1",
    role: "user",
    accountStatus: "active",
  });
  const userB = await User.create({
    name: "Dynamic User B",
    email: "dynamic-b@test.local",
    password: "UserPass1",
    role: "user",
    accountStatus: "active",
  });
  const userC = await User.create({
    name: "Dynamic User C",
    email: "dynamic-c@test.local",
    password: "UserPass1",
    role: "user",
    accountStatus: "active",
  });
  const turf = await Turf.create({
    name: "Dynamic Buffer Arena",
    description: "A venue used to validate flexible slot conflict behavior.",
    location: "Central District",
    address: "30 Dynamic Road",
    city: "Mumbai",
    state: "Maharashtra",
    sportsSupported: ["Football"],
    amenities: ["Parking"],
    pricePerHour: 1000,
    ownerId: owner._id,
    isApproved: true,
    moderationStatus: "approved",
    schedule: {
      bufferMinutes: 15,
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
    },
  });
  const bookingDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const reserve = (user, slotStartTime, slotEndTime) =>
    request(app)
      .post("/api/bookings")
      .set(bearer(generateToken(user._id)))
      .send({
        turfId: turf._id,
        bookingDate,
        slotStartTime,
        slotEndTime,
      });

  const firstBooking = await reserve(userA, "11:00", "12:00");
  assert.equal(firstBooking.status, 201);

  const overlap = await reserve(userB, "11:30", "12:30");
  assert.equal(overlap.status, 409);
  assert.match(overlap.body.message, /overlaps/i);

  const bufferConflict = await reserve(userB, "12:00", "13:00");
  assert.equal(bufferConflict.status, 409);
  assert.match(bufferConflict.body.message, /buffer/i);

  const afterBuffer = await reserve(userB, "12:15", "13:15");
  assert.equal(afterBuffer.status, 201);

  const flexibleStart = await reserve(userC, "18:45", "19:45");
  assert.equal(flexibleStart.status, 201);

  const blackoutDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const scheduleUpdate = await request(app)
    .put(`/api/turfs/${turf._id}/slots`)
    .set(bearer(generateToken(owner._id)))
    .send({
      blackouts: [{ date: blackoutDate, reason: "Maintenance" }],
      bufferMinutes: 15,
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
    });
  assert.equal(scheduleUpdate.status, 200);
  assert.equal(scheduleUpdate.body.data.turf.schedule.blackouts[0].reason, "Maintenance");

  const blackoutAvailability = await request(app).get(`/api/turfs/${turf._id}/availability`).query({ date: blackoutDate });
  assert.equal(blackoutAvailability.status, 200);
  assert.equal(blackoutAvailability.body.data.isBlackoutDate, true);
  assert.ok(blackoutAvailability.body.data.timeline.every((slot) => slot.status === "blocked"));

  const availability = await request(app).get(`/api/turfs/${turf._id}/availability`).query({ date: bookingDate });
  assert.equal(availability.status, 200);
  assert.ok(availability.body.data.timeline.some((slot) => slot.startTime === "10:00" && slot.status === "blocked"));
  assert.ok(availability.body.data.timeline.some((slot) => slot.startTime === "11:00" && slot.status === "booked"));
  assert.ok(availability.body.data.timeline.some((slot) => slot.startTime === "12:15" && slot.status === "booked"));
  assert.ok(availability.body.data.timeline.some((slot) => slot.startTime === "13:30" && slot.status === "available"));

  const { token: adminToken } = await createAdmin();
  const conflictLogs = await request(app)
    .get("/api/admin/conflict-logs")
    .set(bearer(adminToken));
  assert.equal(conflictLogs.status, 200);
  assert.ok(conflictLogs.body.data.logs.some((log) => /overlaps/i.test(log.reason)));
  assert.ok(conflictLogs.body.data.logs.some((log) => /buffer/i.test(log.reason)));

  const venueSchedules = await request(app)
    .get("/api/admin/venue-schedules")
    .set(bearer(adminToken));
  assert.equal(venueSchedules.status, 200);
  assert.ok(venueSchedules.body.data.schedules.some((schedule) => schedule._id === String(turf._id)));
});

test("production bootstrap is idempotent and preserves application data", async () => {
  process.env.ADMIN_NAME = "TURFX Platform Owner";
  process.env.ADMIN_EMAIL = "bootstrap@test.local";
  process.env.ADMIN_PASSWORD = "BootstrapPass1";
  process.env.ADMIN_ROTATE_PASSWORD = "false";
  process.env.SUPPORT_EMAIL = "support@test.local";

  const existingUser = await User.create({
    name: "Existing User",
    email: "existing@test.local",
    password: "ExistingPass1",
    role: "user",
    accountStatus: "active",
  });

  const first = await bootstrapPlatformOwner();
  await bootstrapSettings(first.admin._id);
  const second = await bootstrapPlatformOwner();
  await bootstrapSettings(second.admin._id);

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(await User.countDocuments({ role: "admin" }), 1);
  assert.ok(await User.findById(existingUser._id));
  assert.equal(await PlatformSetting.countDocuments(), 3);
  assert.equal(
    (await PlatformSetting.findOne({ key: "platform.support_email" })).value,
    "support@test.local",
  );
});

test("cancellation releases a slot and protected admin routes do not leak", async () => {
  const owner = await User.create({
    name: "Cancellation Owner",
    email: "cancel-owner@test.local",
    password: "OwnerPass1",
    role: "owner",
    accountStatus: "active",
  });
  const firstUser = await User.create({
    name: "First Booking User",
    email: "cancel-user@test.local",
    password: "UserPass1",
    role: "user",
    accountStatus: "active",
  });
  const secondUser = await User.create({
    name: "Replacement User",
    email: "replacement@test.local",
    password: "UserPass1",
    role: "user",
    accountStatus: "active",
  });
  const turf = await Turf.create({
    name: "Cancellation Arena",
    description: "A venue used to validate slot release after cancellation.",
    location: "West District",
    address: "25 West Road",
    city: "Mumbai",
    state: "Maharashtra",
    sportsSupported: ["Football"],
    pricePerHour: 1000,
    ownerId: owner._id,
    isApproved: true,
    moderationStatus: "approved",
  });
  const bookingDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const bookingPayload = {
    turfId: turf._id,
    bookingDate,
    slotStartTime: "08:00",
    slotEndTime: "09:00",
  };

  const unauthenticatedAdmin = await request(app).get("/api/admin/dashboard");
  assert.equal(unauthenticatedAdmin.status, 401);

  const unauthorizedAdmin = await request(app)
    .get("/api/admin/dashboard")
    .set(bearer(generateToken(firstUser._id)));
  assert.equal(unauthorizedAdmin.status, 403);

  const initialBooking = await request(app)
    .post("/api/bookings")
    .set(bearer(generateToken(firstUser._id)))
    .send(bookingPayload);
  assert.equal(initialBooking.status, 201);

  const cancellation = await request(app)
    .put(`/api/bookings/cancel/${initialBooking.body.data.booking._id}`)
    .set(bearer(generateToken(firstUser._id)));
  assert.equal(cancellation.status, 200);
  assert.equal(cancellation.body.data.booking.bookingStatus, "cancelled");

  const replacementBooking = await request(app)
    .post("/api/bookings")
    .set(bearer(generateToken(secondUser._id)))
    .send(bookingPayload);
  assert.equal(replacementBooking.status, 201);
});

test("forgot password reports simulated email delivery without exposing account existence", async () => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  const user = await User.create({
    name: "Reset User",
    email: "reset@test.local",
    password: "ResetPass1",
    role: "user",
    accountStatus: "active",
  });

  const existingAccount = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: user.email });
  assert.equal(existingAccount.status, 200);
  assert.equal(existingAccount.body.data.simulated, true);
  assert.ok(existingAccount.body.data.resetToken);

  const missingAccount = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "missing@test.local" });
  assert.equal(missingAccount.status, 200);
  assert.equal(missingAccount.body.data.simulated, true);
  assert.equal(missingAccount.body.data.resetToken, undefined);
});
