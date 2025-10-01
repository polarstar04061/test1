const express = require("express");
const {
  getUserProfile,
  updateUserProfile,
} = require("../controllers/profileController");

const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/get-user-profile-data", getUserProfile);
router.post("/create-user-profile-data", verifyToken, updateUserProfile);

module.exports = router;
