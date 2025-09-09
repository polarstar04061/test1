const express = require("express");
const {
  getUserDataByPage,
  resetQRPassword
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/get-user-data-by-page", getUserDataByPage);
router.patch("/reset-qrcode-password", resetQRPassword);

module.exports = router;
