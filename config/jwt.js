const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d"
  });
};

const generateQRCodePageToken = (qrId) => {
  return jwt.sign({ qrId: qrId }, process.env.JWT_SECRET, {
    expiresIn: process.env.QRCODE_PAGE_JWT_EXPIRES_IN || "10s"
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, generateQRCodePageToken, verifyToken };
