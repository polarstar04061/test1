const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

function convertPassword(password) {
  return jwt.sign({ password }, JWT_SECRET);
}

function verifyPwd(password) {
  return jwt.verify(password, JWT_SECRET);
}

function generate6DigitPassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

// Build a lowercase concatenated search index from object values
function buildSearchIndex(data) {
  try {
    if (!data || typeof data !== "object") return "";
    const parts = [];
    for (const value of Object.values(data)) {
      if (value == null) continue;
      if (typeof value === "string") parts.push(value);
      else if (typeof value === "number") parts.push(String(value));
      else if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof v === "string" || typeof v === "number")
            parts.push(String(v));
        }
      }
    }
    return parts.join(" ").toLowerCase();
  } catch (_) {
    return "";
  }
}

const filterRecords = (records, searchText) => {
  if (!searchText) return records;

  const searchTerm = searchText.toLowerCase().trim();

  return records.filter((record) => {
    // Search in main record fields
    const mainFields = [
      record?.animal_name,
      record?.animal_species,
      record?.animal_breed,
      record?.animal_feature,
      record?.searchIndex, // Your existing search index
      record.qrId,
      record?.userId,
    ];

    // Search in profile fields (if profile exists)
    const profileFields = record.profile
      ? [
          record?.profile?.first_name,
          record?.profile?.last_name,
          record?.profile?.email,
          record?.profile?.phone,
          record?.profile?.city,
          record?.profile?.street,
          record?.profile?.searchIndex, // Profile search index
        ]
      : [];

    // Combine all searchable fields
    const allFields = [...mainFields, ...profileFields];

    // Check if any field contains the search term
    return allFields.some(
      (field) => field && String(field).toLowerCase().includes(searchTerm)
    );
  });
};

module.exports = {
  generate6DigitPassword,
  convertPassword,
  verifyPwd,
  generateVerificationCode,
  buildSearchIndex,
  filterRecords,
};
