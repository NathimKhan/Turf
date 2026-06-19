# TURFX Backend

Node.js, Express, MongoDB, and JWT backend for the TURFX turf booking frontend.

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
API_RATE_LIMIT=600
PAYMENT_PROVIDER=mock
ADMIN_NAME="TURFX Platform Owner"
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_ROTATE_PASSWORD=false
SUPPORT_EMAIL=support@example.com
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="TURFX <no-reply@turfx.local>"
```

If SMTP values are empty, Nodemailer uses JSON transport so forgot-password still runs during development.

## Local Seed

`npm run seed` is idempotent and does not delete application data. It creates
or verifies one Platform Owner from `ADMIN_NAME`, `ADMIN_EMAIL`, and
`ADMIN_PASSWORD`, then upserts baseline platform settings.

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
