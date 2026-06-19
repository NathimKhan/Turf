# TURFX

Local MERN turf booking project. The app is split into two parts:

```text
Turf/
|-- frontend/   React and Vite client
|-- backend/    Express and MongoDB API
`-- package.json
```

## Install

```bash
npm install --prefix frontend
npm install --prefix backend
```

Create `backend/.env` from `backend/.env.example`. The frontend uses the local
Vite proxy by default, so no frontend environment file is required for local
development.

Seed the portfolio demo accounts and sample data:

```bash
npm run seed
```

The seeded quick-login accounts are:

- Platform Owner: `admin@turfx.com` / `Admin@123`
- Turf Owner: `owner1@turfx.com` / `Owner@123`
- User: `user1@turfx.com` / `User@123`

## Run locally

Start both applications:

```bash
npm run dev
```

Or run them in separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

The frontend runs at `http://localhost:5173` and proxies `/api` and `/uploads`
to the backend at `http://localhost:5000`.
