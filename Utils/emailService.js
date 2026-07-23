require("dotenv").config();
const nodemailer = require("nodemailer");

let cachedTransporter = null;
let usingEtherealFallback = false;

/*
  Returns a ready-to-use Nodemailer transporter.

  - If EMAIL_USER/EMAIL_PASS are set in .env, sends real email through that
    account (e.g. a Gmail address with an "App Password").
  - If they're NOT set, automatically creates a free Ethereal test inbox
    instead of failing outright. Ethereal doesn't deliver to a real inbox -
    it just captures the email and gives back a preview URL you can open in
    a browser. This keeps the feature fully demoable without needing real
    SMTP credentials set up first.
*/
async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    return cachedTransporter;
  }

  usingEtherealFallback = true;
  const testAccount = await nodemailer.createTestAccount();

  console.warn(
    "[emailService] EMAIL_USER/EMAIL_PASS not set in .env - using a temporary Ethereal " +
    "test inbox instead of sending real email. Set EMAIL_USER/EMAIL_PASS to send for real."
  );

  cachedTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  return cachedTransporter;
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: '"HawkerHub" <no-reply@hawkerhub.local>',
    to: toEmail,
    subject: "Reset your HawkerHub password",
    html: `
      <p>We received a request to reset your HawkerHub password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `
  });

  if (usingEtherealFallback) {
    // Ethereal gives back a preview link instead of a real inbox delivery -
    // this is how you "see" the email during local dev/demo.
    console.log(`[emailService] Preview the reset email here: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
}

module.exports = { sendPasswordResetEmail };
