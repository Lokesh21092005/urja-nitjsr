const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

// Load env variables from backend/.env even when the server is started elsewhere.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import routes
const authRoutes = require("./routes/auth");
const scoreRoutes = require("./routes/scores");
const leaderboardRoutes = require("./routes/leaderboard");

const app = express();

// --------------- Middleware ---------------

// Allow the URJA frontend origins explicitly.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin =
    !origin ||
    /^(https?:\/\/localhost(:\d+)?|https?:\/\/127\.0\.0\.1(:\d+)?)$/.test(origin) ||
    /^https:\/\/([a-z0-9-]+\.)?urja-nit-jsr\.com$/i.test(origin);

  if (origin && isAllowedOrigin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(isAllowedOrigin ? 204 : 403);
  }
  next();
});

// Parse JSON bodies
app.use(express.json());

// --------------- Routes ---------------

app.get("/", (req, res) => {
  res.json({ message: "URJA 2026 API is running 🏃" });
});

app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// --------------- Start Server ---------------

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
