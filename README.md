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

## Run locally

Start the backend:

```bash
npm run dev:backend
```

In another terminal, start the frontend:

```bash
npm run dev:frontend
```

The frontend runs at `http://localhost:5173` and proxies `/api` and `/uploads`
to the backend at `http://localhost:5000`.

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
