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
  origin: process.env.NODE_ENV === "development" ? "*" : "*", // Allow all origins in production or set specific domain
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

  // Check if the request is for a static asset
  if (req.path.startsWith("/_next/") || req.path.includes(".")) {
    return res.status(404).send("Not found");
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

// Use environment port or default to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
