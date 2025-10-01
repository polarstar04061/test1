const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

const generateQRCodePageToken = (qrId) => {
  return jwt.sign({ qrId: qrId }, process.env.JWT_SECRET, {
    expiresIn: process.env.QRCODE_PAGE_JWT_EXPIRES_IN || "10s",
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// 2FA-specific JWT functions
const generate2FAToken = (userId, code) => {
  return jwt.sign(
    {
      userId,
      code,
      type: "2fa_verification",
    },
    process.env.JWT_SECRET,
    { expiresIn: "1m" } // 2FA token expires in 10 minutes
  );
};

const verify2FAToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired 2FA token");
  }
};

const generateTempAuthToken = (userId) => {
  return jwt.sign(
    { userId, type: "temp_auth" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // Temporary auth token for 2FA flow
  );
};

const verifyAuthToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired authentication token");
  }
};

const generateAuthToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

module.exports = {
  generateToken,
  generateAuthToken,
  generateQRCodePageToken,
  verifyToken,
  generate2FAToken,
  verify2FAToken,
  generateTempAuthToken,
  verifyAuthToken,
};
