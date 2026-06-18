# TURFX Production Implementation Plan

## 1. Stabilize Domain Contracts

- Add account approval/status fields without changing role values.
- Add explicit booking and payment state machines.
- Add favorite persistence and dynamic search metadata.
- Keep compatibility aliases only where existing clients may use them.

## 2. Harden Authentication and Authorization

- Separate user and owner registration behavior.
- Prevent pending, rejected, and suspended owners from logging in.
- Add admin owner approval/rejection/suspension actions.
- Prevent owners from changing venue approval state.
- Add auth and API rate limiting.

## 3. Complete Core Backend Workflows

- Owner-scoped venue inventory and CRUD.
- Public approved-venue search and date availability.
- Atomic fixed-duration slot reservation.
- User cancellation and owner/admin status management.
- Payment provider abstraction with future gateway compatibility.
- Booking, approval, cancellation, and venue notifications.
- Completed-booking review eligibility.

## 4. Replace Frontend Demo Data

- Remove demo login credentials and mock query service.
- Convert hooks to the existing API client.
- Normalize backend objects through centralized adapters.
- Populate search filters from MongoDB metadata.
- Connect public, user, owner, and admin screens to live APIs.
- Preserve the current JSX structure, styles, animations, and visual system.

## 5. Testing and QA

- Add backend integration tests for registration, approval, ownership,
  booking collision, cancellation, and authorization.
- Add frontend production build and lint checks.
- Exercise key routes with an HTTP smoke suite.
- Verify that empty-database states render without runtime errors.

## Compatibility Rules

- Roles remain exactly `admin`, `owner`, and `user`.
- Existing JWT bearer and cookie authentication remain supported.
- Existing route aliases remain available unless unsafe.
- Existing UI styling and component primitives remain unchanged.
- Seed data becomes opt-in development fixtures, never runtime application data.

