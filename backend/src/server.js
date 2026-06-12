const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const dotenvPath = path.join(__dirname, "../.env");
const dotenvResult = require("dotenv").config({ path: dotenvPath });
if (dotenvResult.error) {
  console.warn(`[env] backend/.env not loaded from ${dotenvPath}; using existing process environment.`);
} else {
  console.log(`[env] backend/.env loaded from ${dotenvPath}`);
}

const connectDatabase = require("./config/database");
const { errorMiddleware, notFound } = require("./middleware/errorMiddleware");
const swaggerSpec = require("./docs/swagger");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const turfRoutes = require("./routes/turfRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const eventRoutes = require("./routes/eventRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TURFX API is running",
    data: {
      docs: "/api/docs",
      health: "/api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/turfs", turfRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorMiddleware);

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  connectDatabase()
    .then(() => {
      app.listen(port, () => {
        console.log(`TURFX API listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error(`Failed to start server: ${error.message}`);
      process.exit(1);
    });
}

module.exports = app;
