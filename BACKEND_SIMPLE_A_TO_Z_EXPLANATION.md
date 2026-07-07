# TURFX Backend Simple A-to-Z Explanation

This file explains only the backend in very simple words.

Main idea:

```text
Frontend sends request
-> Backend receives request
-> Backend checks security/validation
-> Backend reads or saves data in MongoDB
-> Backend sends JSON response back to frontend
```

## 1. What The Backend Does

The backend is the brain of TURFX.

It is responsible for:

- login and register
- checking user roles
- saving users
- saving turf venues
- saving bookings
- checking slot availability
- saving payments
- calculating platform fee and owner revenue
- saving reviews
- saving favorites
- saving notifications
- approving owners
- approving venues
- managing tournaments
- managing coaching requests
- uploading images
- sending API responses to frontend

Backend folder:

```text
backend/
```

Backend main file:

```text
backend/src/server.js
```

## 2. Backend Data Flow In One Line

Every backend feature mostly follows this pattern:

```text
Route -> Middleware -> Controller -> Service -> Model -> MongoDB -> Response
```

Example booking:

```text
POST /api/bookings
-> check login
-> check user role
-> bookingController.createBooking
-> availabilityService checks slot
-> Booking model saves booking
-> MongoDB stores booking
-> backend returns booking JSON
```

## 3. Backend Folder Meaning

```text
backend/src/config
```

Database connection setup.

```text
backend/src/routes
```

Defines API URLs like `/api/auth/login`, `/api/turfs`, `/api/bookings`.

```text
backend/src/controllers
```

Main logic for each API. Controllers decide what to do with the request.

```text
backend/src/models
```

MongoDB schemas. These files decide how data is saved.

```text
backend/src/services
```

Helper business logic, like availability checking, payment provider, geocoding.

```text
backend/src/middleware
```

Middle checks before controller runs, like login check, admin check, upload check.

```text
backend/src/utils
```

Small helper functions, like token creation, response format, approval status.

```text
backend/src/seed
```

Demo data creation.

```text
backend/src/docs
```

Swagger API docs.

```text
backend/uploads
```

Uploaded images are stored here.

## 4. `server.js` Simple Explanation

File:

```text
backend/src/server.js
```

This is the backend starting point.

It does these things:

1. Loads `.env`.
2. Creates Express app.
3. Adds security.
4. Allows frontend requests using CORS.
5. Reads JSON request body.
6. Reads cookies.
7. Serves images from `/uploads`.
8. Adds rate limit.
9. Connects all API route files.
10. Handles errors.
11. Connects MongoDB.
12. Starts backend server on port 5000.

Important route mounting:

```js
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/coaching", coachingRoutes);
```

Meaning:

```text
If frontend calls /api/bookings,
server.js sends that request to bookingRoutes.
```

## 5. Database Connection

File:

```text
backend/src/config/database.js
```

This file connects backend to MongoDB.

It reads:

```text
MONGO_URI
```

from:

```text
backend/.env
```

If MongoDB is connected, backend can save and read data.

If MongoDB is not connected, real app data will not work.

## 6. Environment File

File:

```text
backend/.env
```

Important values:

```text
PORT=5000
MONGO_URI=your mongodb url
JWT_SECRET=secret for login token
CLIENT_URL=http://localhost:5173
PAYMENT_PROVIDER=mock
ADMIN_EMAIL=admin email
ADMIN_PASSWORD=admin password
```

Simple meaning:

```text
.env tells backend how to connect to database,
how to create login tokens,
and which frontend URL is allowed.
```

## 7. Models: Where Data Is Saved

Models are database structure files.

They live in:

```text
backend/src/models
```

### User Model

File:

```text
backend/src/models/User.js
```

MongoDB collection:

```text
users
```

Stores:

- name
- email
- phone
- password
- role
- owner approval status
- profile image
- wallet balance
- favorite turfs

Roles:

```text
user
owner
admin
```

Important:

Password is not saved directly. It is hashed using bcrypt.

### Turf Model

File:

```text
backend/src/models/Turf.js
```

MongoDB collection:

```text
turfs
```

Stores:

- turf name
- description
- address
- city
- state
- latitude
- longitude
- sports supported
- price per hour
- sport-wise prices
- images
- amenities
- rating
- owner id
- approval status
- schedule

Turf schedule stores:

- opening days
- opening time
- closing time
- slot duration
- buffer time
- blackout dates

### Booking Model

File:

```text
backend/src/models/Booking.js
```

MongoDB collection:

```text
bookings
```

Stores:

- user id
- turf id
- owner id
- sport
- booking date
- start time
- end time
- hours booked
- total amount
- payment status
- booking status
- slot lock keys

Booking status examples:

```text
pending
confirmed
checked_in
completed
cancelled
```

Payment status examples:

```text
pending
paid
failed
refunded
```

### Payment Model

File:

```text
backend/src/models/Payment.js
```

MongoDB collection:

```text
payments
```

Stores:

- user id
- booking id
- owner id
- venue id
- total amount
- platform fee
- owner revenue
- payment method
- payment status
- transaction id

Simple split:

```text
10% platform fee
90% owner revenue
```

### Review Model

File:

```text
backend/src/models/Review.js
```

MongoDB collection:

```text
reviews
```

Stores:

- user id
- turf id
- rating
- comment

Rule:

One user can review one turf only once.

### Notification Model

File:

```text
backend/src/models/Notification.js
```

MongoDB collection:

```text
notifications
```

Stores:

- user id
- title
- message
- read/unread
- type
- target URL
- metadata

Used for:

- booking alerts
- payment alerts
- approval alerts
- revenue alerts
- review alerts
- tournament alerts
- coaching alerts

### Tournament Model

File:

```text
backend/src/models/Tournament.js
```

MongoDB collection:

```text
tournaments
```

Stores:

- title
- description
- sport
- prize pool
- entry fee
- max teams
- start date
- end date
- participants
- owner id
- turf id

### Tournament Registration Model

File:

```text
backend/src/models/TournamentRegistration.js
```

MongoDB collection:

```text
tournamentregistrations
```

Stores:

- user id
- tournament id
- team name
- captain name
- entry fee
- payment status
- approval status
- transaction id

### Coach Booking Model

File:

```text
backend/src/models/CoachBooking.js
```

MongoDB collection:

```text
coachbookings
```

Stores:

- user id
- owner id
- turf id
- coach id
- coach name
- sport
- timing
- monthly fee
- payment status
- approval status

### Audit Log Model

File:

```text
backend/src/models/AuditLog.js
```

MongoDB collection:

```text
auditlogs
```

Stores admin actions:

- owner approved
- owner rejected
- venue approved
- venue rejected
- venue submitted

### Booking Conflict Log Model

File:

```text
backend/src/models/BookingConflictLog.js
```

MongoDB collection:

```text
bookingconflictlogs
```

Stores failed booking attempts:

- slot already booked
- venue closed
- blackout date
- invalid time
- buffer conflict

## 8. Routes: API URL Files

Routes live in:

```text
backend/src/routes
```

Route files only decide:

```text
Which URL should call which controller function?
Which middleware should run before controller?
```

### Auth Routes

File:

```text
backend/src/routes/authRoutes.js
```

Important APIs:

```text
POST /api/auth/register
POST /api/auth/register-owner
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile
PUT  /api/auth/profile
POST /api/auth/wallet
PUT  /api/auth/change-password
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

Data saved in:

```text
users
notifications
```

### Turf Routes

File:

```text
backend/src/routes/turfRoutes.js
```

Important APIs:

```text
GET    /api/turfs
GET    /api/turfs/meta
GET    /api/turfs/nearby
GET    /api/turfs/mine
GET    /api/turfs/:id
GET    /api/turfs/:id/availability
POST   /api/turfs
PUT    /api/turfs/:id
POST   /api/turfs/:id/resubmit
PUT    /api/turfs/:id/slots
DELETE /api/turfs/:id
```

Data saved in:

```text
turfs
notifications
auditlogs
uploads folder
```

### Booking Routes

File:

```text
backend/src/routes/bookingRoutes.js
```

Important APIs:

```text
POST  /api/bookings
GET   /api/bookings
GET   /api/bookings/:id
PUT   /api/bookings/cancel/:id
PATCH /api/bookings/:id/status
```

Data saved in:

```text
bookings
notifications
bookingconflictlogs
```

### Payment Routes

File:

```text
backend/src/routes/paymentRoutes.js
```

Important APIs:

```text
POST  /api/payments/create
POST  /api/payments/checkout
GET   /api/payments/history
PATCH /api/payments/:id/refund
```

Data saved in:

```text
payments
bookings
notifications
```

### Admin Routes

File:

```text
backend/src/routes/adminRoutes.js
```

Important APIs:

```text
GET   /api/admin/dashboard
GET   /api/admin/owners
GET   /api/admin/audit-logs
GET   /api/admin/venue-schedules
GET   /api/admin/conflict-logs
PATCH /api/admin/owners/:id/status
PATCH /api/admin/turfs/:id/status
```

Data saved in:

```text
users
turfs
notifications
auditlogs
```

### Owner Routes

File:

```text
backend/src/routes/ownerRoutes.js
```

Important APIs:

```text
GET /api/owner/dashboard
GET /api/owner/reviews
```

Mostly reads data from:

```text
turfs
bookings
payments
reviews
```

### Review Routes

File:

```text
backend/src/routes/reviewRoutes.js
```

Important APIs:

```text
POST   /api/reviews
GET    /api/reviews/mine
GET    /api/reviews/turf/:id
PUT    /api/reviews/:id
DELETE /api/reviews/:id
```

Data saved in:

```text
reviews
turfs
notifications
```

### Favorite Routes

File:

```text
backend/src/routes/favoriteRoutes.js
```

Important APIs:

```text
GET    /api/favorites
POST   /api/favorites/:turfId
DELETE /api/favorites/:turfId
```

Data saved in:

```text
users collection, favorites array
```

### Notification Routes

File:

```text
backend/src/routes/notificationRoutes.js
```

Important APIs:

```text
GET    /api/notifications
POST   /api/notifications
PUT    /api/notifications/:id/read
DELETE /api/notifications/:id
```

Data saved in:

```text
notifications
```

### Tournament Routes

File:

```text
backend/src/routes/tournamentRoutes.js
```

Important APIs:

```text
POST   /api/tournaments
GET    /api/tournaments
GET    /api/tournaments/:id
PUT    /api/tournaments/:id
DELETE /api/tournaments/:id
POST   /api/tournaments/:id/register
GET    /api/tournaments/mine/registrations
GET    /api/tournaments/owner/mine
GET    /api/tournaments/owner/registrations
PATCH  /api/tournaments/registrations/:id/status
```

Data saved in:

```text
tournaments
tournamentregistrations
notifications
```

### Coaching Routes

File:

```text
backend/src/routes/coachingRoutes.js
```

Important APIs:

```text
GET   /api/coaching/coaches
POST  /api/coaching/requests
GET   /api/coaching/mine
GET   /api/coaching/owner/requests
PATCH /api/coaching/requests/:id/status
```

Data saved in:

```text
coachbookings
notifications
```

## 9. Controllers: Where Main Logic Happens

Controllers live in:

```text
backend/src/controllers
```

Simple meaning:

```text
Routes receive the URL.
Controllers do the actual work.
```

### `authController.js`

Handles:

- user registration
- owner registration
- login
- logout
- profile fetch
- profile update
- wallet update
- change password
- forgot password
- reset password

Saves data in:

```text
users
notifications
```

### `turfController.js`

Handles:

- public turf list
- turf search
- nearby turfs
- turf details
- turf metadata
- geocoding address
- owner turfs
- turf availability
- create turf
- update turf
- resubmit turf
- delete turf
- update slots

Saves data in:

```text
turfs
notifications
auditlogs
uploads
bookingconflictlogs when availability fails
```

### `bookingController.js`

Handles:

- create booking
- get bookings
- get one booking
- cancel booking
- update booking status

Saves data in:

```text
bookings
notifications
bookingconflictlogs
```

### `paymentController.js`

Handles:

- checkout payment
- payment history
- refund payment

Saves data in:

```text
payments
bookings
notifications
```

### `adminController.js`

Handles:

- admin dashboard
- owner list
- approve/reject/suspend owners
- approve/reject/suspend venues
- venue schedules
- audit logs
- conflict logs

Saves data in:

```text
users
turfs
notifications
auditlogs
```

Reads from:

```text
bookings
payments
bookingconflictlogs
```

### `ownerController.js`

Handles:

- owner dashboard
- owner reviews

Mostly reads from:

```text
turfs
bookings
payments
reviews
```

### `reviewController.js`

Handles:

- create review
- update review
- delete review
- get my reviews
- get turf reviews

Saves data in:

```text
reviews
turfs rating fields
notifications
```

### `favoriteController.js`

Handles:

- get favorites
- add favorite
- remove favorite

Saves data in:

```text
users favorites array
```

### `notificationController.js`

Handles:

- get notifications
- create notification
- mark read
- delete notification

Saves data in:

```text
notifications
```

### `userController.js`

Handles admin user management:

- list users
- get one user
- update user
- delete user

Saves data in:

```text
users
uploads if profile image is changed
```

### `tournamentController.js`

Handles:

- create tournament
- list tournaments
- update tournament
- delete tournament
- user tournament registration
- owner approval for registrations

Saves data in:

```text
tournaments
tournamentregistrations
notifications
```

### `coachingController.js`

Handles:

- generate available coaches from live turfs
- create coaching request
- get user coaching requests
- get owner coaching requests
- approve/reject coaching request

Saves data in:

```text
coachbookings
notifications
```

Important:

There is no separate Coach model. Coaches are generated from live turf data.

## 10. Middleware: Checks Before Controllers

Middleware lives in:

```text
backend/src/middleware
```

### `authMiddleware.js`

Important functions:

```text
protect
optionalProtect
authorizeRoles
```

`protect` means:

```text
User must be logged in.
```

It reads JWT token from:

```text
Authorization header
or token cookie
```

Then it loads the user from MongoDB and adds:

```text
req.user
```

### `adminMiddleware.js`

Allows only:

```text
admin
```

Used for admin routes.

### `ownerMiddleware.js`

Checks owner/admin access.

Important functions:

```text
ownerOrAdmin
activeOwnerOrAdmin
```

`activeOwnerOrAdmin` blocks pending owners from creating venues.

### `uploadMiddleware.js`

Handles image uploads.

Images are stored in:

```text
backend/uploads
```

### `securityMiddleware.js`

Adds:

- rate limiting
- unsafe key rejection

This protects backend from too many requests and unsafe MongoDB-style keys.

### `errorMiddleware.js`

Handles errors and sends clean JSON error response.

Example:

```json
{
  "success": false,
  "message": "Turf not found"
}
```

## 11. Services: Helper Business Logic

Services live in:

```text
backend/src/services
```

### `availabilityService.js`

Used by:

```text
turfController
bookingController
```

It checks:

- booking date
- time format
- opening/closing time
- minimum booking duration
- slot duration
- buffer time
- blackout dates
- existing bookings
- sport price
- slot conflict

This is the main file for booking slot logic.

### `paymentService.js`

Handles payment provider.

Current payment provider:

```text
mock
```

Meaning:

```text
No real money is charged.
Backend pretends payment succeeded.
```

### `geocodingService.js`

Used for venue location.

It:

- validates latitude
- validates longitude
- builds GeoJSON location
- can geocode address
- can calculate distance

### `venueApprovalService.js`

Used for venue status.

It controls:

- pending venue
- approved/live venue
- rejected venue
- suspended venue
- need changes venue
- public visibility

### `emailService.js`

Used for forgot password.

If SMTP is not configured, it can simulate email in development.

### `conflictLogService.js`

Saves booking conflict logs.

Example:

```text
User tried to book 6 PM to 7 PM,
but another booking already exists.
```

That failed attempt is saved in:

```text
bookingconflictlogs
```

## 12. Utils: Small Helper Files

Utils live in:

```text
backend/src/utils
```

### `generateToken.js`

Creates JWT login token.

### `responseHandler.js`

Creates common success/error response format.

### `approval.js`

Handles owner and venue approval status helper logic.

### `turfImages.js`

Handles turf image fields and fallback generated media logic.

## 13. Simple Auth Flow

### Register User

Frontend calls:

```text
POST /api/auth/register
```

Backend:

1. Checks email is not already used.
2. Creates user.
3. Hashes password.
4. Saves user in MongoDB.
5. Creates JWT token.
6. Sends user and token to frontend.

Data saved in:

```text
users
```

### Register Owner

Frontend calls:

```text
POST /api/auth/register-owner
```

Backend:

1. Creates owner user.
2. Sets owner as pending.
3. Saves owner in users collection.
4. Sends notification to admins.
5. Sends response to frontend.

Data saved in:

```text
users
notifications
```

### Login

Frontend calls:

```text
POST /api/auth/login
```

Backend:

1. Finds user by email.
2. Compares password.
3. Checks owner status if role is owner.
4. Creates JWT token.
5. Sends user and token.

Frontend stores token in localStorage.

## 14. Simple Turf Search Flow

Frontend calls:

```text
GET /api/turfs?sport=Football&city=Delhi&date=2026-07-02
```

Backend:

1. Receives filters.
2. Builds MongoDB filter.
3. Only includes live venues.
4. Only includes venues from active owners.
5. Filters by sport/city/date.
6. Reads turfs from MongoDB.
7. Sends turf list to frontend.

Data comes from:

```text
turfs
users for owner status
```

Data goes to:

```text
frontend venue cards
```

## 15. Simple Turf Create Flow

Owner submits add venue form.

Frontend calls:

```text
POST /api/turfs
```

Backend:

1. Checks user is logged in.
2. Checks user is active owner/admin.
3. Uploads images to `backend/uploads`.
4. Reads venue form data.
5. Geocodes location.
6. Creates Turf document.
7. Saves turf as pending if owner created it.
8. Sends notification to admins.
9. Creates audit log.

Data saved in:

```text
turfs
uploads folder
notifications
auditlogs
```

Data goes next:

```text
Admin sees pending venue in admin panel.
```

## 16. Simple Venue Approval Flow

Admin approves venue.

Frontend calls:

```text
PATCH /api/admin/turfs/:id/status
```

Backend:

1. Checks admin login.
2. Finds turf.
3. Updates status to approved/live.
4. Saves turf.
5. Creates audit log.
6. Sends notification to owner.

Data saved in:

```text
turfs
auditlogs
notifications
```

Data goes next:

```text
Venue appears in public search.
Users can book it.
```

## 17. Simple Availability Flow

Frontend calls:

```text
GET /api/turfs/:id/availability?date=2026-07-02
```

Backend:

1. Finds turf.
2. Checks venue is live.
3. Reads turf schedule.
4. Reads bookings for that turf/date.
5. Generates all possible slots.
6. Marks booked/blocked slots.
7. Sends available slots to frontend.

Data comes from:

```text
turfs
bookings
```

Data goes to:

```text
booking slot page
```

## 18. Simple Booking Flow

Frontend calls:

```text
POST /api/bookings
```

Payload:

```json
{
  "turfId": "id",
  "bookingDate": "2026-07-02",
  "slotStartTime": "18:00",
  "slotEndTime": "19:00",
  "sport": "Football"
}
```

Backend:

1. Checks user is logged in.
2. Checks user role is user/admin.
3. Finds turf.
4. Checks turf is live.
5. Checks owner is active.
6. Checks date is not past.
7. Checks sport is supported.
8. Checks slot is open in schedule.
9. Checks slot is not already booked.
10. Checks buffer time.
11. Calculates price.
12. Creates booking.
13. Creates notifications.

Data saved in:

```text
bookings
notifications
```

If slot is not available, data saved in:

```text
bookingconflictlogs
```

Data goes next:

```text
Frontend checkout page uses booking id for payment.
```

## 19. Simple Payment Flow

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

1. Finds booking.
2. Checks user owns booking.
3. Checks booking is not cancelled.
4. Creates payment record.
5. Calls mock payment provider.
6. Marks payment as paid.
7. Marks booking as confirmed.
8. Calculates platform fee.
9. Calculates owner revenue.
10. Sends notifications.

Data saved in:

```text
payments
bookings
notifications
```

Data goes next:

```text
User sees success page.
Owner sees revenue.
Admin sees platform fee.
```

## 20. Simple Refund Flow

Admin calls:

```text
PATCH /api/payments/:id/refund
```

Backend:

1. Checks admin.
2. Finds paid payment.
3. Marks payment refunded.
4. Marks booking cancelled.
5. Clears booking slot locks.
6. Sends notification to user.

Data saved in:

```text
payments
bookings
notifications
```

Data goes next:

```text
Slot becomes available again.
```

## 21. Simple Review Flow

User calls:

```text
POST /api/reviews
```

Backend:

1. Checks user login.
2. Checks user has completed booking for that turf.
3. Saves review.
4. Recalculates turf rating.
5. Updates turf rating and review count.

Data saved in:

```text
reviews
turfs
notifications
```

Data goes next:

```text
Venue rating changes on frontend.
```

## 22. Simple Favorite Flow

User calls:

```text
POST /api/favorites/:turfId
```

Backend:

1. Checks user login.
2. Finds turf.
3. Adds turf id to user's favorites array.

Data saved in:

```text
users.favorites
```

Data goes next:

```text
Favorites page shows saved turf.
```

## 23. Simple Notification Flow

Backend creates notifications automatically.

Examples:

- booking created
- payment successful
- owner approved
- venue approved
- refund done
- coaching request approved
- tournament registration approved

Frontend calls:

```text
GET /api/notifications
```

Backend reads:

```text
notifications
```

and sends them to frontend.

## 24. Simple Admin Dashboard Flow

Frontend calls:

```text
GET /api/admin/dashboard
```

Backend counts:

- users
- owners
- turfs
- bookings
- revenue
- pending owners
- pending venues
- recent activities

Data comes from:

```text
users
turfs
bookings
payments
```

No new data is saved. It only reads and calculates.

## 25. Simple Owner Dashboard Flow

Frontend calls:

```text
GET /api/owner/dashboard
```

Backend reads:

```text
turfs owned by owner
bookings for those turfs
payments for those turfs
```

Backend calculates:

- total turfs
- total bookings
- today bookings
- upcoming bookings
- revenue
- monthly earnings
- sport-wise revenue

No new data is saved. It only reads and calculates.

## 26. Simple Tournament Flow

Owner/admin creates tournament:

```text
POST /api/tournaments
```

Backend saves:

```text
tournaments
```

User registers:

```text
POST /api/tournaments/:id/register
```

Backend:

1. Finds tournament.
2. Checks tournament is open.
3. Creates paid registration.
4. Sets approval as pending.
5. Notifies owner.

Data saved in:

```text
tournamentregistrations
notifications
```

Owner approves:

```text
PATCH /api/tournaments/registrations/:id/status
```

Backend saves approval status and updates tournament participants.

## 27. Simple Coaching Flow

Frontend asks for coaches:

```text
GET /api/coaching/coaches
```

Backend:

1. Finds live turfs.
2. Generates coach plans from turf sports.
3. Sends coach list.

User requests coaching:

```text
POST /api/coaching/requests
```

Backend:

1. Finds generated coach.
2. Creates coach booking.
3. Marks payment as paid.
4. Sets owner approval as pending.
5. Notifies user and owner.

Data saved in:

```text
coachbookings
notifications
```

Owner approves:

```text
PATCH /api/coaching/requests/:id/status
```

Backend updates:

```text
coachbookings.approvalStatus
```

## 28. Simple Upload Flow

Images are uploaded when:

- owner adds turf images
- user/admin updates profile image

Backend uses:

```text
multer
```

Files are saved in:

```text
backend/uploads
```

Image URL is saved in MongoDB.

Example:

```text
backend/uploads/abc.jpg
```

is served as:

```text
/uploads/abc.jpg
```

Frontend can display it as an image.

## 29. Simple Password Reset Flow

User calls:

```text
POST /api/auth/forgot-password
```

Backend:

1. Finds user by email.
2. Creates reset token.
3. Saves hashed token and expiry in user document.
4. Sends reset email or simulates email.

User resets password:

```text
POST /api/auth/reset-password
```

Backend:

1. Checks token.
2. Saves new password.
3. Password is hashed.
4. Clears reset token fields.

Data saved in:

```text
users
```

## 30. Where Data Comes From

Data comes from frontend requests.

Examples:

```text
Login form sends email/password.
Add turf form sends venue details.
Booking page sends turf/date/time/sport.
Checkout page sends booking id.
Review form sends rating/comment.
Admin panel sends approval status.
```

Backend also reads existing data from MongoDB.

Examples:

```text
Search reads turfs.
Availability reads turfs and bookings.
Payment reads booking.
Dashboard reads users, turfs, bookings, payments.
```

## 31. Where Data Is Saved

Simple table:

```text
User register       -> users
Owner register      -> users, notifications
Login               -> no database save, token sent to frontend
Profile update      -> users, uploads if image
Wallet update       -> users, notifications
Create turf         -> turfs, uploads, notifications, auditlogs
Update turf         -> turfs, uploads, notifications
Update slots        -> turfs.schedule
Approve owner       -> users, notifications, auditlogs
Approve venue       -> turfs, notifications, auditlogs
Create booking      -> bookings, notifications
Booking conflict    -> bookingconflictlogs
Payment checkout    -> payments, bookings, notifications
Refund              -> payments, bookings, notifications
Review              -> reviews, turfs, notifications
Favorite            -> users.favorites
Tournament          -> tournaments
Tournament register -> tournamentregistrations, notifications
Coaching request    -> coachbookings, notifications
Notification read   -> notifications
```

## 32. Where Data Goes Back To Frontend

Backend always sends JSON response.

Example success:

```json
{
  "success": true,
  "message": "Booking created",
  "data": {
    "booking": {}
  }
}
```

Frontend receives this and updates UI.

Examples:

```text
/api/turfs response goes to venue cards.
/api/bookings response goes to bookings page.
/api/payments/history response goes to payments page.
/api/admin/dashboard response goes to admin dashboard.
/api/owner/dashboard response goes to owner dashboard.
/api/notifications response goes to notification bell.
```

## 33. Full Backend Request Journey

Example:

```text
User clicks Pay
-> Frontend calls POST /api/payments/checkout
-> server.js receives request
-> paymentRoutes chooses /checkout route
-> protect middleware checks login
-> authorizeRoles checks user/admin
-> paymentController.createPayment runs
-> Booking model reads booking from MongoDB
-> Payment model creates payment
-> mock payment service returns paid
-> Booking model updates booking status
-> Notification model creates notifications
-> responseHandler sends success JSON
-> frontend shows success page
```

## 34. Backend In Super Simple Words

Routes are like doors.

```text
/api/bookings is booking door.
/api/turfs is turf door.
/api/auth is login/register door.
```

Middleware is like security guard.

```text
Are you logged in?
Are you admin?
Are you owner?
Is file upload valid?
```

Controllers are like managers.

```text
They decide what to do with request.
```

Services are like specialists.

```text
Availability specialist checks slots.
Payment specialist handles mock payment.
Geocoding specialist handles location.
```

Models are like database forms.

```text
They decide what fields are saved in MongoDB.
```

MongoDB is the storage room.

```text
All real data is saved there.
```

## 35. Most Important Backend Files To Study First

Study in this order:

```text
backend/src/server.js
backend/src/config/database.js
backend/src/models/User.js
backend/src/models/Turf.js
backend/src/models/Booking.js
backend/src/models/Payment.js
backend/src/routes/authRoutes.js
backend/src/routes/turfRoutes.js
backend/src/routes/bookingRoutes.js
backend/src/routes/paymentRoutes.js
backend/src/controllers/authController.js
backend/src/controllers/turfController.js
backend/src/controllers/bookingController.js
backend/src/controllers/paymentController.js
backend/src/services/availabilityService.js
backend/src/middleware/authMiddleware.js
```

## 36. Final One-Minute Explanation

TURFX backend is an Express and MongoDB API. The frontend sends requests to `/api/...`. `server.js` sends those requests to route files. Routes call middleware to check login and roles. Then controllers run the main logic. Controllers use services for special work like slot availability, payment, and geocoding. Controllers use Mongoose models to read or save data in MongoDB. Data is saved in collections like users, turfs, bookings, payments, reviews, notifications, tournaments, tournament registrations, coach bookings, audit logs, and conflict logs. After saving or reading, backend sends a JSON response back to frontend, and frontend shows the updated page.

