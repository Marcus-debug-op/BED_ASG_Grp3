/*
  BED-142's ticket assumes a real email-sending module (Nodemailer + a real
  SMTP account), but that means depending on an external service just to
  demo/test password reset - either a real Gmail account, or a third-party
  throwaway inbox like Ethereal.

  This version keeps the feature fully self-contained inside our own
  backend instead: rather than actually sending anything out over the
  network, it prints the reset link straight to this server's own
  terminal/console. Nothing leaves the machine, nothing depends on any
  external account or service being reachable.

  To grab the link during testing/demo: watch the terminal where
  `node app.js` is running right after calling POST /api/auth/forgot-password
  - the link will be printed there immediately.

  If a real inbox delivery is ever wanted later, only this one file needs
  to change - passwordResetController.js just calls sendPasswordResetEmail()
  and doesn't care how the link actually gets to the user.
*/

async function sendPasswordResetEmail(toEmail, resetUrl) {
  console.log("");
  console.log("========================================");
  console.log("  PASSWORD RESET LINK (dev/demo mode)");
  console.log("========================================");
  console.log(`  To:    ${toEmail}`);
  console.log(`  Link:  ${resetUrl}`);
  console.log("========================================");
  console.log("");

  // Kept as an async function (and returning a resolved value) so the
  // calling code in passwordResetController.js - which does
  // `await emailService.sendPasswordResetEmail(...)` - doesn't need any
  // changes if a real email transport gets swapped in later.
  return { delivered: false, loggedToConsole: true };
}

module.exports = { sendPasswordResetEmail };
