# TURFX Production Readiness Audit

Audit date: June 12, 2026

## Scope

The audit covered 105 JavaScript/JSX source files and 8,813 source lines across
the React/Vite frontend and Express/Mongoose backend. No behavior was modified
during the audit.

## Folder Structure

```text
Turf/
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- docs/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- seed/
|   |   |-- services/
|   |   `-- utils/
|   |-- uploads/
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |-- constants/
|   |   |-- data/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- store/
|   |   |-- styles/
|   |   `-- utils/
|   `-- package.json
|-- docs/
|-- package.json
`-- render.yaml
```

## Frontend Route Inventory

Public/auth:

- `/`, `/explore`, `/search`, `/venue/:id`, `/booking/venue/:id`
- `/memberships`, `/tournaments`, `/tournaments/:id`
- `/events`, `/events/:id`, `/support`, `/coaching`
- `/login`, `/register`, `/forgot-password`

Authenticated user:

- `/booking/slots`, `/checkout`, `/payment`, `/success`, `/booking-success`
- `/dashboard`, `/bookings`, `/bookings/:id`, `/favorites`
- `/wallet`, `/notifications`, `/profile`, `/membership-center`

Owner/admin:

- `/owner/dashboard`, `/owner/turfs`, `/owner/turfs/:id`
- `/owner/add-turf`, `/owner/slots`, `/owner/calendar`
- `/owner/bookings`, `/owner/reviews`, `/owner/revenue`
- `/owner/analytics`, `/owner/crm`, `/owner/athletes/:id`

Admin:

- `/admin/dashboard`, `/admin/users`, `/admin/owners`, `/admin/turfs`
- `/admin/bookings`, `/admin/revenue`, `/admin/analytics`
- `/admin/notifications`, `/admin/events`, `/admin/tournaments`
- `/admin/reports`, `/admin/settings`

## Backend API Inventory

Authentication:

- Register, login, logout, profile, profile update
- Change password, forgot password, reset password

Users:

- Admin list, detail, update, and delete

Turfs:

- Public list, search, city lookup, and detail
- Owner/admin create, update, delete, and schedule update

Bookings:

- Create, current-role list, detail, and cancellation

Payments:

- Checkout/create and payment history

Reviews:

- Create, list by turf, and delete

Notifications:

- Current-user list, admin create, mark read, and delete

Events and tournaments:

- Public list/detail and owner/admin CRUD

Dashboards:

- Admin dashboard and owner dashboard

## Controllers

- `authController`: authentication, profile, and password recovery
- `userController`: admin account management
- `turfController`: venue search and owner-managed venue CRUD
- `bookingController`: booking creation, scoping, collision checks, cancellation
- `paymentController`: simulated successful payment and payment history
- `reviewController`: review CRUD and aggregate turf ratings
- `notificationController`: user notifications
- `eventController` and `tournamentController`: content CRUD
- `adminController` and `ownerController`: aggregate dashboards

## Middleware

- JWT bearer/cookie authentication
- Role authorization for `admin` and `owner`
- Express Validator error handling
- Multer image upload filtering and size limits
- Helmet, CORS, JSON parsing, cookie parsing, and Morgan

## Models

- `User`, `Turf`, `Booking`, `Payment`, `Review`
- `Notification`, `Event`, `Tournament`

## Authentication Flow

1. Login/register returns a JWT in JSON and an HTTP-only cookie.
2. The frontend also stores the JWT and public user object in local storage.
3. Axios sends the JWT as a bearer token.
4. `protect` verifies the token and reloads the user.
5. Frontend protected routes enforce role labels and route access.

Internal role values are correctly limited to `admin`, `owner`, and `user`.
User-facing labels are already mapped to Platform Owner, Turf Owner, and User.

## Demo and Hardcoded Data Locations

- `frontend/src/data/turfxData.js`: venues, sports, bookings, events,
  tournaments, notifications, members, dashboards, analytics, admin tables
- `frontend/src/services/mockApi.js`: all primary query hooks
- `frontend/src/services/authService.js`: demo credentials and login shortcuts
- `frontend/src/store/store.js`: fixed venue, date, slot, and pricing cart
- `frontend/src/pages/**`: fixed wallet, profile, support, owner, and admin data
- `frontend/src/components/shared/SearchFilters.jsx`: fixed search options
- `backend/src/seed/seed.js`: destructive demo dataset and shared credentials

## Critical Findings

1. The frontend API modules exist, but primary pages use `mockApi` and static
   arrays instead of MongoDB-backed endpoints.
2. Owner registration immediately authenticates owners. There is no pending,
   approved, rejected, or suspended account workflow.
3. JWT middleware verifies identity and role but does not reject suspended or
   pending accounts.
4. Admin owner approval, rejection, and suspension APIs do not exist.
5. Venue approval can be changed by an owner because `isApproved` is included
   in the general update field list.
6. Public turf detail can expose an unapproved venue when its ID is known.
7. Booking statuses do not match the final contract. The model stores
   `upcoming` instead of explicit `pending` and `confirmed`.
8. Booking collision prevention is a read-then-write check and is vulnerable
   to concurrent requests.
9. Booking creation accepts past dates and does not require slot-duration
   alignment.
10. Owners and admins can use the user booking endpoint.
11. Owners can mark a payment paid through the checkout endpoint.
12. Payment logic is embedded in the controller and always creates a
    successful payment; no provider abstraction or refund status exists.
13. Reviews do not require a completed booking.
14. Favorites have UI routes but no persistence model or API.
15. Search location and sport options are hardcoded and date availability is
    not returned by the API.
16. Admin and owner screens are presentation-only tables with no real actions.
17. Forgot password UI does not call the existing backend endpoint.
18. Registration lacks confirm-password validation and owner business fields.
19. Profile update permits clients to change `membershipPlan`.
20. No request rate limiting is configured.
21. No automated tests exist.
22. Backend `lint` checks only `server.js`, not all backend source files.
23. The local JWT secret is weak and must be rotated before production.
24. The seed command deletes every document from all application collections.
25. Several page modules are very large, increasing regression risk and making
    data ownership unclear.

## Duplicate or Dead Logic

- `mockApi` duplicates backend API services.
- Booking status is represented differently in backend models, frontend Zod
  schemas, Redux state, and hardcoded page objects.
- `/bookings` and `/bookings/my-bookings` are aliases.
- `/payments/create` and `/payments/checkout` are aliases.
- `/auth/profile` and `/auth/me` are aliases.
- The frontend API schemas are not used to validate API responses.
- Many buttons and forms only update local state or prevent submission.

## Security Review

Present:

- bcrypt password hashing
- JWT expiration and HTTP-only cookie support
- Helmet
- origin allow-list CORS
- role middleware
- upload MIME and size checks
- generic forgot-password response
- package audit: zero known frontend or backend dependency vulnerabilities

Missing or unsafe:

- rate limiting for auth and API routes
- account status enforcement
- strong password policy
- owner approval enforcement
- atomic booking reservation
- server-side prevention of privilege-like profile changes
- production-safe payment state transitions
- automated authorization regression tests
- explicit pagination limits and query validation

## Runtime and QA Baseline

- Frontend production build: passes
- Frontend ESLint: passes
- Backend JavaScript syntax check: passes for all 42 backend source files
- Frontend and backend dependency audits: zero known vulnerabilities
- Automated test files: none

