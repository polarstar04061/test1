const express = require("express");
const fs = require("fs");
const https = require("https");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");
const {
  verifyToken,
  verifyQRCodePageToken
} = require("./middlewares/authMiddleware");

// api routes
const authRoutes = require("./routes/auth");
const qrcodeRoutes = require("./routes/qrcode");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cookieParser());

const corsOptions = {
  origin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://your-nextjs-app.com",
  credentials: true,
  exposedHeaders: ["set-cookie"],
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
};

app.use(cors(corsOptions));

app.use(express.static(path.resolve(__dirname, "./public")));
app.use(express.static(path.resolve(__dirname, "build")));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/qrcode", qrcodeRoutes);
app.use("/api/dashboard", verifyToken, dashboardRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "out", "index.html"));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
