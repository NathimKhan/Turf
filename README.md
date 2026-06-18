# TURFX

The project is split into two independent applications:

```text
Turf/
|-- frontend/   React and Vite client
|-- backend/    Express and MongoDB API
|-- render.yaml Backend deployment configuration
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

## Prototype QA

The complete issue ledger, route audit, interaction report, remaining
limitations, and tutor demonstration script are in
`docs/PROTOTYPE_COMPLETION_REPORT.md`.

## Production

Build the frontend with its deployed backend URL:

```bash
VITE_API_URL=https://your-api.example.com/api npm run build
```

On Windows PowerShell:

```powershell
$env:VITE_API_URL = "https://your-api.example.com/api"
npm.cmd run build
```
