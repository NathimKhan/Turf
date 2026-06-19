# TURFX Project Explanation For Tutor

## 1. What This Project Is

TURFX is a local turf booking web application.

It has two main parts:

- `frontend/` - React + Vite user interface
- `backend/` - Node.js + Express + MongoDB API

The user opens the frontend in the browser at:

```text
http://localhost:5173
```

The frontend talks to the backend at:

```text
http://localhost:5000
```

MongoDB stores the real application data: users, owners, turfs, bookings, payments, reviews, notifications, events, and tournaments.

## 2. How The Project Runs Locally

From the project root, the app starts with:

```powershell
npm.cmd run dev
```

That command runs `scripts/dev.js`.

`scripts/dev.js` starts two servers:

```text
backend  -> npm --prefix backend run dev
frontend -> npm --prefix frontend run dev
```

So one command starts both the API and the React UI.

## 3. How Frontend And Backend Connect

The frontend uses Axios from:

```text
frontend/src/services/api/client.js
```

The frontend calls URLs like:

```text
/api/turfs
/api/bookings
/api/payments
```

Vite proxy sends those requests to the backend. The proxy is configured in:

```text
frontend/vite.config.js
```

Example:

```text
Frontend calls: /api/turfs
Vite forwards to: http://localhost:5000/api/turfs
```

This is why the browser can use `/api/...` without writing the full backend URL.

## 4. Where The Venue Listing Comes From

In the screenshot, cards like:

```text
Badminton Arena 8
Badminton Arena 18
Delhi Sports District 8
Rs.850 / hr
```

come from the backend API and MongoDB.

Frontend path:

```text
frontend/src/pages/public/PublicPages.jsx
```

The search page is `SearchResultsPage`.

It reads filters from the URL:

```text
sport=Basketball
location=Delhi
date=2026-06-20
page=1
```

Then it calls:

```text
useTurfs(params)
```

That hook is in:

```text
frontend/src/hooks/useTurfs.js
```

Then it calls:

```text
turfsApi.list(params)
```

That API helper is in:

```text
frontend/src/services/api/turfs.js
```

It sends:

```text
GET /api/turfs?sport=Basketball&city=Delhi&date=2026-06-20&page=1
```

Backend route:

```text
backend/src/routes/turfRoutes.js
```

Backend controller:

```text
backend/src/controllers/turfController.js
```

The backend function `getTurfs` builds a MongoDB filter:

- if sport is selected, filter by `sportsSupported`
- if city is selected, filter by `city`
- if date is selected, check available schedule slots
- only live/approved venues from active owners are shown

Then MongoDB returns matching turf documents.

The frontend normalizes those documents in:

```text
frontend/src/services/api/normalize.js
```

Then `TurfCard` displays them.

Card component:

```text
frontend/src/components/shared/TurfCard.jsx
```

## 5. Where The Images Come From

Each venue card uses:

```text
turf.image
```

That value is created in `normalizeTurf`.

The backend turf document has:

```text
images: [...]
```

Example from the API:

```text
images: [
  "https://images.unsplash.com/...",
  "https://images.unsplash.com/..."
]
```

The frontend chooses the first image:

```text
image = images[0]
```

Then `TurfCard.jsx` renders:

```jsx
<img src={turf.image} />
```

If a venue has no uploaded image, the frontend uses a fallback visual from:

```text
frontend/src/data/turfxData.js
```

Uploaded images from owners are stored in:

```text
backend/uploads/
```

and served by the backend at:

```text
/uploads/filename.jpg
```

## 6. How Filters Work

The filter UI is in:

```text
frontend/src/components/shared/SearchFilters.jsx
```

The filter options come from:

```text
GET /api/turfs/meta
```

Backend returns available:

- cities
- locations
- sports
- amenities

So the filter buttons are not hardcoded only. They are mainly generated from backend metadata.

When the user selects a filter, the URL changes, for example:

```text
/search?sport=Basketball&location=Delhi&date=2026-06-20&page=1
```

Then `SearchResultsPage` reloads matching venues using that URL.

## 7. What Happens When User Clicks Book Now

The `Book Now` button is inside:

```text
frontend/src/components/shared/TurfCard.jsx
```

It creates a booking URL:

```text
/booking/slots?venue=<venueId>
```

Then the booking page opens.

Booking page:

```text
frontend/src/pages/booking/BookingPages.jsx
```

It loads:

- selected venue
- selected date
- supported sports
- hourly price
- available slots

Available slots come from:

```text
GET /api/turfs/:id/availability?date=YYYY-MM-DD
```

Backend calculates availability using:

```text
backend/src/services/availabilityService.js
```

It checks:

- weekly schedule
- start time
- end time
- minimum booking duration
- blackout dates
- existing bookings
- buffer time between bookings

## 8. How Booking Is Created

When user confirms a slot, frontend sends:

```text
POST /api/bookings
```

Payload includes:

```text
turfId
bookingDate
slotStartTime
slotEndTime
sport
```

Backend controller:

```text
backend/src/controllers/bookingController.js
```

Backend checks:

- user is logged in
- turf exists
- venue is live
- owner is active
- selected sport exists in that venue
- date is not in the past
- slot is available
- no overlap with another booking

Then it creates a `Booking` document in MongoDB.

Booking model:

```text
backend/src/models/Booking.js
```

The booking starts as:

```text
bookingStatus: pending
paymentStatus: pending
```

## 9. How Payment Works

This project uses mock/local payment.

Payment service:

```text
backend/src/services/paymentService.js
```

When checkout happens, frontend calls:

```text
POST /api/payments/checkout
```

Backend controller:

```text
backend/src/controllers/paymentController.js
```

It creates a `Payment` document and calls the mock provider.

The mock provider immediately returns:

```text
status: paid
```

Then backend updates the booking:

```text
paymentStatus: paid
bookingStatus: confirmed
```

It also creates notifications for:

- user
- owner
- admin

Payment model:

```text
backend/src/models/Payment.js
```

The app calculates revenue split:

```text
10% platform fee
90% owner revenue
```

## 10. How The QR Code Works

The QR code is generated on the frontend.

QR utility file:

```text
frontend/src/utils/bookingPass.js
```

The QR code is generated by:

```text
createBookingQr(booking, user)
```

It uses the npm package:

```text
qrcode
```

The QR payload is JSON:

```json
{
  "bookingId": "booking id",
  "userId": "user id",
  "venueId": "venue id",
  "date": "booking date",
  "slot": "start-end"
}
```

Then `QRCode.toDataURL(...)` converts that JSON into a QR image.

That image is shown in:

```text
frontend/src/pages/athlete/AthletePages.jsx
```

In the booking details page, this code runs:

```text
createBookingQr(booking, user)
```

Then the result is stored in:

```text
qrDataUrl
```

Then the page displays:

```jsx
<img src={qrDataUrl} />
```

So the QR does not come from the backend as an image. It is generated in the browser from the real booking record.

## 11. How The Booking Pass PDF Works

The booking pass is also generated on the frontend.

File:

```text
frontend/src/utils/bookingPass.js
```

Function:

```text
downloadBookingPass(booking, user)
```

It uses:

```text
jspdf
```

The PDF contains:

- TURFX logo text
- booking id
- booking reference
- user name
- venue name
- date
- time
- status
- QR code

The QR inside the PDF is the same QR generated from the booking data.

## 12. How Login Works

Login page calls:

```text
POST /api/auth/login
```

Backend checks email and password.

Password is hashed using:

```text
bcryptjs
```

If login is correct, backend creates a JWT token.

Frontend stores the token in localStorage using:

```text
frontend/src/services/authService.js
```

Future API calls include:

```text
Authorization: Bearer <token>
```

Backend reads that token in:

```text
backend/src/middleware/authMiddleware.js
```

## 13. User Roles

The app has three main roles:

```text
user
owner
admin
```

User can:

- search venues
- book slots
- pay
- see QR pass
- review venues
- favorite venues

Owner can:

- add venues
- upload images
- manage schedule
- see bookings
- see revenue

Admin can:

- approve owners
- approve venues
- manage users
- see platform revenue
- see audit logs
- send notifications

## 14. Real-Time Meaning In This Project

This app is not using WebSockets.

So "real-time" here means:

- frontend requests fresh data from backend
- backend reads current data from MongoDB
- React Query refreshes cached data after actions

Example:

When a booking is created, React Query invalidates booking/turf data. Then the UI fetches updated data again.

So the listing and booking status are live from the API, but not instant socket streaming.

## 15. Demo/Fallback Data Note

The project has fallback demo behavior in some frontend hooks.

That means if the API is slow or unavailable, the UI may show demo turf data so the page does not look empty.

Important files:

```text
frontend/src/hooks/useTurfs.js
frontend/src/services/api/normalize.js
frontend/src/hooks/usePlatform.js
```

But when the backend is running correctly, the venue cards like `Badminton Arena 8` come from MongoDB through the backend API.

## 16. One Full Flow To Explain To Tutor

Example: user searches and books a basketball venue.

1. User opens `/search?sport=Basketball&location=Delhi&date=2026-06-20`.
2. React page `SearchResultsPage` reads URL filters.
3. It calls `useTurfs`.
4. `useTurfs` calls `GET /api/turfs`.
5. Backend `getTurfs` filters MongoDB turfs by sport, city, and date.
6. Backend returns matching venues.
7. Frontend normalizes data.
8. `TurfCard` displays name, image, city, rating, price, and sports.
9. User clicks `Book Now`.
10. Booking page loads venue and availability.
11. User selects sport, date, start time, and end time.
12. Frontend creates booking using `POST /api/bookings`.
13. Backend validates slot and creates booking.
14. User pays through mock payment using `POST /api/payments/checkout`.
15. Backend marks payment paid and booking confirmed.
16. Booking details page generates QR from booking data.
17. User can show QR at venue gate or download PDF pass.

## 17. Short Explanation Script

I can explain this project like this:

"TURFX is a local turf booking platform. The React frontend runs on Vite and talks to an Express backend through `/api` proxy. Venue listings are fetched from MongoDB through the backend `/api/turfs` endpoint. The search filters are converted into query parameters like sport, city, and date. Backend filters approved live venues and checks availability before returning data. Each card image comes from the venue `images` array stored in MongoDB or uploaded files served from `/uploads`. When a user books a slot, the backend validates the schedule, blackout dates, conflicts, and buffer time, then creates a booking. Payment is mock/local and marks the booking as confirmed. The QR code is generated in the frontend using the `qrcode` package from real booking details like booking id, user id, venue id, date, and slot. The PDF pass is generated with jsPDF and includes the same QR."
