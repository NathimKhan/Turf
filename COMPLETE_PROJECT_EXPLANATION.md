# TURFX Complete A-to-Z Project Explanation

This document explains the complete TURFX project from top to bottom: what it is, how it runs, how frontend and backend communicate, how MongoDB data is structured, how every main workflow works, and how the important files connect.

## 1. What This Project Is

TURFX is a MERN-style turf booking platform.

MERN means:

- MongoDB stores the data.
- Express.js exposes backend APIs.
- React builds the browser user interface.
- Node.js runs the backend server.

The project has two main applications:

```text
Turf/
|-- frontend/   React + Vite application
|-- backend/    Express + MongoDB API
|-- scripts/    helper scripts
|-- package.json
|-- README.md
|-- TUTOR_PROJECT_EXPLANATION.md
`-- COMPLETE_PROJECT_EXPLANATION.md
```

The application has three main user roles:

- `user`: customer/player who searches and books turfs.
- `owner`: turf venue owner who manages venues, schedules, bookings, reviews, revenue.
- `admin`: platform owner who approves owners, approves venues, manages platform operations.

## 2. How The Project Runs

The root `package.json` has these important scripts:

```json
{
  "dev": "node scripts/dev.js",
  "dev:frontend": "npm --prefix frontend run dev",
  "dev:backend": "npm --prefix backend run dev",
  "seed": "npm --prefix backend run seed",
  "test": "npm --prefix backend test"
}
```

When you run:

```bash
npm run dev
```

the file `scripts/dev.js` starts both applications:

```text
backend  -> npm --prefix backend run dev
frontend -> npm --prefix frontend run dev
```

The backend normally runs on:

```text
http://localhost:5000
```

The frontend normally runs on:

```text
http://localhost:5173
```

## 3. How Frontend Talks To Backend

The frontend does not usually call `http://localhost:5000/api/...` directly.

Instead, frontend code calls:

```text
/api/turfs
/api/bookings
/api/payments
/api/auth/login
```

The proxy is configured in:

```text
frontend/vite.config.js
```

The proxy says:

```text
/api     -> http://localhost:5000
/uploads -> http://localhost:5000
```

So this frontend request:

```text
GET /api/turfs
```

becomes this backend request:

```text
GET http://localhost:5000/api/turfs
```

This is why the React app can use short API paths.

## 4. Backend Entry Point

The backend starts at:

```text
backend/src/server.js
```

That file does these things:

1. Loads environment variables from `backend/.env`.
2. Imports Express.
3. Creates the Express app.
4. Configures security middleware.
5. Configures CORS.
6. Enables JSON request bodies.
7. Enables cookies.
8. Serves uploaded files from `/uploads`.
9. Applies API rate limiting.
10. Mounts all route files.
11. Handles 404 routes.
12. Handles errors.
13. Connects to MongoDB.
14. Starts the HTTP server.

Important backend mounted routes:

```text
/api/auth          -> authentication
/api/users         -> admin user management
/api/turfs         -> turf listing, details, creation, availability
/api/bookings      -> booking management
/api/payments      -> payment checkout and history
/api/owner         -> owner dashboard and owner reviews
/api/admin         -> admin dashboard, approvals, schedules, logs
/api/reviews       -> turf reviews
/api/events        -> events
/api/tournaments   -> tournaments
/api/notifications -> notifications
/api/favorites     -> favorite turfs
```

## 5. Backend Environment Variables

The backend expects environment variables in:

```text
backend/.env
```

Important variables:

```text
PORT=5000
MONGO_URI=...
JWT_SECRET=...
CLIENT_URL=http://localhost:5173
PAYMENT_PROVIDER=mock
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
SMTP_HOST=...
SMTP_PORT=587
EMAIL_FROM=...
```

Important warning:

Never share `backend/.env` publicly because it can contain MongoDB credentials, JWT secrets, and email credentials.

## 6. MongoDB Connection

MongoDB connection logic is in:

```text
backend/src/config/database.js
```

This file:

1. Reads `MONGO_URI`.
2. Validates that it starts with `mongodb://` or `mongodb+srv://`.
3. Logs useful database diagnostics.
4. Connects using Mongoose.
5. Handles MongoDB Atlas DNS fallback if SRV lookup fails.

Backend cannot run correctly without a valid `MONGO_URI`.

## 7. Backend Response Format

Successful API responses use:

```json
{
  "success": true,
  "message": "Message",
  "data": {}
}
```

Failed API responses use:

```json
{
  "success": false,
  "message": "Error message"
}
```

This is handled by:

```text
backend/src/utils/responseHandler.js
```

The helper functions are:

- `successResponse`
- `errorResponse`
- `asyncHandler`

## 8. Error Handling

Error handling is in:

```text
backend/src/middleware/errorMiddleware.js
```

It handles:

- route not found
- validation errors
- MongoDB invalid ObjectId errors
- duplicate key errors
- Mongoose validation errors
- generic server errors

Example:

If two users use the same email, MongoDB duplicate key error becomes a proper API response.

## 9. Authentication System

Authentication routes are in:

```text
backend/src/routes/authRoutes.js
```

Authentication controller is:

```text
backend/src/controllers/authController.js
```

User model is:

```text
backend/src/models/User.js
```

Authentication uses:

- email
- password
- bcrypt password hashing
- JWT token
- localStorage on frontend
- optional cookie on backend

### Login Flow

1. User enters email and password in frontend.
2. Frontend calls:

```text
POST /api/auth/login
```

3. Backend finds user by email.
4. Backend compares password using bcrypt.
5. Backend checks role and approval status.
6. Backend creates JWT token.
7. Backend returns user and token.
8. Frontend stores token in localStorage.
9. Future API requests include:

```text
Authorization: Bearer <token>
```

### Register Flow

Normal user registration calls:

```text
POST /api/auth/register
```

Owner registration calls:

```text
POST /api/auth/register-owner
```

Normal users become active immediately.

Owners start as:

```text
approvalStatus: PENDING
accountStatus: pending
```

The admin must approve the owner before the owner can fully manage venues.

## 10. Authorization System

Authorization middleware is in:

```text
backend/src/middleware/authMiddleware.js
backend/src/middleware/adminMiddleware.js
backend/src/middleware/ownerMiddleware.js
```

Important middleware:

- `protect`: requires login.
- `optionalProtect`: uses login if token exists, but allows public request without token.
- `authorizeRoles`: allows only selected roles.
- `adminOnly`: allows only admin.
- `ownerOrAdmin`: allows owner or admin.
- `activeOwnerOrAdmin`: allows admin or active approved owner.

Important detail:

Pending owners can log in and see a limited dashboard, but `activeOwnerOrAdmin` blocks venue creation until admin approval.

## 11. User Database Model

The user schema is in:

```text
backend/src/models/User.js
```

It stores:

- `name`
- `email`
- `phone`
- `businessName`
- `address`
- `password`
- `role`
- `approvalStatus`
- `accountStatus`
- `approvedAt`
- `approvedBy`
- `rejectionReason`
- `profileImage`
- `bio`
- `walletBalance`
- `favorites`
- `passwordResetToken`
- `passwordResetExpires`

Roles:

```text
user
owner
admin
```

Owner approval statuses:

```text
PENDING
ACTIVE
REJECTED
SUSPENDED
```

Account statuses:

```text
active
pending
rejected
suspended
```

The model automatically hashes passwords before saving.

## 12. Turf Database Model

The turf schema is in:

```text
backend/src/models/Turf.js
```

It stores:

- `name`
- `description`
- `area`
- `location`
- `latitude`
- `longitude`
- `address`
- `city`
- `state`
- `sportsSupported`
- `pricePerHour`
- `sportRates`
- `images`
- `amenities`
- `rating`
- `totalReviews`
- `ownerId`
- `status`
- `isApproved`
- `moderationStatus`
- `rejectionReason`
- `approvedAt`
- `approvedBy`
- `schedule`

Allowed sports:

```text
Football
Cricket
Volleyball
Basketball
Badminton
Tennis
```

Allowed amenities:

```text
Parking
Washroom
Drinking Water
Flood Lights
Seating Area
```

Venue statuses:

```text
DRAFT
PENDING
LIVE
REJECTED
SUSPENDED
```

### Latitude And Longitude

The model has normal fields:

```js
latitude: Number
longitude: Number
```

It also has a MongoDB GeoJSON field:

```js
location: {
  type: "Point",
  coordinates: [longitude, latitude]
}
```

Important:

GeoJSON order is:

```text
[longitude, latitude]
```

Not:

```text
[latitude, longitude]
```

The frontend normally displays:

```text
latitude
longitude
```

The database geospatial index uses:

```text
location.coordinates
```

## 13. Turf Schedule Structure

Every turf has a schedule object:

```js
schedule: {
  slotMinutes,
  startIntervalMinutes,
  minimumBookingMinutes,
  bufferMinutes,
  weeklyAvailability,
  blackoutDates,
  blackouts
}
```

Example weekly availability:

```js
weeklyAvailability: {
  monday: ["06:00-23:00"],
  tuesday: ["06:00-23:00"],
  wednesday: ["06:00-23:00"],
  thursday: ["06:00-23:00"],
  friday: ["06:00-23:00"],
  saturday: ["06:00-23:00"],
  sunday: ["06:00-23:00"]
}
```

Meaning:

- venue opens at 06:00
- venue closes at 23:00
- slots are generated inside this range

`blackoutDates` and `blackouts` block specific dates.

`bufferMinutes` blocks time after bookings.

## 14. Booking Database Model

The booking schema is in:

```text
backend/src/models/Booking.js
```

It stores:

- `userId`
- `turfId`
- `ownerId`
- `sport`
- `bookingDate`
- `slotStartTime`
- `slotEndTime`
- `hoursBooked`
- `totalAmount`
- `paymentStatus`
- `bookingStatus`
- `slotKey`
- `occupancyKeys`
- `cancelledAt`
- `cancelledBy`

Payment statuses:

```text
pending
paid
failed
refunded
```

Booking statuses:

```text
pending
confirmed
checked_in
cancelled
completed
upcoming
```

### Booking Conflict Protection

The project protects bookings from overlap in two ways:

1. Service logic checks whether a slot overlaps another booking.
2. Database `occupancyKeys` create unique minute-level occupancy locks.

This means even if two users try to book the same slot at nearly the same time, MongoDB can reject duplicate occupancy.

## 15. Payment Database Model

The payment schema is in:

```text
backend/src/models/Payment.js
```

It stores:

- `userId`
- `bookingId`
- `ownerId`
- `venueId`
- `amount`
- `platformFee`
- `ownerRevenue`
- `platformFeeRate`
- `paymentMethod`
- `paymentStatus`
- `transactionId`
- `provider`
- `providerReference`
- `failureReason`
- `paidAt`
- `refundedAt`

The platform fee rate is:

```text
10%
```

So if a booking is INR 1200:

```text
platformFee = 120
ownerRevenue = 1080
```

## 16. Review Database Model

The review schema is in:

```text
backend/src/models/Review.js
```

It stores:

- `userId`
- `turfId`
- `rating`
- `comment`

Rule:

A user can review a turf only after having a completed booking for that turf.

The model has a unique index:

```js
{ userId: 1, turfId: 1 }
```

So one user cannot create multiple reviews for the same turf.

## 17. Notification Database Model

The notification schema is in:

```text
backend/src/models/Notification.js
```

It stores:

- `userId`
- `title`
- `message`
- `isRead`
- `type`
- `targetUrl`
- `metadata`

Notification types:

```text
booking
payment
revenue
venue
review
system
```

Notifications are created during:

- owner registration
- owner approval
- turf submission
- turf approval or rejection
- booking creation
- payment success
- booking status changes
- review creation
- wallet changes
- admin broadcasts

## 18. Other Database Models

### Event

File:

```text
backend/src/models/Event.js
```

Stores:

- title
- description
- eventDate
- location
- entryFee
- maxParticipants
- currentParticipants
- createdBy

### Tournament

File:

```text
backend/src/models/Tournament.js
```

Stores:

- title
- description
- sport
- prizePool
- startDate
- endDate
- participants
- createdBy

### AuditLog

File:

```text
backend/src/models/AuditLog.js
```

Stores admin moderation actions:

- owner approved
- owner rejected
- venue approved
- venue rejected
- venue submitted

### BookingConflictLog

File:

```text
backend/src/models/BookingConflictLog.js
```

Stores failed booking attempts:

- already booked
- blocked by buffer
- venue closed
- blackout date
- invalid duration

## 19. Turf Backend Flow

Routes:

```text
backend/src/routes/turfRoutes.js
```

Controller:

```text
backend/src/controllers/turfController.js
```

Important routes:

```text
GET    /api/turfs
GET    /api/turfs/search
GET    /api/turfs/meta
GET    /api/turfs/geocode
GET    /api/turfs/nearby
GET    /api/turfs/mine
GET    /api/turfs/city/:city
GET    /api/turfs/:id/availability
GET    /api/turfs/:id
POST   /api/turfs
PUT    /api/turfs/:id
PUT    /api/turfs/:id/slots
DELETE /api/turfs/:id
```

### Public Turf Listing

When frontend calls:

```text
GET /api/turfs
```

Backend:

1. Reads filters from query params.
2. Builds MongoDB filter.
3. Hides unapproved venues unless admin requested them.
4. Filters by active owners.
5. Filters by city, sport, price, rating, search text.
6. If latitude and longitude are present, uses geospatial search.
7. If date is present, checks availability.
8. Returns turfs and pagination.

### Turf Metadata

Frontend filters use:

```text
GET /api/turfs/meta
```

Backend returns:

- cities
- locations
- sports
- amenities

This lets the frontend build filter options dynamically.

### Create Turf

Owner/admin creates venue using:

```text
POST /api/turfs
```

Backend:

1. Requires login.
2. Requires active owner or admin.
3. Accepts image uploads.
4. Validates name, description, location, address, city, state.
5. Validates sports.
6. Validates amenities.
7. Validates price.
8. Validates latitude/longitude if supplied.
9. Geocodes address or coordinates.
10. Creates turf.
11. If owner created it, venue status is `PENDING`.
12. Notifies admins that a venue is waiting for approval.
13. Creates audit log.

### Update Turf

Owner/admin updates venue using:

```text
PUT /api/turfs/:id
```

Backend checks:

- turf exists
- user is owner or admin
- fields are valid
- location is re-geocoded if location fields changed
- images and schedule can be updated

### Delete Turf

Owner/admin deletes venue using:

```text
DELETE /api/turfs/:id
```

Backend refuses deletion if the turf has active bookings.

## 20. Geocoding System

Geocoding service:

```text
backend/src/services/geocodingService.js
```

This service:

- parses latitude and longitude
- validates coordinate ranges
- builds GeoJSON points
- extracts coordinates from GeoJSON
- accepts aliases like `lat`, `lng`, `lon`
- contains known city coordinate data
- can call OpenStreetMap Nominatim
- calculates distance between two coordinates

Known fallback examples:

- Chennai
- Bengaluru
- Mumbai
- Pune
- Hyderabad
- Kochi
- Madurai
- Coimbatore
- Nagercoil
- Thiruvananthapuram

When owner enters an address, backend tries to turn it into:

```js
{
  type: "Point",
  coordinates: [longitude, latitude]
}
```

## 21. Availability System

Availability service:

```text
backend/src/services/availabilityService.js
```

It handles:

- date normalization
- time validation
- converting HH:mm to minutes
- parsing ranges like `06:00-23:00`
- calculating hours
- blackout dates
- weekly availability
- buffer minutes
- slot duration
- minimum booking duration
- sport-specific rates
- overlap detection
- scheduled slot generation
- availability timeline
- booking conflict validation
- occupancy key generation

### Example

If a turf has:

```text
weeklyAvailability.monday = ["06:00-23:00"]
slotMinutes = 60
startIntervalMinutes = 30
```

It can generate slots like:

```text
06:00-07:00
06:30-07:30
07:00-08:00
...
22:00-23:00
```

If another booking exists at:

```text
18:00-19:00
```

then that slot becomes unavailable.

If buffer is 15 minutes, nearby slots may also become blocked.

## 22. Booking Backend Flow

Routes:

```text
backend/src/routes/bookingRoutes.js
```

Controller:

```text
backend/src/controllers/bookingController.js
```

Important routes:

```text
POST  /api/bookings
GET   /api/bookings
GET   /api/bookings/my-bookings
GET   /api/bookings/:id
PUT   /api/bookings/cancel/:id
PATCH /api/bookings/:id/status
```

### Create Booking

Frontend sends:

```text
POST /api/bookings
```

Payload:

```json
{
  "turfId": "id",
  "bookingDate": "YYYY-MM-DD",
  "slotStartTime": "18:00",
  "slotEndTime": "19:00",
  "sport": "Football"
}
```

Backend:

1. Requires login.
2. Allows user or admin.
3. Finds turf.
4. Checks turf is live.
5. Checks owner is active.
6. Normalizes booking date.
7. Rejects past dates.
8. Checks selected sport is supported by turf.
9. Finds active bookings for same turf and date.
10. Validates requested slot against schedule, blackouts, buffers, conflicts.
11. Calculates total amount using sport rate.
12. Creates booking with `pending` booking status.
13. Creates slot key and occupancy keys.
14. Creates notification for user.
15. Creates notification for owner.

### Cancel Booking

Cancellation route:

```text
PUT /api/bookings/cancel/:id
```

Backend:

1. Finds booking.
2. Checks current user is booking user, venue owner, or admin.
3. Refuses if completed.
4. Sets status to cancelled.
5. Clears occupancy keys.
6. Clears slot key.
7. Creates notifications.

### Update Booking Status

Owner/admin route:

```text
PATCH /api/bookings/:id/status
```

Allowed transitions:

```text
pending   -> confirmed, cancelled
confirmed -> checked_in, cancelled
checked_in -> completed
upcoming -> confirmed, checked_in, cancelled
```

This lets owner check in users and complete bookings.

## 23. Payment Backend Flow

Routes:

```text
backend/src/routes/paymentRoutes.js
```

Controller:

```text
backend/src/controllers/paymentController.js
```

Payment provider:

```text
backend/src/services/paymentService.js
```

Important routes:

```text
POST  /api/payments/create
POST  /api/payments/checkout
GET   /api/payments/history
PATCH /api/payments/:id/refund
```

### Mock Payment

This project uses a mock payment provider.

That means there is no real Razorpay/Stripe charge.

The mock provider immediately returns:

```json
{
  "status": "paid"
}
```

### Checkout Flow

Frontend calls:

```text
POST /api/payments/checkout
```

Payload:

```json
{
  "bookingId": "id",
  "paymentMethod": "Card"
}
```

Backend:

1. Requires login.
2. Finds booking.
3. Checks user owns booking or user is admin.
4. Refuses cancelled bookings.
5. Checks venue is live.
6. Checks owner is active.
7. Checks if already paid.
8. Creates payment record.
9. Calls mock provider.
10. Marks payment as paid.
11. Marks booking paymentStatus as paid.
12. Marks bookingStatus as confirmed.
13. Creates notifications for user, owner, admin.

## 24. Admin Backend Flow

Routes:

```text
backend/src/routes/adminRoutes.js
```

Controller:

```text
backend/src/controllers/adminController.js
```

Important routes:

```text
GET   /api/admin/dashboard
GET   /api/admin/owners
GET   /api/admin/audit-logs
GET   /api/admin/venue-schedules
GET   /api/admin/conflict-logs
PATCH /api/admin/owners/:id/status
PATCH /api/admin/turfs/:id/status
```

Admin dashboard calculates:

- total users
- total owners
- total turfs
- total bookings
- gross revenue
- platform revenue
- owner revenue
- pending owners
- pending turfs
- live venues
- rejected venues
- recent activities

### Owner Approval

Admin approves owner using:

```text
PATCH /api/admin/owners/:id/status
```

Possible statuses:

```text
ACTIVE
PENDING
REJECTED
SUSPENDED
```

When owner is approved:

- `approvalStatus` becomes `ACTIVE`
- `accountStatus` becomes `active`
- notification is sent to owner
- audit log is created

### Turf Approval

Admin approves venue using:

```text
PATCH /api/admin/turfs/:id/status
```

Possible statuses:

```text
LIVE
PENDING
REJECTED
SUSPENDED
```

When venue becomes `LIVE`:

- it becomes visible in public search
- users can book it
- owner receives notification
- audit log is created

## 25. Owner Backend Flow

Routes:

```text
backend/src/routes/ownerRoutes.js
```

Controller:

```text
backend/src/controllers/ownerController.js
```

Routes:

```text
GET /api/owner/dashboard
GET /api/owner/reviews
```

Owner dashboard returns:

- approval status
- disabled sections if owner is pending
- total turfs
- total bookings
- live bookings
- today bookings
- upcoming bookings
- cancelled bookings
- total revenue
- today revenue
- weekly revenue
- monthly revenue
- pending revenue
- completed revenue
- refunded revenue
- revenue by sport
- monthly earnings
- recent bookings

## 26. Review Backend Flow

Routes:

```text
backend/src/routes/reviewRoutes.js
```

Controller:

```text
backend/src/controllers/reviewController.js
```

Important routes:

```text
POST   /api/reviews
GET    /api/reviews/mine
GET    /api/reviews/turf/:id
PUT    /api/reviews/:id
DELETE /api/reviews/:id
```

Review creation rule:

User must have a completed booking for that turf.

After review creation/update/delete:

Backend recalculates:

- turf average rating
- turf total review count

## 27. Favorites Backend Flow

Routes:

```text
backend/src/routes/favoriteRoutes.js
```

Controller:

```text
backend/src/controllers/favoriteController.js
```

Routes:

```text
GET    /api/favorites
POST   /api/favorites/:turfId
DELETE /api/favorites/:turfId
```

Favorites only return live venues from active owners.

## 28. Events And Tournaments

Events:

```text
backend/src/routes/eventRoutes.js
backend/src/controllers/eventController.js
backend/src/models/Event.js
```

Tournaments:

```text
backend/src/routes/tournamentRoutes.js
backend/src/controllers/tournamentController.js
backend/src/models/Tournament.js
```

Owners/admins can create, update, and delete.

Public users can view.

## 29. Notification Backend Flow

Routes:

```text
backend/src/routes/notificationRoutes.js
```

Controller:

```text
backend/src/controllers/notificationController.js
```

Routes:

```text
GET    /api/notifications
POST   /api/notifications
PUT    /api/notifications/:id/read
DELETE /api/notifications/:id
```

Admin can create notifications.

Users can read/delete their notifications.

Admin can broadcast notifications to active accounts.

## 30. Upload System

Upload middleware:

```text
backend/src/middleware/uploadMiddleware.js
```

It uses Multer.

Uploaded files go to:

```text
backend/uploads/
```

Backend serves those files publicly at:

```text
/uploads/filename.jpg
```

Only image uploads are allowed.

Max file size:

```text
5 MB
```

## 31. Frontend Entry Point

Frontend starts at:

```text
frontend/src/main.jsx
```

It wraps the app with:

- React StrictMode
- Redux Provider
- AuthProvider
- React Query QueryClientProvider
- LocationProvider
- BrowserRouter

The actual app component is:

```text
frontend/src/App.jsx
```

`App.jsx`:

- scrolls page to top on navigation
- renders toast viewport
- renders route tree
- wraps app in error boundary
- uses Framer Motion route transitions

## 32. Frontend Routing

Routes are in:

```text
frontend/src/app/routes/AppRoutes.jsx
```

Public routes:

```text
/
/explore
/venues
/search
/venue/:id
/tournaments
/events
/support
/coaching
```

Auth routes:

```text
/login
/register
/forgot-password
```

Booking routes:

```text
/booking/slots
/checkout
/payment
/success
/booking-success
```

User portal routes:

```text
/dashboard
/bookings
/favorites
/bookings/:id
/wallet
/payments
/notifications
/profile
```

Owner routes:

```text
/owner/dashboard
/owner/turfs
/owner/bookings
/owner/reviews
/owner/turfs/:id
/owner/add-turf
/owner/slots
/owner/calendar
/owner/analytics
/owner/revenue
/owner/crm
/owner/athletes/:id
```

Admin routes:

```text
/admin/dashboard
/admin/users
/admin/owners
/admin/turfs
/admin/bookings
/admin/revenue
/admin/analytics
/admin/notifications
/admin/events
/admin/tournaments
/admin/reports
```

## 33. Protected Frontend Routes

Protected route logic:

```text
frontend/src/app/routes/ProtectedRoute.jsx
```

It checks:

1. Auth initialization is finished.
2. User is logged in.
3. User has allowed role.

If not logged in:

```text
redirect to /login
```

If wrong role:

```text
redirect to that role's home page
```

Admin-only pages can show access denied.

## 34. Frontend Auth State

Auth provider:

```text
frontend/src/store/AuthProvider.jsx
```

Redux slice:

```text
frontend/src/store/authSlice.js
```

Local storage service:

```text
frontend/src/services/authService.js
```

Auth service stores:

- JWT token
- public user data

Storage keys:

```text
turfx_auth
turfx_token
turfx_user
```

On app start:

1. Auth slice reads token from localStorage.
2. AuthProvider calls `/api/auth/profile`.
3. If token is valid, user stays logged in.
4. If token is invalid, frontend clears auth.

## 35. Frontend API Client

API client:

```text
frontend/src/services/api/client.js
```

It uses Axios:

```js
baseURL: "/api"
withCredentials: true
timeout: 12000
```

Before every request:

1. It reads stored token.
2. If token exists, adds Authorization header.

If backend returns `401`:

1. Frontend logs user out.
2. Dispatches `turfx:unauthorized`.
3. AuthProvider clears auth state.

## 36. Frontend Data Fetching

The frontend uses React Query.

React Query is configured in:

```text
frontend/src/main.jsx
```

React Query:

- caches API data
- retries failed queries once
- shows global error toasts
- invalidates data after mutations

Example:

When booking is cancelled:

```text
invalidate bookings
invalidate notifications
invalidate turfs
```

Then UI reloads fresh data.

## 37. Frontend API Service Files

Auth API:

```text
frontend/src/services/api/auth.js
```

Turfs API:

```text
frontend/src/services/api/turfs.js
```

Bookings API:

```text
frontend/src/services/api/bookings.js
```

Platform APIs:

```text
frontend/src/services/api/platform.js
```

Normalization:

```text
frontend/src/services/api/normalize.js
```

These files isolate HTTP request details from page components.

Pages do not manually write Axios everywhere.

They call hooks.

Hooks call API service files.

API service files call Axios.

## 38. Frontend Hooks

Turf hooks:

```text
frontend/src/hooks/useTurfs.js
```

Includes:

- `useTurfs`
- `useTurf`
- `useTurfMetadata`
- `useNearbyTurfs`
- `useMyTurfs`
- `useTurfAvailability`
- `useCreateTurf`
- `useUpdateTurf`
- `useDeleteTurf`
- `useUpdateTurfSlots`

Booking hooks:

```text
frontend/src/hooks/useBookings.js
```

Includes:

- `useBookings`
- `useBooking`
- `useNotifications`
- `useCancelBooking`
- `useUpdateBookingStatus`

Platform hooks:

```text
frontend/src/hooks/usePlatform.js
```

Includes favorites, payments, events, tournaments, admin owners, admin users, admin turfs, notifications, reviews, refunds.

Analytics hooks:

```text
frontend/src/hooks/useAnalytics.js
```

Includes:

- `useAnalytics`
- `useOwnerDashboard`

## 39. Frontend Normalization

Normalization file:

```text
frontend/src/services/api/normalize.js
```

Why it exists:

Backend data can have fields like:

```text
_id
pricePerHour
locationDetails
geoLocation
bookingDate
slotStartTime
slotEndTime
```

Frontend wants easier fields:

```text
id
price
location
image
date
time
status
venue
```

So `normalizeTurf`, `normalizeBooking`, `normalizePayment`, `normalizeNotification`, `normalizeEvent`, and `normalizeTournament` convert backend objects into UI objects.

## 40. Frontend Location System

Location provider:

```text
frontend/src/store/LocationProvider.jsx
```

It:

1. Reads saved location from localStorage.
2. Requests browser geolocation once per session.
3. Stores latitude and longitude.
4. Gives user location to search and maps.

Stored format:

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

User location helps:

- nearby turf search
- map display
- distance calculation

## 41. Public Frontend Pages

Public pages are in:

```text
frontend/src/pages/public/PublicPages.jsx
```

Important pages:

- `LandingPage`
- `ExplorePage`
- `SearchResultsPage`
- `VenueDetailsPage`
- `TournamentsPage`
- `TournamentHubPage`
- `EventsPage`
- `EventDetailsPage`
- `SupportPage`
- `CoachingPage`

### Search Results Page

`SearchResultsPage`:

1. Reads URL params:

```text
sport
location
date
radiusKm
latitude
longitude
page
```

2. Builds API params.
3. Calls `useTurfs(params)`.
4. Calls `useTurfMetadata()`.
5. Shows filters.
6. Shows turf cards.
7. Handles pagination.

### Venue Details Page

`VenueDetailsPage`:

1. Reads venue id from URL.
2. Loads turf details.
3. Loads availability for selected date.
4. Shows images, amenities, rules, map, price, available slots.
5. Lets user favorite venue.
6. Sends user to booking page.

## 42. Turf Card Component

Component:

```text
frontend/src/components/shared/TurfCard.jsx
```

It displays:

- image
- venue name
- location
- distance
- rating
- sport format
- price
- Book Now button

Book Now URL:

```text
/booking/slots?venue=<turfId>
```

## 43. Search Filters Component

Component:

```text
frontend/src/components/shared/SearchFilters.jsx
```

It lets user filter by:

- sport
- location
- distance
- date

When filters are applied, the URL query params change.

Then `SearchResultsPage` reloads data from backend.

## 44. Venue Map Component

Component:

```text
frontend/src/components/shared/VenueMap.jsx
```

It uses Leaflet.

It displays:

- venue marker
- user marker if user location exists
- OpenStreetMap tiles

It needs valid:

```text
latitude
longitude
```

If coordinates are missing, it shows "Coordinates pending".

## 45. Booking Frontend Pages

Booking pages are in:

```text
frontend/src/pages/booking/BookingPages.jsx
```

Important pages:

- `SlotSelectionPage`
- `CheckoutPage`
- `PaymentSuccessPage`
- `BookingSuccessPage`

### Slot Selection Page

This page:

1. Reads venue id from URL.
2. Loads venue.
3. Loads availability.
4. Selects sport.
5. Selects date.
6. Selects start time.
7. Selects end time.
8. Checks availability.
9. Saves selected venue/slot into Redux booking state.
10. Navigates to checkout.

### Checkout Page

This page:

1. Reads selected booking data from Redux.
2. Validates user payment form.
3. Creates booking if not already created.
4. Calls payment checkout.
5. Navigates to success page.

Frontend calls:

```text
POST /api/bookings
POST /api/payments/checkout
```

## 46. Booking Pass And QR Code

Utility:

```text
frontend/src/utils/bookingPass.js
```

It uses:

- `qrcode`
- `jspdf`

QR payload includes:

```json
{
  "bookingId": "booking id",
  "userId": "user id",
  "venueId": "venue id",
  "date": "YYYY-MM-DD",
  "slot": "18:00-19:00"
}
```

The QR is generated in the browser.

The PDF pass is also generated in the browser.

Backend does not generate the QR image file.

## 47. Auth Frontend Pages

Auth pages are in:

```text
frontend/src/pages/auth/AuthPages.jsx
```

Pages:

- `LoginPage`
- `RegisterPage`
- `ForgotPasswordPage`

It uses:

- `react-hook-form`
- `zod`
- AuthProvider
- auth API service

Login supports demo account buttons:

- Platform Owner
- Turf Owner
- User

## 48. User Frontend Pages

User pages are in:

```text
frontend/src/pages/athlete/AthletePages.jsx
```

Important pages:

- `DashboardPage`
- `MyBookingsPage`
- `FavoritesPage`
- `BookingDetailsPage`
- `WalletPage`
- `NotificationsPage`
- `ProfilePage`

These pages let users:

- see bookings
- view booking details
- download pass
- view QR
- cancel booking
- manage favorites
- view payments
- update wallet
- read notifications
- update profile
- review completed bookings

## 49. Owner Frontend Pages

Owner pages are in:

```text
frontend/src/pages/owner/OwnerPages.jsx
```

Important pages:

- `OwnerDashboardPage`
- `MyTurfsPage`
- `TurfDetailsOwnerPage`
- `AddTurfWizardPage`
- `SlotManagementPage`
- `CalendarManagementPage`
- `AnalyticsCenterPage`
- `RevenueDashboardPage`
- `OwnerBookingsPage`
- `OwnerReviewsPage`
- `CRMPage`
- `AthleteProfileOwnerPage`

Owner can:

- see dashboard metrics
- add venue
- update venue
- upload images
- enter latitude and longitude
- manage weekly schedule
- manage blackout dates
- view bookings
- check in bookings
- complete bookings
- view earnings
- view reviews
- inspect customers

## 50. Admin Frontend Pages

Admin pages are in:

```text
frontend/src/pages/admin/AdminPages.jsx
```

Important pages:

- `AdminDashboardPage`
- `UserManagementPage`
- `TurfOwnerManagementPage`
- `TurfManagementPage`
- `BookingManagementPage`
- `PlatformRevenuePage`
- `PlatformAnalyticsPage`
- `PlatformNotificationsPage`
- `EventManagementPage`
- `TournamentManagementPage`
- `ReportsPage`

Admin can:

- approve owners
- reject owners
- approve venues
- reject venues
- manage users
- view all bookings
- view platform revenue
- view owner revenue
- refund payments
- create notifications
- manage events
- manage tournaments
- view reports

## 51. Full Search Workflow

Example:

User searches:

```text
/search?sport=Basketball&location=Delhi&date=2026-07-01
```

Steps:

1. Browser opens React route `/search`.
2. `SearchResultsPage` reads query params.
3. It creates API params:

```js
{
  sport: "Basketball",
  city: "Delhi",
  date: "2026-07-01"
}
```

4. It calls `useTurfs(params)`.
5. `useTurfs` calls `turfsApi.list(params)`.
6. `turfsApi.list` calls:

```text
GET /api/turfs
```

7. Vite proxy sends request to backend.
8. Backend route calls `getTurfs`.
9. Backend filters MongoDB.
10. Backend only includes live venues from active owners.
11. Backend checks availability if date exists.
12. Backend returns data.
13. Frontend normalizes turfs.
14. `TurfCard` renders each venue.

## 52. Full Booking Workflow

1. User clicks `Book Now`.
2. Browser goes to:

```text
/booking/slots?venue=<venueId>
```

3. `SlotSelectionPage` loads venue with `useTurf`.
4. It loads availability with `useTurfAvailability`.
5. User chooses sport, date, start time, end time.
6. User clicks Check Availability.
7. Frontend checks against loaded timeline.
8. User clicks Continue to Checkout.
9. Checkout page opens.
10. User submits payment form.
11. Frontend calls:

```text
POST /api/bookings
```

12. Backend validates slot again.
13. Backend creates pending booking.
14. Frontend calls:

```text
POST /api/payments/checkout
```

15. Backend mock payment returns paid.
16. Backend updates booking to confirmed.
17. Backend creates notifications.
18. Frontend shows success page.
19. User can view booking detail.
20. Frontend generates QR and PDF pass.

## 53. Full Owner Approval Workflow

1. Owner registers from frontend.
2. Frontend calls:

```text
POST /api/auth/register-owner
```

3. Backend creates owner with `PENDING`.
4. Backend notifies admins.
5. Owner can log in.
6. Owner dashboard shows pending/disabled sections.
7. Admin opens owner management.
8. Admin approves owner:

```text
PATCH /api/admin/owners/:id/status
```

9. Backend sets owner active.
10. Backend creates audit log.
11. Backend notifies owner.
12. Owner can now create/manage venues.

## 54. Full Venue Approval Workflow

1. Active owner creates venue.
2. Frontend calls:

```text
POST /api/turfs
```

3. Backend creates venue with `PENDING`.
4. Backend notifies admins.
5. Venue does not show in public search.
6. Users cannot book it.
7. Admin reviews venue.
8. Admin approves:

```text
PATCH /api/admin/turfs/:id/status
```

9. Backend sets status to `LIVE`.
10. Backend marks `isApproved` true.
11. Backend creates audit log.
12. Backend notifies owner.
13. Venue now appears in public search.
14. Users can book it.

## 55. Full Payment And Revenue Workflow

1. User creates booking.
2. Booking starts as:

```text
bookingStatus: pending
paymentStatus: pending
```

3. User checks out.
4. Backend creates Payment:

```text
paymentStatus: pending
```

5. Mock provider marks it paid.
6. Backend calculates:

```text
platformFee = amount * 0.10
ownerRevenue = amount * 0.90
```

7. Payment becomes:

```text
paymentStatus: paid
```

8. Booking becomes:

```text
bookingStatus: confirmed
paymentStatus: paid
```

9. Owner dashboard includes owner revenue.
10. Admin dashboard includes platform revenue.

## 56. Full Review Workflow

1. User books venue.
2. User pays.
3. Owner checks in user.
4. Owner marks booking completed.
5. User opens booking detail.
6. User submits review.
7. Frontend calls:

```text
POST /api/reviews
```

8. Backend confirms completed booking exists.
9. Backend creates review.
10. Backend recalculates turf rating.
11. Backend notifies owner.

## 57. Seed System

Seed file:

```text
backend/src/seed/seed.js
```

Run:

```bash
npm run seed
```

Seed does:

1. Connects to MongoDB.
2. Creates/verifies platform owner.
3. Creates demo accounts.
4. Creates demo turfs.
5. Creates demo bookings, payments, reviews, notifications, events, tournaments.

Demo accounts from README:

```text
Platform Owner: admin@turfx.com / Admin@123
Turf Owner:     owner1@turfx.com / Owner@123
User:           user1@turfx.com / User@123
```

## 58. Test System

Backend tests:

```text
backend/test/workflows.test.js
```

Run:

```bash
npm test
```

Tests use:

- Node test runner
- Supertest
- mongodb-memory-server

Tests cover:

- auth
- owner approval
- venue approval
- booking creation
- duplicate booking prevention
- payment checkout
- revenue split
- dashboard revenue
- favorites
- booking status updates
- reviews
- notifications
- audit logs
- owner rejection
- venue rejection
- refund behavior

## 59. Important Security Logic

Security middleware:

```text
backend/src/middleware/securityMiddleware.js
```

Server also uses:

- Helmet
- CORS
- rate limiting
- unsafe key rejection
- JWT auth
- role authorization
- upload file filtering
- express-validator
- Mongoose validation

Important rules:

- Users cannot access other users' bookings.
- Owners can only manage their own turfs.
- Admin can manage everything.
- Pending owners cannot create venues.
- Pending/rejected venues are hidden from public search.
- Bookings cannot be made for inactive owners or non-live venues.
- Reviews require completed booking.
- Duplicate bookings are blocked.

## 60. Where Each Major Feature Lives

Authentication:

```text
backend/src/controllers/authController.js
frontend/src/pages/auth/AuthPages.jsx
frontend/src/store/authSlice.js
frontend/src/store/AuthProvider.jsx
```

Turfs:

```text
backend/src/controllers/turfController.js
backend/src/models/Turf.js
frontend/src/hooks/useTurfs.js
frontend/src/pages/public/PublicPages.jsx
frontend/src/pages/owner/OwnerPages.jsx
```

Bookings:

```text
backend/src/controllers/bookingController.js
backend/src/models/Booking.js
frontend/src/pages/booking/BookingPages.jsx
frontend/src/pages/athlete/AthletePages.jsx
```

Payments:

```text
backend/src/controllers/paymentController.js
backend/src/models/Payment.js
backend/src/services/paymentService.js
frontend/src/hooks/usePlatform.js
frontend/src/utils/bookingPass.js
```

Availability:

```text
backend/src/services/availabilityService.js
frontend/src/pages/booking/BookingPages.jsx
```

Geocoding:

```text
backend/src/services/geocodingService.js
frontend/src/components/shared/VenueMap.jsx
frontend/src/store/LocationProvider.jsx
```

Admin:

```text
backend/src/controllers/adminController.js
frontend/src/pages/admin/AdminPages.jsx
```

Owner:

```text
backend/src/controllers/ownerController.js
frontend/src/pages/owner/OwnerPages.jsx
```

Reviews:

```text
backend/src/controllers/reviewController.js
backend/src/models/Review.js
```

Favorites:

```text
backend/src/controllers/favoriteController.js
frontend/src/hooks/usePlatform.js
```

Notifications:

```text
backend/src/controllers/notificationController.js
backend/src/models/Notification.js
frontend/src/components/shared/NotificationBell.jsx
frontend/src/pages/athlete/AthletePages.jsx
```

## 61. Complete Data Relationship Map

User:

```text
User can own many Turfs if role is owner.
User can create many Bookings if role is user.
User can receive many Notifications.
User can have many favorite Turfs.
User can create Reviews after completed Bookings.
```

Turf:

```text
Turf belongs to one owner User.
Turf has many Bookings.
Turf has many Reviews.
Turf has many Payments through Bookings.
Turf has one schedule.
Turf has GeoJSON coordinates.
```

Booking:

```text
Booking belongs to one User.
Booking belongs to one Turf.
Booking belongs to one owner through ownerId.
Booking can have one or more Payment records, usually one paid payment.
```

Payment:

```text
Payment belongs to one User.
Payment belongs to one Booking.
Payment belongs to one owner.
Payment belongs to one venue.
```

Review:

```text
Review belongs to one User.
Review belongs to one Turf.
Review updates Turf rating and totalReviews.
```

Notification:

```text
Notification belongs to one User.
Notification may point to booking, payment, owner, turf, or admin page through metadata and targetUrl.
```

## 62. Simple Explanation Script For Tutor

TURFX is a full-stack turf booking platform. The React frontend runs on Vite and communicates with an Express backend through `/api` routes. Vite proxies those requests to the backend server. The backend uses MongoDB through Mongoose models for users, turfs, bookings, payments, reviews, notifications, events, tournaments, audit logs, and conflict logs.

Users can search approved live turfs, view venue details, check slot availability, create a booking, pay through a mock payment provider, and receive a confirmed booking with QR/PDF pass. Owners register separately and must be approved by the platform owner before they can create venues. Venues submitted by owners also require admin approval before they become live. Admins manage approvals, users, turfs, bookings, revenue, reports, and notifications.

The backend validates everything again even if the frontend already checked it. Booking availability is calculated from turf schedules, blackout dates, existing bookings, and buffer minutes. Duplicate bookings are prevented using both logic checks and unique occupancy keys in MongoDB. Payments are mock payments, but they still create payment records, update booking status, calculate platform fee and owner revenue, and create notifications.

## 63. The Most Important Files To Study First

Start here:

```text
README.md
TUTOR_PROJECT_EXPLANATION.md
COMPLETE_PROJECT_EXPLANATION.md
```

Then backend:

```text
backend/src/server.js
backend/src/models/User.js
backend/src/models/Turf.js
backend/src/models/Booking.js
backend/src/models/Payment.js
backend/src/controllers/authController.js
backend/src/controllers/turfController.js
backend/src/controllers/bookingController.js
backend/src/controllers/paymentController.js
backend/src/services/availabilityService.js
backend/src/services/geocodingService.js
```

Then frontend:

```text
frontend/src/main.jsx
frontend/src/app/routes/AppRoutes.jsx
frontend/src/services/api/client.js
frontend/src/hooks/useTurfs.js
frontend/src/hooks/useBookings.js
frontend/src/hooks/usePlatform.js
frontend/src/services/api/normalize.js
frontend/src/pages/public/PublicPages.jsx
frontend/src/pages/booking/BookingPages.jsx
frontend/src/pages/owner/OwnerPages.jsx
frontend/src/pages/admin/AdminPages.jsx
```

## 64. Final Mental Model

Think of the project like this:

```text
Browser UI
  -> React page
  -> React hook
  -> API service
  -> Axios client
  -> Vite proxy
  -> Express route
  -> Middleware
  -> Controller
  -> Service helper
  -> Mongoose model
  -> MongoDB
  -> JSON response
  -> Normalize data
  -> React renders UI
```

Every important action follows this same pattern.

Example booking:

```text
Click checkout
  -> CheckoutPage
  -> bookingsApi.reserve
  -> POST /api/bookings
  -> bookingController.createBooking
  -> availabilityService.validateSlotRequest
  -> Booking.create
  -> MongoDB
  -> response
  -> POST /api/payments/checkout
  -> paymentController.createPayment
  -> MockPaymentProvider
  -> Payment saved
  -> Booking confirmed
  -> Notifications created
  -> success page
```

That is the whole TURFX project from A to Z.
