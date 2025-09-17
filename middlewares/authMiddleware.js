require("dotenv").config();
const { admin } = require("../helper/firebaseAdmin");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "Token existiert nicht" });
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Token ist abgelaufen" });
  }
};

const verifyQRCodePageToken = async (req, res, next) => {
  const qr_page_token = req.cookies.qr_page_token;

  if (!qr_page_token)
    return res.status(402).json({
      message: "Bitte scannen Sie den QR-Code mit Ihrer Kamera.",
      error: qr_page_token || ""
    });
  try {
    const decoded = jwt.verify(qr_page_token, secret);
    req.qrId = decoded.qrId;
    next();
  } catch (error) {
    console.log(error);
    res
      .status(402)
      .json({ message: "Bitte scannen Sie den QR-Code mit Ihrer Kamera." });
  }
  // }
};

module.exports = { verifyToken, verifyQRCodePageToken };
