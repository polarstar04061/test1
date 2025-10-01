const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const { db, admin } = require("../helper/firebaseAdmin");

const profilesRef = db.collection("profiles");

async function getUserProfile(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID ist erforderlich",
        error: "User ID ist erforderlich",
      });
    }

    // Find Profile
    const snapshot = await profilesRef.where("userId", "==", userId).get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: false,
        message: "Profil existiert nicht",
        error: "Profil existiert nicht",
      });
    }

    const profileDoc = snapshot.docs[0];
    const profileData = profileDoc.data();

    return res.status(200).json({ success: true, data: profileData });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen des Profils",
      error: error.message,
    });
  }
}

async function updateUserProfile(req, res) {
  try {
    const profileData = req.body;
    const { userId } = profileData;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID ist erforderlich",
        error: "User ID ist erforderlich",
      });
    }

    console.log("Updating profile for userId:", userId);

    // Find profile by userId field using where clause
    const snapshot = await db
      .collection("profiles")
      .where("userId", "==", userId)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Profil nicht gefunden",
        error: "Profil nicht gefunden",
      });
    }

    // Get the first matching document
    const profileDoc = snapshot.docs[0];
    const profileRef = profileDoc.ref;

    // Remove userId from update data to avoid duplication
    const { userId: _, ...updateData } = profileData;

    // Update the document
    await profileRef.set(
      {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profil erfolgreich aktualisiert!",
      data: { userId, ...updateData },
    });
  } catch (error) {
    console.error("Error updating profile data:", error);
    return res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren des Benutzerprofils",
      error: error.message,
    });
  }
}

// Alternative: Find and update by userId field (not document ID)
async function updateUserProfileByField(req, res) {
  try {
    const profileData = req.body;
    const { userId } = profileData;

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID ist erforderlich",
        error: "User ID ist erforderlich",
      });
    }

    console.log("Finding and updating profile for userId:", userId);

    // Find profile by userId field
    const snapshot = await profilesRef.where("userId", "==", userId).get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Profil nicht gefunden",
      });
    }

    // Get the first matching document
    const profileDoc = snapshot.docs[0];
    const profileRef = profileDoc.ref;

    // Remove userId from update data to avoid duplication
    const { userId: _, ...updateData } = profileData;

    await profileRef.set(
      {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profil erfolgreich aktualisiert!",
      data: { userId, ...updateData },
    });
  } catch (error) {
    console.error("Error updating profile data:", error);
    return res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren des Benutzerprofils",
      error: error.message,
    });
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateUserProfileByField,
};
