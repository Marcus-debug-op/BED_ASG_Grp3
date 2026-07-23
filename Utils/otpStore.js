// In-memory OTP store for officer/operator MFA login.
// Keyed by user_id. Resets on server restart - fine for demo purposes.
// (In a production system this would be a DB table instead, so OTPs
// survive restarts and can be audited.)

const otps = new Map(); // user_id -> { code, expiresAt }

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

function saveOtp(userId) {
  const code = generateOtp();
  otps.set(userId, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

// Verifies the OTP and consumes it (one-time use) if correct.
function verifyOtp(userId, code) {
  const entry = otps.get(userId);
  if (!entry) return { outcome: "not_found" };
  if (Date.now() > entry.expiresAt) {
    otps.delete(userId);
    return { outcome: "expired" };
  }
  if (entry.code !== code) return { outcome: "incorrect" };

  otps.delete(userId); // one-time use
  return { outcome: "verified" };
}

module.exports = { saveOtp, verifyOtp };
