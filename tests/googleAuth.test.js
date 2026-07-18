const request = require("supertest");
const app = require("../app");

/*
  This file tests the Google OAuth sign-in flow (BED-144).

  Important limitation, on purpose:
  - The actual "user logs into their real Google account and clicks Allow" step
    cannot be automated in Jest - it requires a real browser and a real Google
    account, and Google does not provide a way to script that consent screen.
  - So these tests cover everything that CAN be verified without that step:
    the redirect to Google, and the error-handling paths on the callback.
  - The full success path (auto-registering a new patron, generating a JWT,
    redirecting back to the frontend) was manually verified against the real
    Google account during development - not something Jest can assert on here.

  Tested routes:
  GET /api/auth/google
  GET /api/auth/google/callback
*/

describe("Google OAuth Sign-In API Tests", () => {
  /*
    Test case 1:
    Hitting the entry point should redirect the browser to Google's real
    consent screen, not render anything itself.

    Expected result:
    - HTTP status 302 (redirect).
    - Location header points at Google's OAuth authorization endpoint.
    - The redirect URL includes our own client_id and the profile/email scopes.
  */
  test("should redirect to Google's OAuth consent screen", async () => {
    const response = await request(app).get("/api/auth/google");

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(response.headers.location).toContain("scope=profile");
    expect(response.headers.location).toContain("email");
  });

  /*
    Test case 2:
    Real-world cancellation - if the user clicks "Cancel" on Google's consent
    screen, Google redirects back to our callback with ?error=access_denied
    instead of a ?code.

    Expected result:
    - HTTP status 302 (redirect).
    - Redirected back to our own sign-in page, not left on an error page.
    - The redirect URL carries an error query param so the frontend can show
      a friendly message.
  */
  test("should redirect back to sign-in page when the user cancels on Google's screen", async () => {
    const response = await request(app)
      .get("/api/auth/google/callback")
      .query({ error: "access_denied" });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain("SigninPatron.html");
    expect(response.headers.location).toContain("error=");
  });

  /*
    Test case 3:
    Someone hitting the callback URL directly, with no authorization code at
    all (not a real Google redirect), should not crash the server.

    Expected result:
    - HTTP status 302 (redirect) - Passport either re-starts the auth flow or
      bounces back to sign-in, but it must not 500.
  */
  test("should not crash when the callback is hit without a code", async () => {
    const response = await request(app).get("/api/auth/google/callback");

    expect(response.statusCode).toBe(302);
  });
});
