const { db } = require("../helper/firebaseAdmin");
const { generateToken } = require("../config/jwt");
const { sendPasswordResetEmail } = require("../services/email");
const { hashPassword, comparePassword } = require("../services/crypto");
const crypto = require("crypto");

const usersRef = db.collection("users");

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const snapshot = await usersRef.where("email", "==", email).get();
    if (!snapshot.empty) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userRef = await usersRef.add({
      email,
      password: hashedPassword,
      createdAt: new Date()
    });

    // Generate token
    const token = generateToken(userRef.id);

    return res.status(200).json({ token: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const snapshot = await usersRef.where("email", "==", email).get();
    if (snapshot.empty) {
      return res.status(402).json({
        success: false,
        message: "Ungültige Anmeldedaten",
        error: "Ungültige Anmeldedaten"
      });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(402).json({
        success: false,
        message: "Ungültige Anmeldedaten",
        error: "Ungültige Anmeldedaten"
      });
    }

    // Generate token
    const token = generateToken(userDoc.id);

    // Calculate 30 days in milliseconds
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    res.cookie("auth_token", token, {
      secure: process.env.NODE_ENV === "production" ? true : true,
      httpOnly: true, // Recommended for security
      sameSite: process.env.NODE_ENV === "production" ? "none" : "none",
      maxAge: THIRTY_DAYS,
      path: "/"
    });
    res.status(200).json({
      success: true,
      token,
      user: { id: userDoc.id, email: user.email },
      message: "Die Anmeldung war erfolgreich."
    });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ status: false, error: err.message, message: err.message });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const snapshot = await usersRef.where("email", "==", email).get();
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Benutzer-E-Mail nicht gefunden",
        error: "Benutzer-E-Mail nicht gefunden"
      });
    }

    const userDoc = snapshot.docs[0];
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetUrl = `${process.env.FRONTEND_ENDPOINT}/auth/reset-password?oobCode=${resetToken}`;

    // Set token and expiry (1 hour)
    await userDoc.ref.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: new Date(Date.now() + 3600000)
    });

    // Send email
    await sendPasswordResetEmail(email, resetUrl);

    res.status(200).json({
      success: true,
      message:
        "E-Mail zum Zurücksetzen erfolgreich gesendet. Bitte überprüfen Sie Ihre E-Mails auf den Link zum Zurücksetzen."
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // First query by token only
    const snapshot = await usersRef
      .where("resetPasswordToken", "==", token)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: "Ungültiges Token",
        error: "Ungültiges Token"
      });
    }

    // Then filter in memory
    const validUser = snapshot.docs.find((doc) => {
      const expires = doc.data().resetPasswordExpires?.toDate();
      return expires && expires > new Date();
    });

    if (!validUser) {
      return res.status(400).json({
        success: false,
        message: "Abgelaufenes Token",
        error: "Abgelaufenes Token"
      });
    }

    const hashedPassword = await hashPassword(password);

    await validUser.ref.set(
      {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      },
      { merge: true }
    );

    res
      .status(200)
      .json({ success: true, message: "Das Passwort wurde aktualisiert" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Passwort konnte nicht aktualisiert werden"
    });
  }
};

exports.logout = async (req, res) => {
  res.cookie("auth_token", "", {
    secure: process.env.NODE_ENV === "production" ? true : true,
    httpOnly: true, // Recommended for security
    sameSite: process.env.NODE_ENV === "production" ? "none" : "none",
    path: "/"
  });
  res.status(200).json({ success: true, message: "Abmelden war erfolgreich." });
};
