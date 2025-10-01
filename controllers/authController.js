const { db } = require("../helper/firebaseAdmin");
const { generateVerificationCode } = require("../helper/utils");
const { hashPassword, comparePassword } = require("../services/crypto");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  generateToken,
  generate2FAToken,
  verify2FAToken,
  generateTempAuthToken,
} = require("../config/jwt");
const {
  sendPasswordResetEmail,
  sendDoubleOptInEmail,
  send2FACodeEmail,
} = require("../services/email");

const usersRef = db.collection("users");
const profilesRef = db.collection("profiles");

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const snapshot = await usersRef.where("email", "==", email).get();
    if (!snapshot.empty) {
      const existingUser = snapshot.docs[0].data();

      // Check if user is already verified
      if (existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          status: "error",
          message: "Benutzer mit dieser E-Mail-Adresse existiert bereits",
          error: "Benutzer mit dieser E-Mail-Adresse existiert bereits",
        });
      }

      // If user exists but is not verified, we can update the record or inform user
      return res.status(400).json({
        success: false,
        status: "error",
        message:
          "E-Mail bereits registriert, aber noch nicht verifiziert. Bitte überprüfen Sie Ihre E-Mails oder fordern Sie einen neuen Bestätigungslink an.",
        error:
          "E-Mail bereits registriert, aber noch nicht verifiziert. Bitte überprüfen Sie Ihre E-Mails oder fordern Sie einen neuen Bestätigungslink an.",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user document
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      role: 0,
      twoFactorEnabled: false,
      createdAt: new Date(),
    };

    const userRef = await usersRef.add(userData);
    const userId = userRef.id;

    // Create new user profile
    const userProfileData = {
      userId: userId,
      email: email,
      createdAt: new Date(),
    };

    const profileRef = await profilesRef.add(userProfileData);

    // Create JWT verification token with 24-hour expiry
    const verificationToken = jwt.sign(
      {
        userId,
        purpose: "email_verification",
        type: "signup",
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" } // Token expires in 24 hours
    );
    // Send verification email
    const verificationLink = `${process.env.FRONTEND_ENDPOINT}/de/verify-email?token=${verificationToken}`;

    await sendDoubleOptInEmail(email, verificationLink);

    return res.status(200).json({
      success: true,
      message: "Bestätigungs-E-Mail gesendet! Bitte überprüfen Sie diese.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message, error: err.message });
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
        error: "Ungültige Anmeldedaten",
      });
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const user = userDoc.data();

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        status: "error",
        message:
          "Bitte überprüfen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.",
        error:
          "Bitte überprüfen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.",
      });
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(402).json({
        success: false,
        message: "Ungültige Anmeldedaten",
        error: "Ungültige Anmeldedaten",
      });
    }

    // Check if 2FA is enabled

    // Generate 2FA code
    const code = generateVerificationCode();

    // Generate JWT token containing the code (expires in 10 minutes)
    const twoFAToken = generate2FAToken(userId, code);

    // // Send 2FA code via email
    await send2FACodeEmail(user.email, code);

    // Generate temporary auth token for the 2FA flow
    const tempAuthToken = generateTempAuthToken(userId);

    return res.status(200).json({
      success: true,
      requires2FA: true,
      twoFAToken: twoFAToken, // Contains code and expiration
      tempAuthToken: tempAuthToken, // For final authentication
      user: {
        id: userId,
        email: user.email,
        isVerified: true,
        role: user.role,
      },
      message: "2FA-Code an Ihre E-Mail-Adresse gesendet",
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
        error: "Benutzer-E-Mail nicht gefunden",
      });
    }

    const userDoc = snapshot.docs[0];
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetUrl = `${process.env.FRONTEND_ENDPOINT}/de/auth/reset-password?oobCode=${resetToken}`;

    // Set token and expiry (1 hour)
    await userDoc.ref.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: new Date(Date.now() + 3600000),
    });

    // Send email
    await sendPasswordResetEmail(email, resetUrl);

    res.status(200).json({
      success: true,
      message:
        "E-Mail zum Zurücksetzen erfolgreich gesendet. Bitte überprüfen Sie Ihre E-Mails auf den Link zum Zurücksetzen.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
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
        error: "Ungültiges Token",
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
        error: "Abgelaufenes Token",
      });
    }

    const hashedPassword = await hashPassword(password);

    await validUser.ref.set(
      {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
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
      message: "Passwort konnte nicht aktualisiert werden",
    });
  }
};

exports.logout = async (req, res) => {
  res.cookie("auth_token", "", {
    secure: process.env.NODE_ENV === "production" ? true : true,
    httpOnly: true, // Recommended for security
    sameSite: process.env.NODE_ENV === "production" ? "none" : "none",
    path: "/",
  });
  res.status(200).json({ success: true, message: "Abmelden war erfolgreich." });
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Ungültiger Bestätigungslink",
        message: "Ungültiger Bestätigungslink",
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          error: "Der Bestätigungslink ist abgelaufen.",
          error: "Der Bestätigungslink ist abgelaufen.",
        });
      }
      return res.status(400).json({
        success: false,
        error: "Ungültiger Bestätigungslink",
        message: "Ungültiger Bestätigungslink",
      });
    }

    // Check if token has the correct purpose
    if (decoded.purpose !== "email_verification") {
      return res.status(400).json({
        success: false,
        error: "Ungültiger Token-Zweck",
        message: "Ungültiger Token-Zweck",
      });
    }

    const userId = decoded.userId;
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Benutzer nicht gefunden",
        error: "Benutzer nicht gefunden",
      });
    }

    const user = userDoc.data();

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "E-Mail bereits bestätigt",
        error: "E-Mail bereits bestätigt",
      });
    }

    // Verify the user by updating isVerified field
    await userRef.update({
      isVerified: true,
      verifiedAt: new Date(),
    });

    const authToken = generateToken(userId);

    res.json({
      success: true,
      status: "success",
      message: "E-Mail erfolgreich bestätigt!",
      token: authToken,
      user: {
        id: userId,
        email: user.email,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);

    if (error.message === "Invalid or expired verification token") {
      return res.status(400).json({
        success: false,
        status: "error",
        message:
          "Der Bestätigungslink ist abgelaufen. Bitte fordern Sie einen neuen an.",
        error:
          "Der Bestätigungslink ist abgelaufen. Bitte fordern Sie einen neuen an.",
      });
    }

    res.status(500).json({
      success: false,
      status: "error",
      message: "Fehler beim Überprüfen der E-Mail-Adresse",
      error: "Fehler beim Überprüfen der E-Mail-Adresse",
    });
  }
};

exports.verify2FALogin = async (req, res) => {
  try {
    const { twoFAToken, tempAuthToken, code } = req.body;

    // Verify the 2FA token (contains the code and expiration)
    const decoded2FA = verify2FAToken(twoFAToken);

    // Check if the provided code matches the one in the token
    if (decoded2FA.code !== code) {
      return res.status(400).json({
        success: false,
        error: "Ungültiger Bestätigungscode",
        message: "Ungültiger Bestätigungscode",
      });
    }

    // Verify the temporary auth token
    const { verifyAuthToken, generateAuthToken } = require("../config/jwt");
    const decodedTempAuth = verifyAuthToken(tempAuthToken);

    // Check if both tokens belong to the same user
    if (decoded2FA.userId !== decodedTempAuth.userId) {
      return res.status(400).json({
        success: false,
        error: "Token-Fehlanpassung",
        message: "Token-Fehlanpassung",
      });
    }

    // Generate final auth token
    const authToken = generateAuthToken(decoded2FA.userId);

    // Get user data
    const userRef = db.collection("users").doc(decoded2FA.userId);
    const userDoc = await userRef.get();
    const user = userDoc.data();

    // Generate token
    const token = generateToken(userDoc.id);

    // Calculate 30 days in milliseconds
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    res.cookie("auth_token", token, {
      secure: process.env.NODE_ENV === "production" ? true : true,
      httpOnly: true, // Recommended for security
      sameSite: process.env.NODE_ENV === "production" ? "none" : "none",
      maxAge: THIRTY_DAYS,
      path: "/",
    });

    res.json({
      success: true,
      token: authToken,
      user: {
        id: decoded2FA.userId,
        email: user.email,
        isVerified: user.isVerified,
        role: user.role,
      },
      message: "Anmeldung erfolgreich",
    });
  } catch (error) {
    console.error("2FA verification error:", error);

    if (error.message.includes("expired")) {
      return res.status(400).json({
        success: false,
        error:
          "Der Bestätigungscode ist abgelaufen. Bitte fordern Sie erneut einen 2FA-Code an.",
        message:
          "Der Bestätigungscode ist abgelaufen. Bitte fordern Sie erneut einen 2FA-Code an.",
      });
    }

    if (error.message.includes("Invalid")) {
      return res.status(400).json({
        success: false,
        error: "Ungültiger Bestätigungscode",
        message: "Ungültiger Bestätigungscode",
      });
    }

    res
      .status(500)
      .json({
        success: false,
        error: "Fehler bei der 2FA-Überprüfung",
        message: "Fehler bei der 2FA-Überprüfung",
      });
  }
};

exports.resend2FACode = async (req, res) => {
  try {
    const { tempAuthToken } = req.body;

    // Verify temporary auth token to get userId
    const { verifyAuthToken } = require("../config/jwt");
    const decoded = verifyAuthToken(tempAuthToken);
    const userId = decoded.userId;

    // Get user data
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res
        .status(404)
        .json({
          success: false,
          error: "Benutzer nicht gefunden",
          message: "Benutzer nicht gefunden",
        });
    }

    const user = userDoc.data();

    // Generate new 2FA code
    const code = generateVerificationCode();

    // Generate new 2FA token with the new code
    const twoFAToken = generate2FAToken(userId, code);

    // Send new 2FA code via email
    await send2FACodeEmail(user.email, code);

    res.json({
      success: true,
      twoFAToken: twoFAToken,
      message: "Neuer Bestätigungscode an Ihre E-Mail-Adresse gesendet",
    });
  } catch (error) {
    console.error("Resend 2FA code error:", error);

    if (error.message.includes("expired")) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Die Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
          message:
            "Die Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
        });
    }

    res
      .status(500)
      .json({
        success: false,
        error: "Fehler beim erneuten Senden des Bestätigungscodes",
        message: "Fehler beim erneuten Senden des Bestätigungscodes",
      });
  }
};
