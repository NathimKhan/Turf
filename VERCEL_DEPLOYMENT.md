# Vercel Deployment

Deploy this repository as two Vercel projects from the same GitHub repo.

## Backend Project

Import the repo in Vercel and set:

```txt
Root Directory: backend
Framework Preset: Express or Other
Install Command: npm install
Build Command: leave empty/default
Output Directory: leave empty/default
```

Add these environment variables in the backend Vercel project:

```txt
NODE_ENV=production
MONGO_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<at least 32 characters>
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_DAYS=7
CLIENT_URL=https://<your-frontend-project>.vercel.app
API_BASE_URL=https://<your-backend-project>.vercel.app
API_RATE_LIMIT=600
PAYMENT_PROVIDER=mock
```

After deploy, test:

```txt
https://<your-backend-project>.vercel.app/api/health
```

## Frontend Project

Import the same repo again in Vercel and set:

```txt
Root Directory: frontend
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Add this environment variable in the frontend Vercel project:

```txt
VITE_API_URL=https://<your-backend-project>.vercel.app/api
```

After the frontend URL is created, update the backend `CLIENT_URL` to the final frontend URL and redeploy the backend.

## Notes

- `frontend/vercel.json` rewrites all routes to `index.html` so refresh works on routes like `/owner/dashboard`.
- The backend skips local port listening and the background booking lifecycle interval on Vercel.
- Vercel's filesystem is not permanent for uploads. For production image uploads, use Cloudinary, S3, or another persistent storage service.
