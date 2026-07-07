# TURFX Very Simple Project Flow Explanation

This file explains the whole project in very easy words.

## 1. Main Idea

TURFX is a turf booking website.

There are 3 main sides:

```text
User  -> books turf
Owner -> adds turf and manages bookings
Admin -> approves owners and turfs
```

Simple project flow:

```text
Frontend page
-> sends API request
-> backend route receives it
-> backend controller handles it
-> MongoDB saves or gives data
-> backend sends response
-> frontend shows result
```

## 2. Where Data Is Stored

Main database:

```text
MongoDB
```

Main saved data:

```text
users
turfs
bookings
payments
reviews
notifications
favorites
tournaments
tournament registrations
coaching requests
audit logs
conflict logs
```

Uploaded images are stored in:

```text
backend/uploads
```

Login token is stored in:

```text
frontend localStorage
backend cookie
```

## 3. App Start Flow

User runs:

```text
npm run dev
```

This starts:

```text
frontend -> http://localhost:5173
backend  -> http://localhost:5000
```

Frontend calls backend using:

```text
/api/...
```

Example:

```text
frontend calls /api/turfs
Vite sends it to backend /api/turfs
```

## 4. Register User Flow

User fills register form.

Frontend sends:

```text
POST /api/auth/register
```

Backend does:

```text
checks email
hashes password
saves user in MongoDB
creates login token
sends user + token back
```

Data saved in:

```text
users
```

Then frontend logs user in.

## 5. Register Owner Flow

Owner fills owner register form.

Frontend sends:

```text
POST /api/auth/register-owner
```

Backend does:

```text
saves owner in users collection
sets owner status as pending
sends notification to admin
sends response back
```

Data saved in:

```text
users
notifications
```

Owner cannot fully add turfs until admin approves.

## 6. Login Flow

User enters email and password.

Frontend sends:

```text
POST /api/auth/login
```

Backend does:

```text
finds user by email
checks password
checks owner approval if owner
creates JWT token
sends user + token
```

Frontend saves token.

After this, future requests send:

```text
Authorization: Bearer token
```

## 7. Admin Approves Owner Flow

Admin opens owner management page.

Frontend gets owners:

```text
GET /api/admin/owners
```

Admin clicks approve.

Frontend sends:

```text
PATCH /api/admin/owners/:id/status
```

Backend does:

```text
checks admin
updates owner status to active
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

Now owner can add turfs.

## 8. Owner Adds Turf Flow

Owner fills add turf form.

Form contains:

```text
name
description
price
sports
address
city
state
latitude
longitude
amenities
images
```

Frontend sends:

```text
POST /api/turfs
```

Backend does:

```text
checks owner login
checks owner is approved
uploads images
checks venue details
saves turf as pending
sends notification to admin
creates audit log
```

Data saved in:

```text
turfs
backend/uploads
notifications
auditlogs
```

Turf is not visible to users yet.

## 9. Admin Approves Turf Flow

Admin opens turf management page.

Frontend gets all turfs:

```text
GET /api/turfs?includeUnapproved=true
```

Admin clicks approve.

Frontend sends:

```text
PATCH /api/admin/turfs/:id/status
```

Backend does:

```text
checks admin
updates turf as live/approved
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

Now turf is visible in search.

## 10. Search Turf Flow

User searches turf.

Example URL:

```text
/search?sport=Football&location=Delhi&date=2026-07-02
```

Frontend sends:

```text
GET /api/turfs?sport=Football&city=Delhi&date=2026-07-02
```

Backend does:

```text
finds only approved/live turfs
checks owner is active
filters by sport
filters by city
checks date availability
sends turf list
```

Data comes from:

```text
turfs
users
bookings
```

Frontend shows turf cards.

## 11. Venue Details Flow

User clicks a turf card.

Frontend opens:

```text
/venue/:id
```

Frontend sends:

```text
GET /api/turfs/:id
GET /api/turfs/:id/availability?date=YYYY-MM-DD
```

Backend sends:

```text
turf details
images
price
sports
amenities
available slots
```

Data comes from:

```text
turfs
bookings
```

Frontend shows venue details page.

## 12. Availability Flow

User selects date and time.

Frontend sends:

```text
GET /api/turfs/:id/availability?date=YYYY-MM-DD
```

Backend checks:

```text
turf schedule
opening time
closing time
blackout dates
existing bookings
buffer time
```

Backend returns:

```text
available slots
blocked slots
rules
```

Frontend shows which slot can be booked.

## 13. Booking Flow

User selects sport, date, start time, end time.

Frontend sends:

```text
POST /api/bookings
```

Example data:

```json
{
  "turfId": "turf id",
  "bookingDate": "2026-07-02",
  "slotStartTime": "18:00",
  "slotEndTime": "19:00",
  "sport": "Football"
}
```

Backend checks:

```text
user is logged in
turf exists
turf is live
owner is active
date is not past
sport is supported
slot is open
slot is not booked
buffer time is okay
```

Backend saves booking:

```text
bookingStatus: pending
paymentStatus: pending
```

Data saved in:

```text
bookings
notifications
```

If slot is already booked, backend saves:

```text
bookingconflictlogs
```

## 14. Payment Flow

After booking is created, user pays.

Frontend sends:

```text
POST /api/payments/checkout
```

Example:

```json
{
  "bookingId": "booking id",
  "paymentMethod": "Card"
}
```

Backend does:

```text
finds booking
checks user owns booking
creates payment
uses mock payment
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

Simple money split:

```text
10% platform fee
90% owner revenue
```

Frontend shows success page.

## 15. QR Code And PDF Flow

After payment success, user can see booking pass.

Frontend gets booking:

```text
GET /api/bookings/:id
```

Frontend creates QR code in browser.

QR data contains:

```text
booking id
user id
venue id
date
slot time
```

Important:

```text
QR code is not saved in backend.
PDF is not saved in backend.
Both are generated in frontend.
```

## 16. My Bookings Flow

User opens my bookings page.

Frontend sends:

```text
GET /api/bookings
```

Backend checks role.

If normal user:

```text
returns only that user's bookings
```

If owner:

```text
returns bookings for owner's turfs
```

If admin:

```text
returns all bookings
```

Data comes from:

```text
bookings
turfs
users
```

## 17. Cancel Booking Flow

User or owner cancels booking.

Frontend sends:

```text
PUT /api/bookings/cancel/:id
```

Backend does:

```text
checks permission
marks booking cancelled
clears slot lock
sends notification
```

Data updated in:

```text
bookings
notifications
```

Now slot can become available again.

## 18. Owner Updates Booking Status Flow

Owner can update booking status.

Frontend sends:

```text
PATCH /api/bookings/:id/status
```

Statuses:

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

## 19. Refund Flow

Admin refunds payment.

Frontend sends:

```text
PATCH /api/payments/:id/refund
```

Backend does:

```text
checks admin
finds payment
marks payment refunded
marks booking cancelled
clears slot lock
sends notification
```

Data saved in:

```text
payments
bookings
notifications
```

## 20. Review Flow

User reviews completed booking.

Frontend sends:

```text
POST /api/reviews
```

Backend does:

```text
checks user login
checks completed booking exists
saves review
updates turf rating
sends notification
```

Data saved in:

```text
reviews
turfs
notifications
```

Frontend shows updated rating.

## 21. Favorite Flow

User clicks favorite button.

Frontend sends:

```text
POST /api/favorites/:turfId
```

Backend does:

```text
checks user
adds turf id to user's favorites
```

Data saved in:

```text
users.favorites
```

User can see saved turfs on favorites page.

## 22. Notification Flow

Backend creates notifications for many actions.

Examples:

```text
booking created
payment success
owner approved
venue approved
booking cancelled
refund done
review added
```

Frontend gets notifications:

```text
GET /api/notifications
```

Backend sends user's notifications.

Data comes from:

```text
notifications
```

## 23. Wallet Flow

User adds money or transfers money.

Frontend sends:

```text
POST /api/auth/wallet
```

Backend does:

```text
checks user account
updates wallet balance
sends notification
```

Data saved in:

```text
users
notifications
```

## 24. Profile Flow

User updates profile.

Frontend sends:

```text
PUT /api/auth/profile
```

Backend does:

```text
checks login
updates user fields
saves profile image if uploaded
saves user
```

Data saved in:

```text
users
backend/uploads
```

## 25. Password Reset Flow

User clicks forgot password.

Frontend sends:

```text
POST /api/auth/forgot-password
```

Backend does:

```text
finds user
creates reset token
saves token expiry
sends email or simulated email
```

User resets password:

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

## 26. Owner Dashboard Flow

Owner opens dashboard.

Frontend sends:

```text
GET /api/owner/dashboard
```

Backend reads:

```text
owner's turfs
bookings for those turfs
payments for those turfs
```

Backend calculates:

```text
total turfs
total bookings
today bookings
upcoming bookings
revenue
monthly earnings
sport-wise revenue
```

No new data is saved.

## 27. Admin Dashboard Flow

Admin opens dashboard.

Frontend sends:

```text
GET /api/admin/dashboard
```

Backend reads:

```text
users
owners
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
recent activities
```

No new data is saved.

## 28. Tournament Flow

Owner or admin creates tournament.

Frontend sends:

```text
POST /api/tournaments
```

Backend saves:

```text
tournaments
```

User registers for tournament.

Frontend sends:

```text
POST /api/tournaments/:id/register
```

Backend does:

```text
checks tournament is open
saves registration
marks payment paid
marks approval pending
sends notification to owner
```

Data saved in:

```text
tournamentregistrations
notifications
```

Owner approves registration:

```text
PATCH /api/tournaments/registrations/:id/status
```

Backend updates registration and tournament participants.

## 29. Coaching Flow

User opens coaching page.

Frontend sends:

```text
GET /api/coaching/coaches
```

Backend does:

```text
finds live turfs
creates coach plans from turf sports
sends coach list
```

User requests coaching.

Frontend sends:

```text
POST /api/coaching/requests
```

Backend does:

```text
saves coach request
marks payment paid
marks approval pending
sends notification to owner
```

Data saved in:

```text
coachbookings
notifications
```

Owner approves coaching:

```text
PATCH /api/coaching/requests/:id/status
```

Backend updates coaching request and notifies user.

## 30. Image Upload Flow

Images are uploaded for:

```text
turf images
profile images
```

Backend uses:

```text
multer
```

File saved in:

```text
backend/uploads
```

Image URL saved in:

```text
MongoDB user or turf document
```

Frontend displays image using:

```text
/uploads/filename
```

## 31. Complete Simple Data Map

```text
Register user       -> users
Register owner      -> users, notifications
Login               -> token returned, frontend stores token
Approve owner       -> users, auditlogs, notifications
Create turf         -> turfs, uploads, auditlogs, notifications
Approve turf        -> turfs, auditlogs, notifications
Search turfs        -> reads turfs
View turf           -> reads turfs
Check availability  -> reads turfs and bookings
Create booking      -> bookings, notifications
Payment checkout    -> payments, bookings, notifications
QR/PDF pass         -> frontend only
Cancel booking      -> bookings, notifications
Refund payment      -> payments, bookings, notifications
Review turf         -> reviews, turfs, notifications
Favorite turf       -> users.favorites
Wallet update       -> users, notifications
Profile update      -> users, uploads
Tournament create   -> tournaments
Tournament register -> tournamentregistrations, notifications
Coaching request    -> coachbookings, notifications
Admin dashboard     -> reads users, turfs, bookings, payments
Owner dashboard     -> reads turfs, bookings, payments
```

## 32. Super Simple Final Explanation

TURFX works like this:

```text
Frontend shows pages.
User clicks buttons or submits forms.
Frontend sends API request to backend.
Backend checks login and role.
Backend checks data is valid.
Backend reads or saves data in MongoDB.
Backend sends JSON back.
Frontend shows the updated result.
```

Main saved data:

```text
users
turfs
bookings
payments
reviews
notifications
tournaments
coaching requests
```

Main project story:

```text
Owner registers
Admin approves owner
Owner adds turf
Admin approves turf
User searches turf
User books slot
User pays
Booking becomes confirmed
User gets QR/PDF pass
Owner gets revenue
Admin gets platform fee
```

