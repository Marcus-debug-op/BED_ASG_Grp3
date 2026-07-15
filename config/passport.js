require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const registerModel = require("../Models/registerModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI
    },
    // Passport's "verify" callback - runs once Google has authenticated the user and
    // handed back their profile. This is where we sync the Google identity with our
    // own Users table and hand Passport back *our* database user (not the Google one).
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        const firstName = profile.name?.givenName || "";
        const lastName = profile.name?.familyName || "";
        const googleId = profile.id;

        if (!email) {
          return done(null, false, { reason: "google_auth_no_email" });
        }

        let user = await registerModel.findUserByEmail(email);

        if (user) {
          // Existing account under a different role - Google sign-in on the patron
          // page should only ever authenticate patrons.
          if (user.role !== "patron") {
            return done(null, false, { reason: "google_auth_wrong_role" });
          }

          return done(null, user);
        }

        // First time we've seen this email - auto-register a new patron account.
        // password_hash is NOT NULL on Users, but this user will only ever sign in
        // via Google, so we fill it with an unguessable, unusable random value.
        const unusablePassword = crypto.randomBytes(32).toString("hex");
        const password_hash = await bcrypt.hash(unusablePassword, 10);
        const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0];

        await registerModel.createPatron({
          full_name: fullName,
          email,
          password_hash,
          phone_number: null
        });

        user = await registerModel.findUserByEmail(email);
        user.google_id = googleId; // carried through on the object; not persisted (no column for it yet)

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

module.exports = passport;
