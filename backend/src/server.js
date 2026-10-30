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

// Public API is also consumed by GitHub Pages and local development.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
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
