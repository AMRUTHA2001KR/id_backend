const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const employeeRoutes = require("./routes/employeeRoutes");
const pool = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const allowedOrigins = new Set(
  [
    process.env.CLIENT_ORIGIN,
    process.env.FRONTEND_BASE_URL,
    process.env.ALLOWED_ORIGINS,
    "http://localhost:5173",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5176",
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
);

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDevOrigin =
        /^http:\/\/localhost:\d+$/.test(origin || "") ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin || "");

      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked for this origin"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => {
  res.json({ message: "Inversa Innovations Employee API running." });
});

app.use("/employees", employeeRoutes);

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err.message);
  res.status(500).json({ message: "Internal server error." });
});

pool
  .query("SELECT 1")
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect database:", error.message);
    process.exit(1);
  });
