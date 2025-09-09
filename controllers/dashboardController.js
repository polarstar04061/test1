const dotenv = require("dotenv");
const { db, admin } = require("../helper/firebaseAdmin");
const { generate6DigitPassword, convertPassword } = require("../helper/utils");

dotenv.config();

async function getUserDataByPage(req, res) {
  try {
    const {
      startIndex,
      endIndex,
      field = "name",
      sort = "asc",
      searchText
    } = req.query;

    // Validate parameters
    if (!startIndex || !endIndex) {
      return res.status(400).json({
        success: false,
        error: "startIndex und endIndex sind erforderlich",
        message: "startIndex und endIndex sind erforderlich"
      });
    }

    const start = parseInt(startIndex);
    const end = parseInt(endIndex);
    const size = end - start;

    let query = db.collection("qrCodes");

    // Apply search if searchText exists
    if (searchText) {
      // Correct partial text search implementation
      query = query
        .orderBy("name") // Must order by this field first
        .startAt(searchText) // Matches values >= searchText
        .endAt(searchText + "\uf8ff"); // Matches values <= searchTerm + Unicode boundary
    }

    // Get total count (need separate unfiltered count query)
    const countQuery = searchText
      ? db
          .collection("qrCodes")
          .orderBy("name")
          .startAt(searchText)
          .endAt(searchText + "\uf8ff")
      : db.collection("qrCodes");

    const totalCount = (await countQuery.count().get()).data().count;

    // Apply additional sorting if not searching
    if (!searchText) {
      query =
        field && sort
          ? query.orderBy(field, sort)
          : query.orderBy("createdAt", "desc");
    }

    // Apply pagination
    query = query.limit(size).offset(start);

    const snapshot = await query.get();
    const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({
      success: true,
      userData: results,
      total: totalCount,
      message: "Daten erfolgreich abgerufen"
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    return res.status(500).json({
      success: false,
      message: "Suche fehlgeschlagen",
      error: error.message,
      solution:
        "Stellen Sie sicher, dass alle Dokumente ein Feld „name_lowercase” enthalten und dass dieses Feld indiziert ist."
    });
  }
}

async function resetQRPassword(req, res) {
  const { qrId } = req.body;

  // generate new password
  const password = generate6DigitPassword();

  try {
    const docRef = await db
      .collection("qrCodes")
      .doc(qrId)
      .set(
        {
          password: convertPassword(password)
        },
        {
          merge: true
        }
      );

    return res.status(200).json({
      success: true,
      newQRPassword: password,
      message: "Das QR-Code-Passwort wurde zurückgesetzt."
    });
  } catch (error) {
    console.error("Error update QR code data:", error);
    return res.status(500).json({
      success: false,
      message: "Das Zurücksetzen des QR-Code-Passworts ist fehlgeschlagen",
      error: error.message
    });
  }
}
module.exports = {
  getUserDataByPage,
  resetQRPassword
};
