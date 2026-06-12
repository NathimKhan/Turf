# TURFX Backend

Complete Node.js, Express, MongoDB, and JWT backend for the TURFX turf booking frontend.

## Tech Stack

- Node.js and Express.js
- MongoDB Atlas and Mongoose
- JWT authentication with bcryptjs password hashing
- Express Validator, Helmet, CORS, cookie-parser, Multer, Nodemailer, Morgan
- Swagger docs at `/api/docs` and `/api/docs.json`

## Local Setup

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Set `MONGO_URI` and `JWT_SECRET` in `.env` before running `seed` or `dev`.

From the repository root, the same server can be started with:

```bash
npm run dev:backend
```

The separate Vite application lives in `frontend/` and can be started from the
repository root with `npm run dev:frontend`.

## Environment Variables

```bash
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/turfx?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_DAYS=7
CLIENT_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="TURFX <no-reply@turfx.local>"
```

If SMTP values are empty, Nodemailer uses JSON transport so forgot-password still runs during development.

## Demo Seed Accounts

After `npm run seed`:

- Admin: `admin@turfx.com` / `Admin@123`
- Owner: `owner1@turfx.com` / `Owner@123`
- User: `user1@turfx.com` / `User@123`

The seed script creates 10 users, 5 owners, 1 admin, 20 turfs, 50 bookings, 20 reviews, 10 events, 10 tournaments, payments, and notifications.

## MongoDB Atlas Setup

1. Create a MongoDB Atlas project and a free cluster.
2. Add a database user with read/write permissions.
3. Add your current IP for local development, or `0.0.0.0/0` for Render access.
4. Copy the Node.js connection string.
5. Replace username, password, and database name in `MONGO_URI`.
6. Run `npm run seed` locally or from a Render shell after deployment.

## Render Deployment

1. Push this repository to GitHub.
2. In Render, create a Blueprint from the repository using the root `render.yaml`.
3. Set these secret values in Render:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL` with your Netlify frontend URL
   - `API_BASE_URL` with the Render backend URL
   - SMTP values if you want real email delivery
4. Deploy the service.
5. Open `https://your-render-service.onrender.com/api/docs` to verify Swagger.
6. Run `npm run seed` from Render Shell once if you want demo data.

## API Response Format

Success:

```json
{
  "success": true,
  "message": "Message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Message"
}
```
