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

module.exports = { generate6DigitPassword, convertPassword, verifyPwd };
