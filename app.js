const express = require("express");
const fs = require("fs");
const https = require("https");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");

// Load environment variables
dotenv.config();

const {
  verifyToken,
  verifyQRCodePageToken,
} = require("./middlewares/authMiddleware");

// api routes
const authRoutes = require("./routes/auth");
const qrcodeRoutes = require("./routes/qrcode");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cookieParser());

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Define allowed origins
    const allowedOrigins = [
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://13.49.196.146:3000",
      "http://13.49.196.146:5000",
      // Add your production domain here
      process.env.FRONTEND_URL || "http://localhost:5000",
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  exposedHeaders: ["set-cookie"],
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));

// Serve static files with proper caching
app.use(
  express.static(path.resolve(__dirname, "out"), {
    maxAge: "1d",
    etag: true,
    lastModified: true,
  })
);

app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/qrcode", qrcodeRoutes);
app.use("/api/dashboard", verifyToken, dashboardRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "out", "index.html"));
});

// Catch-all route for Next.js client-side routing
app.use((req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith("/api/")) {
    return next();
  }

  // For all other routes, serve the appropriate HTML file
  const filePath = path.join(__dirname, "out", req.path, "index.html");

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Fallback to main index.html for client-side routing
    res.sendFile(path.join(__dirname, "out", "index.html"));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0"; // Listen on all interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://127.0.0.1:${PORT}`);
});
