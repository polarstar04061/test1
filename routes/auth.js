const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post("/register", authController.register);
// Login route
router.post("/login", authController.login);

// Forgot password route
router.post("/forgot-password", authController.forgotPassword);

// Reset password route
router.patch("/reset-password/:token", authController.resetPassword);

router.delete("/logout", authController.logout);

module.exports = router;
