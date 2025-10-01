const express = require("express");
const {
  getUserDataByPage,
  resetQRPassword,
  generateQRCodesByCount,
  downloadAllQRCodes,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/get-user-data-by-page", getUserDataByPage);
router.patch("/reset-qrcode-password", resetQRPassword);
router.patch("/generate-qrcodes-by-count", generateQRCodesByCount);
router.get("/get-all-qrcode-urls", downloadAllQRCodes);

module.exports = router;
