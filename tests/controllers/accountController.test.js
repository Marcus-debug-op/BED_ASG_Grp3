// Import the account controller.
// This controller contains the account deactivation logic.
const accountController = require("../../Controllers/accountController");

// Import the account model.
// The model normally talks to SQL Server, but in this test we mock it.
const accountModel = require("../../Models/accountModel");

// Mock the account model so the test does not touch the real database.
// This lets us control what the model returns.
jest.mock("../../Models/accountModel");

// Create a fake Express response object.
// In real Express, res.status() and res.json() are provided automatically.
// In unit testing, we fake them using jest.fn().
function mockResponse() {
  const res = {};

  // mockReturnValue(res) allows chaining like:
  // res.status(200).json(...)
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
}

describe("Account Controller", () => {
  // Clear all mock data before each test.
  // This prevents one test's mock calls from affecting another test.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deactivateOwnAccount should soft deactivate logged-in patron account", async () => {
    // Fake request object.
    // req.user.sub comes from the JWT token after authentication.
    // This means the backend deactivates the logged-in user,
    // not a user ID sent from the frontend.
    const req = {
      user: {
        sub: 3,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Fake user returned by the model after soft deactivation.
    // In the real database, the model updates:
    // is_active = 0
    // deactivated_at = current date/time
    const mockDeactivatedUser = {
      user_id: 3,
      full_name: "Test Patron",
      email: "patron@test.com",
      role: "patron",
      is_active: false,
      deactivated_at: "2026-07-30T12:00:00.000Z"
    };

    // Simulate the model successfully deactivating the account.
    accountModel.deactivateOwnAccount.mockResolvedValue(mockDeactivatedUser);

    // Call the controller function directly.
    await accountController.deactivateOwnAccount(req, res);

    // Check that the controller passed the logged-in user's ID to the model.
    // This confirms that the controller uses req.user.sub.
    expect(accountModel.deactivateOwnAccount).toHaveBeenCalledWith(3);

    // Check that successful deactivation returns HTTP 200.
    expect(res.status).toHaveBeenCalledWith(200);

    // Check that the controller returns the success message and updated user.
    expect(res.json).toHaveBeenCalledWith({
      message: "Account deactivated successfully.",
      user: mockDeactivatedUser
    });
  });

  test("deactivateOwnAccount should return 404 when account is not found or already deactivated", async () => {
    // Fake request for a user that either does not exist
    // or already has is_active = 0.
    const req = {
      user: {
        sub: 999,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Simulate the model returning null.
    // This means no active account was updated.
    accountModel.deactivateOwnAccount.mockResolvedValue(null);

    await accountController.deactivateOwnAccount(req, res);

    // Controller should still try to deactivate the logged-in user ID.
    expect(accountModel.deactivateOwnAccount).toHaveBeenCalledWith(999);

    // If no account was updated, return 404.
    expect(res.status).toHaveBeenCalledWith(404);

    // Check the 404 response message.
    expect(res.json).toHaveBeenCalledWith({
      message: "Account not found or already deactivated."
    });
  });

  test("deactivateOwnAccount should return 500 when the model throws an error", async () => {
    // Fake request for a logged-in patron.
    const req = {
      user: {
        sub: 3,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Simulate a database/model error.
    accountModel.deactivateOwnAccount.mockRejectedValue(
      new Error("Database error")
    );

    await accountController.deactivateOwnAccount(req, res);

    // Controller should call the model using the logged-in user's ID.
    expect(accountModel.deactivateOwnAccount).toHaveBeenCalledWith(3);

    // Server/database errors should return HTTP 500.
    expect(res.status).toHaveBeenCalledWith(500);

    // Check the error response message.
    expect(res.json).toHaveBeenCalledWith({
      message: "Unable to deactivate account."
    });
  });
});