const dotenv = require("dotenv");
const { db, admin } = require("../helper/firebaseAdmin");
const QRCode = require("qrcode");
const { createCanvas, loadImage } = require("canvas");
const { v4: uuidv4 } = require("uuid");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const {
  generate6DigitPassword,
  convertPassword,
  buildSearchIndex,
  filterRecords,
} = require("../helper/utils");
const { search } = require("../routes/profile");

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getUserDataByPage(req, res) {
  try {
    const {
      startIndex,
      endIndex,
      field = "name",
      sort = "asc",
      searchText,
    } = req.query;

    const payload = req.query;

    // Validate parameters
    if (!startIndex || !endIndex) {
      return res.status(400).json({
        success: false,
        error: "startIndex und endIndex sind erforderlich",
        message: "startIndex und endIndex sind erforderlich",
      });
    }

    const start = parseInt(startIndex);
    const end = parseInt(endIndex);
    const size = end - start;

    let query = db.collection("qrCodes");
    if (payload?.userId) {
      query = query.where("userId", "==", payload?.userId);
    }
    // // Apply search if searchText exists
    // if (searchText) {
    //   const s = String(searchText).toLowerCase();
    //   query = query
    //     .orderBy("searchIndex")
    //     .startAt(s)
    //     .endAt(s + "\uf8ff");
    // }

    // Get total count (need separate unfiltered count query)
    const countQuery = searchText
      ? db
          .collection("qrCodes")
          .orderBy("searchIndex")
          .startAt(String(searchText).toLowerCase())
          .endAt(String(searchText).toLowerCase() + "\uf8ff")
      : db.collection("qrCodes");

    const totalCountPromise = countQuery.count().get();
    const status0Promise = db
      .collection("qrCodes")
      .where("status", "==", 0)
      .count()
      .get();
    const status1Promise = db
      .collection("qrCodes")
      .where("status", "==", 1)
      .count()
      .get();

    const [totalCountSnap, status0Snap, status1Snap] = await Promise.all([
      totalCountPromise,
      status0Promise,
      status1Promise,
    ]);

    const totalCount = totalCountSnap.data().count;
    const status0Count = status0Snap.data().count;
    const status1Count = status1Snap.data().count;

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
    // const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const results = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Check if userId exists
      if (data.userId) {
        // Query profiles collection where userId field matches
        const profileQuery = await db
          .collection("profiles")
          .where("userId", "==", data.userId)
          .limit(1)
          .get();

        if (!profileQuery.empty) {
          const profileDoc = profileQuery.docs[0];
          results.push({
            id: doc.id,
            ...data,
            profile: profileDoc.data(),
            profileId: profileDoc.id,
          });
        } else {
          results.push({
            id: doc.id,
            ...data,
            profile: null,
            note: "Profile not found",
          });
        }
      } else {
        // Handle records without userId
        results.push({
          id: doc.id,
          ...data,
          profile: null,
          note: "No userId provided",
        });
      }
    }

    const filterData = filterRecords(results, searchText);

    return res.status(200).json({
      success: true,
      userData: filterData,
      total: totalCount,
      inactiveCount: status0Count,
      activeCount: status1Count,
      message: "Daten erfolgreich abgerufen",
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    return res.status(500).json({
      success: false,
      message: "Suche fehlgeschlagen",
      error: error.message,
      solution:
        "Stellen Sie sicher, dass alle Dokumente ein Feld „name_lowercase” enthalten und dass dieses Feld indiziert ist.",
    });
  }
}

async function resetQRPassword(req, res) {
  const { qrId } = req.body;

  // generate new password
  const password = generate6DigitPassword();

  try {
    const docRef = await db.collection("qrCodes").doc(qrId).set(
      {
        password: password,
      },
      {
        merge: true,
      }
    );

    return res.status(200).json({
      success: true,
      newQRPassword: password,
      message: "Das QR-Code-Passwort wurde zurückgesetzt.",
    });
  } catch (error) {
    console.error("Error update QR code data:", error);
    return res.status(500).json({
      success: false,
      message: "Das Zurücksetzen des QR-Code-Passworts ist fehlgeschlagen",
      error: error.message,
    });
  }
}

async function generateQRCodesByCount(req, res) {
  const { qrCodeCount = 1, formData = {} } = req.body || {};

  const count = Number(qrCodeCount);
  if (!Number.isFinite(count) || count <= 0) {
    return res.status(400).json({
      success: false,
      message: "qrCodeCount muss eine positive Zahl sein",
      error: "qrCodeCount muss eine positive Zahl sein",
    });
  }

  try {
    const maxConcurrency = Number(process.env.QR_GENERATION_CONCURRENCY || 10);
    const pending = [];
    const results = [];
    let failed = 0;

    const runTask = async () => {
      const qrId = uuidv4();
      try {
        const plainPassword = generate6DigitPassword();
        // const imageBuffer = await QRCode.toBuffer(
        //   process.env.HOST + "/de" + "/pet?id=" + qrId,
        //   {
        //     errorCorrectionLevel: "H",
        //     margin: 1,
        //     scale: 10,
        //     type: "png",
        //   }
        // );
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(
          process.env.HOST + "/de" + "/pet?id=" + qrId,
          {
            errorCorrectionLevel: "H",
            margin: 1,
            scale: 10,
            type: "png",
          }
        );

        // Load QR code as image
        const qrImage = await loadImage(qrDataUrl);

        // Create canvas with extra space for text
        const canvas = createCanvas(qrImage.width, qrImage.height + 40); // Extra 40px for text
        const ctx = canvas.getContext("2d");

        // Draw white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.drawImage(qrImage, 0, 0);

        // Draw password text
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          `Password: ${plainPassword}`,
          canvas.width / 2,
          qrImage.height + 30
        );

        const combinedImageBuffer = canvas.toBuffer("image/png");

        const key = `uploads/qr-codes/${qrId}.png`;
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: combinedImageBuffer,
            ContentType: "image/png",
          })
        );

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        await db
          .collection("qrCodes")
          .doc(qrId)
          .set({
            ...formData,
            password: plainPassword,
            qrId,
            qrCodeImageUrl: fileUrl,
            searchIndex: buildSearchIndex({
              ...formData,
              qrId,
              qrCodeImageUrl: fileUrl,
            }),
            status: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        results.push({
          qrId,
          qrCodeImageUrl: fileUrl,
          password: plainPassword,
        });
      } catch (err) {
        failed += 1;
        console.error("QR task failed", { qrId, error: err && err.message });
      }
    };

    // batch with concurrency limit
    let index = 0;
    const launchNext = () => {
      if (index >= count) return null;
      index++;
      const p = runTask().finally(() => {
        // remove from pending when finished
        const i = pending.indexOf(p);
        if (i >= 0) pending.splice(i, 1);
      });
      pending.push(p);
      return p;
    };

    // prime the pool
    for (let i = 0; i < Math.min(maxConcurrency, count); i++) {
      launchNext();
    }
    // keep launching until all done
    while (pending.length > 0 || index < count) {
      if (pending.length < maxConcurrency && index < count) {
        launchNext();
      }
      // wait for one to finish; swallow errors to continue pool
      // eslint-disable-next-line no-await-in-loop
      await Promise.race(pending).catch(() => {});
    }

    return res.status(200).json({
      success: failed === 0,
      items: results,
      count: results.length,
      failed,
      message:
        failed === 0
          ? "QR-Codes erfolgreich erstellt"
          : `QR-Codes erstellt mit ${failed} Fehler(n)`,
    });
  } catch (error) {
    console.error("QR generation batch failed:", error);
    return res.status(500).json({
      success: false,
      message: "QR-Codes-Erstellung fehlgeschlagen",
      error: error.message,
    });
  }
}

async function downloadAllQRCodes(req, res) {
  try {
    // const params = {
    //   Bucket: process.env.S3_BUCKET_NAME,
    //   Prefix: "uploads/qr-codes/",
    // };

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: "uploads/qr-codes/",
    });
    const response = await s3.send(command);

    if (!response.Contents) {
      return res.status(402).json({
        success: true,
        images: [],
        total: 0,
        message: "Keine Dateien im angegebenen Verzeichnis gefunden",
        error: "Keine Dateien im angegebenen Verzeichnis gefunden",
      });
    }

    // Filter and process images
    const imagePromises = response.Contents.filter((item) => {
      // Filter for image files
      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".bmp",
        ".tiff",
      ];
      const isImage = imageExtensions.some((ext) =>
        item.Key.toLowerCase().endsWith(ext)
      );
      const isFile = !item.Key.endsWith("/"); // Exclude folders
      return isImage && isFile;
    }).map(async (item) => {
      // Generate presigned URL for download
      const { GetObjectCommand } = require("@aws-sdk/client-s3");
      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: item.Key,
      });

      const downloadUrl = await getSignedUrl(s3, getObjectCommand, {
        expiresIn: 3600, // 1 hour
      });

      const fileName = item.Key.split("/").pop();

      return {
        key: item.Key,
        url: downloadUrl,
        name: fileName,
        size: item.Size,
        lastModified: item.LastModified,
        type: item.Key.split(".").pop().toLowerCase(),
        identifier: fileName.replace(/\.[^/.]+$/, ""), // remove extension
      };
    });

    const images = await Promise.all(imagePromises);

    res.json({
      success: true,
      images: images,
      total: images.length,
      directory: "uploads/qr-codes/",
      bucket: process.env.AWS_BUCKET_NAME,
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ success: false, error: "Failed to fetch images" });
  }
}

module.exports = {
  getUserDataByPage,
  resetQRPassword,
  generateQRCodesByCount,
  downloadAllQRCodes,
};
