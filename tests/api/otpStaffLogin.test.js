const request = require("supertest");
const bcrypt = require("bcrypt");

/*
  This file tests the Two-Factor (OTP) Staff Login with Badge ID Verification
  feature for NEA officers and hawker centre operators.

  Main purpose:
  - Check that a correct password does NOT log a staff member in on its own -
    it only returns a short-lived pendingToken plus an OTP.
  - Check that the badge ID is verified against the account record, so a
    correct password with the wrong badge is still rejected.
  - Check that the pendingToken cannot be used to reach a protected route,
    which is what stops the second factor from being decorative.
  - Check that a correct OTP exchanges the pendingToken for a real login token.
  - Check that an OTP is single-use and cannot be replayed.
  - Check that a normal login token cannot be passed to /verify-otp.

  This tests:
  POST /api/auth/login/officer
  POST /api/auth/login/operator
  POST /api/auth/verify-otp

  IMPORTANT - this file does NOT touch the database.
  registerModel is mocked with jest.mock() below, so no rows are ever read or
  written. The OTP store and JWT helpers are real, because they are pure
  in-memory logic and are the actual behaviour being tested. This means the
  file can be run repeatedly without leaving any test data behind.
*/

// Mock the model BEFORE requiring app, so the controller picks up the mock.
jest.mock("../../Models/registerModel");

const registerModel = require("../../Models/registerModel");
const app = require("../../app");
const { generateUserToken } = require("../../Utils/token");

const OFFICER_PASSWORD = "Password123!";
const OFFICER_BADGE = "NEA-0042";
const OPERATOR_BADGE = "OPS-001";

let officerRecord;
let operatorRecord;

beforeAll(async () => {
  // A realistic bcrypt hash so the controller's bcrypt.compare runs for real.
  const passwordHash = await bcrypt.hash(OFFICER_PASSWORD, 10);

  officerRecord = {
    user_id: 9001,
    full_name: "Test Officer",
    email: "test.officer@hawkerhub.example.com",
    password_hash: passwordHash,
    role: "officer",
    phone_number: "91110000",
    is_active: true,
    badge_id: OFFICER_BADGE
  };

  operatorRecord = {
    user_id: 9002,
    full_name: "Test Operator",
    email: "test.operator@hawkerhub.example.com",
    password_hash: passwordHash,
    role: "operator",
    phone_number: "91110001",
    is_active: true,
    badge_id: OPERATOR_BADGE
  };
});

beforeEach(() => {
  registerModel.findUserAuthByEmail.mockImplementation(async (email) => {
    if (email === officerRecord.email) return officerRecord;
    if (email === operatorRecord.email) return operatorRecord;
    return undefined;
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

/*
  Helper: completes step 1 of login and returns the response body, which
  contains the pendingToken and (in non-production) the generated OTP.
*/
async function startOfficerLogin(overrides = {}) {
  const response = await request(app)
    .post("/api/auth/login/officer")
    .send({
      email: officerRecord.email,
      password: OFFICER_PASSWORD,
      badgeId: OFFICER_BADGE,
      ...overrides
    });

  return response;
}

describe("Two-Factor (OTP) Staff Login API Tests", () => {

  /*
    Test case 1:
    A correct email, password and badge ID should NOT return a login token.
    It should return mfaRequired and a pendingToken instead, because the
    OTP step has not happened yet.
  */
  test("should not issue a login token on password step alone", async () => {
    const response = await startOfficerLogin();

    expect(response.statusCode).toBe(200);
    expect(response.body.mfaRequired).toBe(true);
    expect(response.body.pendingToken).toBeDefined();
    expect(response.body.token).toBeUndefined();
  });

  /*
    Test case 2:
    The badge ID is checked against the account record, not just required as
    a field. A correct password with the wrong badge must still be rejected.
  */
  test("should reject a correct password with the wrong badge ID", async () => {
    const response = await startOfficerLogin({ badgeId: "NEA-9999" });

    expect(response.statusCode).toBe(401);
    expect(response.body.pendingToken).toBeUndefined();
    expect(response.body.token).toBeUndefined();
  });

  /*
    Test case 3:
    A missing badge ID should be rejected as a bad request, before any OTP
    is generated.
  */
  test("should reject an officer login with no badge ID", async () => {
    const response = await startOfficerLogin({ badgeId: undefined });

    expect(response.statusCode).toBe(400);
    expect(response.body.pendingToken).toBeUndefined();
  });

  /*
    Test case 4:
    A wrong password must be rejected even when the badge ID is correct.
  */
  test("should reject a wrong password even with a correct badge ID", async () => {
    const response = await startOfficerLogin({ password: "WrongPassword123!" });

    expect(response.statusCode).toBe(401);
    expect(response.body.pendingToken).toBeUndefined();
  });

  /*
    Test case 5:
    This is the most important test in this file.

    The pendingToken is a valid, correctly signed JWT - jwt.verify() accepts
    it. If the authentication middleware did not explicitly reject tokens
    carrying the mfaPending flag, a staff member could take this token
    straight from the step 1 response and skip the OTP entirely, making the
    whole second factor decorative.

    Expected result:
    - A protected route rejects the pendingToken with 401.
  */
  test("should reject the pendingToken on a protected route", async () => {
    const login = await startOfficerLogin();

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.pendingToken}`);

    expect(response.statusCode).toBe(401);
  });

  /*
    Test case 6:
    Submitting the correct OTP together with the pendingToken should
    complete the login and return a real token.
  */
  test("should issue a real login token after a correct OTP", async () => {
    const login = await startOfficerLogin();

    const response = await request(app)
      .post("/api/auth/verify-otp")
      .send({ pendingToken: login.body.pendingToken, otp: login.body.devOtp });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe("officer");
  });

  /*
    Test case 7:
    The real token returned after OTP verification must actually work on a
    protected route - confirming the two-step flow produces a usable session.
  */
  test("should allow the token issued after OTP onto a protected route", async () => {
    const login = await startOfficerLogin();

    const verified = await request(app)
      .post("/api/auth/verify-otp")
      .send({ pendingToken: login.body.pendingToken, otp: login.body.devOtp });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${verified.body.token}`);

    expect(response.statusCode).toBe(200);
  });

  /*
    Test case 8:
    An incorrect OTP should be rejected and must not return a token.
  */
  test("should reject an incorrect OTP", async () => {
    const login = await startOfficerLogin();

    const response = await request(app)
      .post("/api/auth/verify-otp")
      .send({ pendingToken: login.body.pendingToken, otp: "000000" });

    expect(response.statusCode).toBe(401);
    expect(response.body.token).toBeUndefined();
  });

  /*
    Test case 9:
    An OTP is single-use. Once it has been verified successfully it is
    deleted from the store, so replaying the same code must fail.
  */
  test("should reject an OTP that has already been used", async () => {
    const login = await startOfficerLogin();

    const first = await request(app)
      .post("/api/auth/verify-otp")
      .send({ pendingToken: login.body.pendingToken, otp: login.body.devOtp });

    expect(first.statusCode).toBe(200);

    const second = await request(app)
      .post("/api/auth/verify-otp")
      .send({ pendingToken: login.body.pendingToken, otp: login.body.devOtp });

    expect(second.statusCode).toBe(401);
    expect(second.body.token).toBeUndefined();
  });

  /*
    Test case 10:
    The mirror image of test case 5. A normal login token must not be
    accepted at /verify-otp, so the two token types can never be used in
    place of one another.
  */
  test("should reject a normal login token at the verify-otp step", async () => {
    const realToken = generateUserToken(officerRecord);

    const response = await request(app)
      .post("/api/auth/verify-otp")
      .send({ pendingToken: realToken, otp: "123456" });

    expect(response.statusCode).toBe(400);
    expect(response.body.token).toBeUndefined();
  });

  /*
    Test case 11:
    Both staff roles require the second factor, not just officers.
  */
  test("should require an OTP for operator login too", async () => {
    const response = await request(app)
      .post("/api/auth/login/operator")
      .send({
        email: operatorRecord.email,
        password: OFFICER_PASSWORD,
        badgeId: OPERATOR_BADGE
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.mfaRequired).toBe(true);
    expect(response.body.token).toBeUndefined();
  });

  /*
    Test case 12:
    An account signing in at the wrong portal must be rejected, so an
    operator cannot sign in through the officer route.
  */
  test("should reject an operator signing in through the officer route", async () => {
    const response = await request(app)
      .post("/api/auth/login/officer")
      .send({
        email: operatorRecord.email,
        password: OFFICER_PASSWORD,
        badgeId: OPERATOR_BADGE
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.pendingToken).toBeUndefined();
  });

  /*
    Test case 13:
    A deactivated staff account must be blocked before any OTP is generated.
  */
  test("should reject a deactivated staff account", async () => {
    registerModel.findUserAuthByEmail.mockResolvedValueOnce({
      ...officerRecord,
      is_active: false
    });

    const response = await startOfficerLogin();

    expect(response.statusCode).toBe(403);
    expect(response.body.pendingToken).toBeUndefined();
  });
});
