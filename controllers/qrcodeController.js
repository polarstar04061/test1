const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const { db, admin } = require("../helper/firebaseAdmin");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  convertPassword,
  verifyPwd,
  generate6DigitPassword
} = require("../helper/utils");

const { generateQRCodePageToken } = require("../config/jwt");

dotenv.config();

async function qrcodeGenerate(req, res) {
  try {
    const formData = req.body;

    // Convert to consistent case if needed (optional)
    const nameToCheck = formData.name.trim();
    const userIdToCheck = formData.userId.toString(); // Ensure string comparison

    const qrCodeDataQuery = await db
      .collection("qrCodes")
      .where("name", "==", nameToCheck)
      .where("userId", "==", userIdToCheck)
      .limit(1)
      .get();

    if (!qrCodeDataQuery.empty) {
      return res.status(400).json({
        success: false,
        message:
          "Ein QR-Code mit diesem Namen und dieser Benutzer-ID existiert bereits für diesen Benutzer."
      });
    }

    const qrId = uuidv4();

    // Generate QR code data URL
    const qrCodeData = qrId;

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: "H",
      margin: 1,
      scale: 10
    });

    // Convert data URL to buffer
    const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${`qr-codes/${qrId}.png`}`,
      Body: imageBuffer,
      ContentType: "image/png"
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

    // generate password
    const password = generate6DigitPassword();

    // Save data to Firestore
    const docRef = await db
      .collection("qrCodes")
      .doc(qrId)
      .set({
        ...formData,
        password: convertPassword(password),
        qrId,
        qrCodeImageUrl: fileUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return res.status(200).json({
      success: true,
      qrCodeData: qrCodeData,
      downloadUrl: fileUrl,
      password: password,
      message: "QR-Code wurde erfolgreich generiert."
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return res.status(500).json({
      success: false,
      message: "QR-Code konnte nicht generiert werden",
      error: error.message
    });
  }
}

async function getQRCodeData(req, res) {
  try {
    const { qrId } = req.query;
    if (!qrId) {
      return res.status(400).json({
        success: false,
        message: "QR-Code-ID ist erforderlich",
        error: "QR-Code-ID ist erforderlich"
      });
    }

    const userRef = db.collection("qrCodes").doc(qrId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "QR-Code nicht gefunden",
        error: "QR-Code nicht gefunden"
      });
    }

    return res.status(200).json({ success: true, data: doc.data() });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({
      success: false,
      message: "QR-Code-Daten konnten nicht abgerufen werden",
      error: error.message
    });
  }
}

async function getQRCodePageToken(req, res) {
  try {
    const { qrId } = req.query;
    const pageToken = generateQRCodePageToken(qrId);

    res.cookie("qr_page_token", pageToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "none",
      maxAge: 1000 * 10 // 10s
    });
    return res.status(200).json({ success: true, pageToken: pageToken });
  } catch (error) {
    console.error("Fehler beim Abrufen des QR-Code-Seitentokens:", error);
    return res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen des QR-Code-Seitentokens",
      error: error.message
    });
  }
}

async function verifyPassword(req, res) {
  try {
    const { password, qrId } = req.body;

    const docRef = db.collection("qrCodes").doc(qrId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "QR-Daten nicht gefunden" });
    }

    const data = doc.data();

    if (!data.password) {
      return res
        .status(400)
        .json({ success: false, message: "Passwortfeld nicht gefunden" });
    }

    const convertedPwd = verifyPwd(data.password);
    if (password != convertedPwd.password) {
      return res
        .status(400)
        .json({ success: false, message: "Das Passwort ist nicht korrekt." });
    }

    res.json({
      success: true,
      password: data.password,
      message: "Sie können QR-Code-Daten bearbeiten."
    });
  } catch (error) {
    console.error("Error verifying QR Code data:", error);
    return res.status(500).json({
      success: false,
      message: "Die Überprüfung der QR-Code-Daten ist fehlgeschlagen",
      error: error.message
    });
  }
}

async function updateQRCodeData(req, res) {
  const formData = req.body;

  try {
    const docRef = await db.collection("qrCodes").doc(formData.qrId).set(
      {
        name: formData.name,
        userId: formData.userId,
        description: formData.description,
        category: formData.category,
        contactOptions: formData.contactOptions,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      message: "QR-Code wurde erfolgreich aktualisiert."
    });
  } catch (error) {
    console.error("Error update QR code data:", error);
    return res.status(500).json({
      success: false,
      message: "Aktualisierung der QR-Code-Daten fehlgeschlagen",
      error: error.message
    });
  }
}

module.exports = {
  qrcodeGenerate,
  getQRCodeData,
  getQRCodePageToken,
  verifyPassword,
  updateQRCodeData
};
