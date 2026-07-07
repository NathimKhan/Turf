# TURFX Backend All Flows Super Simple Explanation

This is the easiest backend explanation.

Read this like a story:

```text
Frontend sends data
Backend checks data
Backend saves data in MongoDB
Backend sends result back
```

## 1. Backend Main Job

Backend is the server.

It does not show pages.

It only handles data.

Backend does these jobs:

- register user
- login user
- check token
- save turf
- approve turf
- search turf
- check slots
- create booking
- take mock payment
- save review
- save favorite
- send notifications
- show dashboards
- handle tournaments
- handle coaching
- upload images

## 2. Main Backend Path

Almost every request follows this:

```text
Frontend
-> API URL
-> Route file
-> Middleware
-> Controller
-> Service if needed
-> Model
-> MongoDB
-> JSON response
-> Frontend
```

Example:

```text
POST /api/bookings
-> bookingRoutes
-> login check
-> bookingController
-> availabilityService
-> Booking model
-> MongoDB bookings collection
-> response to frontend
```

## 3. Backend Main File

File:

```text
backend/src/server.js
```

Simple meaning:

```text
server.js starts the backend.
```

It connects:

```text
/api/auth          -> authRoutes
/api/users         -> userRoutes
/api/turfs         -> turfRoutes
/api/bookings      -> bookingRoutes
/api/payments      -> paymentRoutes
/api/owner         -> ownerRoutes
/api/admin         -> adminRoutes
/api/reviews       -> reviewRoutes
/api/tournaments   -> tournamentRoutes
/api/notifications -> notificationRoutes
/api/favorites     -> favoriteRoutes
/api/coaching      -> coachingRoutes
```

So if frontend calls:

```text
/api/turfs
```

Backend sends it to:

```text
turfRoutes
```

## 4. Database

Database is:

```text
MongoDB
```

Database connection file:

```text
backend/src/config/database.js
```

It uses:

```text
MONGO_URI
```

from:

```text
backend/.env
```

Simple meaning:

```text
MongoDB is where real data is saved.
```

## 5. Backend Folders Simple Meaning

```text
routes
```

API URLs.

```text
controllers
```

Main work happens here.

```text
models
```

Database table/collection structure.

```text
services
```

Helper logic like availability, payment, geocoding.

```text
middleware
```

Checks before main work.

```text
utils
```

Small helper functions.

```text
uploads
```

Uploaded images.

## 6. Main Database Collections

```text
users
```

Saves users, owners, admins.

```text
turfs
```

Saves venue/turf details.

```text
bookings
```

Saves booking slots.

```text
payments
```

Saves payment records.

```text
reviews
```

Saves rating and comments.

```text
notifications
```

Saves user/admin/owner alerts.

```text
tournaments
```

Saves tournaments.

```text
tournamentregistrations
```

Saves team registrations.

```text
coachbookings
```

Saves coaching requests.

```text
auditlogs
```

Saves admin approval history.

```text
bookingconflictlogs
```

Saves failed booking attempts.

## 7. Register User Flow

Frontend sends:

```text
POST /api/auth/register
```

Backend receives:

```text
name
email
password
phone
```

Backend does:

```text
checks email
hashes password
saves user
creates token
sends token back
```

Data saved in:

```text
users
```

Main files:

```text
authRoutes.js
authController.js
User.js
```

## 8. Register Owner Flow

Frontend sends:

```text
POST /api/auth/register-owner
```

Backend receives:

```text
name
email
password
phone
businessName
address
```

Backend does:

```text
saves owner as pending
sends notification to admin
sends response back
```

Data saved in:

```text
users
notifications
```

Important:

```text
Owner cannot add turf until admin approves.
```

## 9. Login Flow

Frontend sends:

```text
POST /api/auth/login
```

Backend receives:

```text
email
password
```

Backend does:

```text
finds user
checks password
checks owner status
creates JWT token
sends user and token
```

Data saved:

```text
No new main data saved.
Token goes to frontend.
```

Frontend stores token in localStorage.

## 10. Profile Flow

Frontend sends:

```text
GET /api/auth/profile
```

Backend does:

```text
checks token
gets logged-in user
sends user data
```

Frontend updates profile:

```text
PUT /api/auth/profile
```

Backend saves:

```text
users
uploads if profile image exists
```

## 11. Admin Approves Owner Flow

Admin sends:

```text
PATCH /api/admin/owners/:id/status
```

Backend does:

```text
checks admin
finds owner
updates owner status
saves owner
creates audit log
sends notification to owner
```

Data saved in:

```text
users
auditlogs
notifications
```

After this:

```text
Owner can add turf.
```

## 12. Owner Adds Turf Flow

Frontend sends:

```text
POST /api/turfs
```

Backend receives:

```text
name
description
address
city
state
latitude
longitude
sports
price
amenities
images
```

Backend does:

```text
checks owner login
checks owner is approved
uploads images
checks fields
creates turf
saves turf as pending
notifies admin
creates audit log
```

Data saved in:

```text
turfs
uploads
notifications
auditlogs
```

After this:

```text
Turf waits for admin approval.
```

## 13. Admin Approves Turf Flow

Admin sends:

```text
PATCH /api/admin/turfs/:id/status
```

Backend does:

```text
checks admin
finds turf
updates turf as approved/live
saves turf
creates audit log
sends notification to owner
```

Data saved in:

```text
turfs
auditlogs
notifications
```

After this:

```text
Users can see and book the turf.
```

## 14. Search Turf Flow

Frontend sends:

```text
GET /api/turfs
```

Optional filters:

```text
sport
city
date
price
rating
search
latitude
longitude
radius
```

Backend does:

```text
gets filters
finds only live turfs
finds only active owners
filters by sport/city/date
sends turf list
```

Data read from:

```text
turfs
users
bookings if date filter exists
```

Data saved:

```text
nothing
```

## 15. Turf Details Flow

Frontend sends:

```text
GET /api/turfs/:id
```

Backend does:

```text
finds turf
checks turf is live
sends turf details
```

Data read from:

```text
turfs
users
```

Frontend shows:

```text
name
image
location
price
sports
amenities
rating
```

## 16. Availability Flow

Frontend sends:

```text
GET /api/turfs/:id/availability?date=YYYY-MM-DD
```

Backend does:

```text
finds turf
reads turf schedule
reads bookings for that date
checks blackout dates
checks buffer time
creates available slot list
sends slots
```

Data read from:

```text
turfs
bookings
```

Data saved:

```text
nothing usually
```

If user asks for an impossible slot, conflict can be saved in:

```text
bookingconflictlogs
```

## 17. Owner Updates Slot Rules Flow

Owner sends:

```text
PUT /api/turfs/:id/slots
```

Backend receives:

```text
opening time
closing time
slot minutes
buffer minutes
weekly days
blackout dates
```

Backend does:

```text
checks owner/admin
finds turf
updates turf schedule
saves turf
```

Data saved in:

```text
turfs.schedule
```

## 18. Booking Create Flow

Frontend sends:

```text
POST /api/bookings
```

Backend receives:

```text
turfId
bookingDate
slotStartTime
slotEndTime
sport
```

Backend checks:

```text
user logged in
user role allowed
turf exists
turf is live
owner is active
date is not past
sport is available
slot is inside schedule
slot is not booked
buffer time is free
```

Backend saves:

```text
booking with pending status
notifications for user and owner
```

Data saved in:

```text
bookings
notifications
```

If failed:

```text
bookingconflictlogs
```

## 19. Payment Checkout Flow

Frontend sends:

```text
POST /api/payments/checkout
```

Backend receives:

```text
bookingId
paymentMethod
```

Backend does:

```text
finds booking
checks booking owner/user
creates payment
mock payment succeeds
marks payment paid
marks booking confirmed
calculates platform fee
calculates owner revenue
sends notifications
```

Data saved in:

```text
payments
bookings
notifications
```

Money split:

```text
10% platform
90% owner
```

## 20. Payment History Flow

Frontend sends:

```text
GET /api/payments/history
```

Backend does:

```text
checks user role
user sees own payments
owner sees own venue payments
admin sees all payments
sends payment list
```

Data read from:

```text
payments
bookings
turfs
users
```

## 21. Refund Flow

Admin sends:

```text
PATCH /api/payments/:id/refund
```

Backend does:

```text
checks admin
finds payment
marks payment refunded
marks booking cancelled
clears booking slot locks
sends notification to user
```

Data saved in:

```text
payments
bookings
notifications
```

## 22. Get Bookings Flow

Frontend sends:

```text
GET /api/bookings
```

Backend does:

```text
if user: gets user's bookings
if owner: gets bookings for owner's turfs
if admin: gets all bookings
```

Data read from:

```text
bookings
turfs
users
```

## 23. Cancel Booking Flow

Frontend sends:

```text
PUT /api/bookings/cancel/:id
```

Backend does:

```text
checks permission
finds booking
marks booking cancelled
clears slot locks
sends notification
```

Data saved in:

```text
bookings
notifications
```

## 24. Update Booking Status Flow

Owner/admin sends:

```text
PATCH /api/bookings/:id/status
```

Backend receives:

```text
confirmed
checked_in
completed
cancelled
```

Backend does:

```text
checks owner/admin
updates booking status
sends notification to user
```

Data saved in:

```text
bookings
notifications
```

## 25. Review Flow

User sends:

```text
POST /api/reviews
```

Backend receives:

```text
turfId
rating
comment
```

Backend does:

```text
checks user
checks completed booking exists
saves review
recalculates turf rating
updates turf rating
```

Data saved in:

```text
reviews
turfs
notifications
```

## 26. Favorite Flow

User sends:

```text
POST /api/favorites/:turfId
```

Backend does:

```text
checks user
adds turf id to user's favorites
```

Remove favorite:

```text
DELETE /api/favorites/:turfId
```

Data saved in:

```text
users.favorites
```

## 27. Notification Flow

Frontend sends:

```text
GET /api/notifications
```

Backend does:

```text
gets logged-in user's notifications
sends list
```

Mark read:

```text
PUT /api/notifications/:id/read
```

Delete:

```text
DELETE /api/notifications/:id
```

Data saved in:

```text
notifications
```

## 28. Wallet Flow

Frontend sends:

```text
POST /api/auth/wallet
```

Backend receives:

```text
action: topup or transfer
amount
```

Backend does:

```text
checks user
updates wallet balance
creates notification
```

Data saved in:

```text
users
notifications
```

## 29. Password Reset Flow

Frontend sends:

```text
POST /api/auth/forgot-password
```

Backend does:

```text
finds user
creates reset token
saves token expiry
sends email or simulation
```

Then frontend sends:

```text
POST /api/auth/reset-password
```

Backend does:

```text
checks token
saves new hashed password
clears reset token
```

Data saved in:

```text
users
```

## 30. Owner Dashboard Flow

Owner sends:

```text
GET /api/owner/dashboard
```

Backend reads:

```text
owner turfs
bookings
payments
```

Backend calculates:

```text
total turfs
total bookings
today bookings
upcoming bookings
revenue
monthly earnings
sport revenue
```

Data saved:

```text
nothing
```

## 31. Admin Dashboard Flow

Admin sends:

```text
GET /api/admin/dashboard
```

Backend reads:

```text
users
turfs
bookings
payments
```

Backend calculates:

```text
total users
total owners
total turfs
total bookings
gross revenue
platform revenue
owner revenue
pending owners
pending turfs
recent activity
```

Data saved:

```text
nothing
```

## 32. Tournament Create Flow

Owner/admin sends:

```text
POST /api/tournaments
```

Backend receives:

```text
title
description
sport
prizePool
entryFee
maxTeams
startDate
endDate
turfId
```

Backend does:

```text
checks owner/admin
checks turf is live
saves tournament
```

Data saved in:

```text
tournaments
```

## 33. Tournament Registration Flow

User sends:

```text
POST /api/tournaments/:id/register
```

Backend receives:

```text
teamName
captainName
participantCount
paymentMethod
```

Backend does:

```text
checks tournament open
checks team limit
creates registration
marks payment paid
sets approval pending
notifies owner
```

Data saved in:

```text
tournamentregistrations
notifications
```

Owner approves:

```text
PATCH /api/tournaments/registrations/:id/status
```

Data saved in:

```text
tournamentregistrations
tournaments.participants
notifications
```

## 34. Coaching Flow

Frontend sends:

```text
GET /api/coaching/coaches
```

Backend does:

```text
finds live turfs
generates coach plans from turf sports
sends coach list
```

User requests coach:

```text
POST /api/coaching/requests
```

Backend does:

```text
checks coach is available
saves coaching request
marks payment paid
sets approval pending
notifies owner
```

Data saved in:

```text
coachbookings
notifications
```

Owner approves/rejects:

```text
PATCH /api/coaching/requests/:id/status
```

Data saved in:

```text
coachbookings
notifications
```

## 35. Image Upload Flow

Images come from frontend form.

Backend uses:

```text
uploadMiddleware
```

Images are saved in:

```text
backend/uploads
```

Image URL is saved in:

```text
users.profileImage
or turf image fields
```

Frontend displays image using:

```text
/uploads/filename
```

## 36. Seed Flow

Command:

```text
npm run seed
```

Backend seed creates demo data.

Data saved in:

```text
users
turfs
bookings
payments
reviews
notifications
tournaments
```

## 37. Full Backend Data Map

```text
Register user       -> users
Register owner      -> users, notifications
Login               -> token returned
Profile update      -> users, uploads
Password reset      -> users
Wallet              -> users, notifications
Approve owner       -> users, auditlogs, notifications
Create turf         -> turfs, uploads, auditlogs, notifications
Approve turf        -> turfs, auditlogs, notifications
Search turf         -> reads turfs
Turf details        -> reads turfs
Availability        -> reads turfs, bookings
Update slots        -> turfs.schedule
Create booking      -> bookings, notifications
Booking conflict    -> bookingconflictlogs
Payment             -> payments, bookings, notifications
Refund              -> payments, bookings, notifications
Cancel booking      -> bookings, notifications
Review              -> reviews, turfs, notifications
Favorite            -> users.favorites
Notifications       -> notifications
Owner dashboard     -> reads turfs, bookings, payments
Admin dashboard     -> reads users, turfs, bookings, payments
Tournament          -> tournaments, tournamentregistrations, notifications
Coaching            -> coachbookings, notifications
```

## 38. Backend One-Minute Tutor Script

TURFX backend is an Express API connected to MongoDB. The frontend sends requests to `/api`. `server.js` sends each request to the correct route file. Routes use middleware to check login, admin, owner, and uploads. Then controller files run the main logic. Controllers use services for special logic like slot availability, mock payment, venue geocoding, and approval status. Controllers use models to save or read MongoDB data. The main collections are users, turfs, bookings, payments, reviews, notifications, tournaments, tournament registrations, coach bookings, audit logs, and booking conflict logs. After reading or saving, backend sends JSON back to frontend.

## 39. Main Story In Simple Words

```text
Owner registers
Admin approves owner
Owner adds turf
Admin approves turf
User searches turf
User checks availability
User books slot
User pays
Booking becomes confirmed
Owner gets revenue
Admin gets platform fee
User gets notifications and booking pass
```

