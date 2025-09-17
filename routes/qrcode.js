const express = require("express");
const {
  qrcodeGenerate,
  getQRCodeData,
  verifyPassword,
  updateQRCodeData,
  getQRCodePageToken
} = require("../controllers/qrcodeController");

const {
  verifyQRCodePageToken,
  verifyToken
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/generate-qrcode", verifyToken, qrcodeGenerate);
router.get("/get-qrcode-data", verifyQRCodePageToken, getQRCodeData);
router.get("/get-qrcode-data-by-admin", getQRCodeData);
router.post("/verify-password", verifyPassword);
router.patch("/update-qrcode-data", updateQRCodeData);
router.get("/get-qrcode-page-token", getQRCodePageToken);

module.exports = router;
