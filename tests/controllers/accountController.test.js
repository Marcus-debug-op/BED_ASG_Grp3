// This test file checks the account controller logic.
// It focuses on the patron account deactivation feature.

// Import the controller we want to test.
const accountController = require("../../Controllers/accountController");

// Import the model used by the controller.
// We will mock this model so the test does not touch the real SQL database.
const accountModel = require("../../Models/accountModel");

// Replace the real accountModel with a mocked version.
// This allows us to control what the model returns during each test.
jest.mock("../../Models/accountModel");

// Create a fake Express response object.
// In a real Express route, res.status() and res.json() are provided by Express.
// In unit testing, we create fake versions using jest.fn().
function mockResponse() {
  const res = {};

  // mockReturnValue(res) allows chaining like:
  // res.status(200).json(...)
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
}

describe("Account Controller", () => {
  beforeEach(() => {
    // Clear previous mock calls before every test.
    // This prevents one test result from affecting another.
    jest.clearAllMocks();
  });

  test("deactivateOwnAccount should deactivate the logged-in user's account", async () => {
    // Fake request object.
    // req.user.sub comes from the JWT token and represents the logged-in user's ID.
    const req = {
      user: {
        sub: 3,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Simulate the model successfully soft-deactivating the user.
    // In the real database, this means is_active becomes 0.
    accountModel.deactivateOwnAccount.mockResolvedValue({
      user_id: 3,
      full_name: "Marcus Patron",
      email: "marcusisapatron@gmail.com",
      role: "patron",
      is_active: false
    });

    // Call the actual controller function.
    await accountController.deactivateOwnAccount(req, res);

    // The controller should use the user ID from the JWT token,
    // not from the request body.
    expect(accountModel.deactivateOwnAccount).toHaveBeenCalledWith(3);

    // A successful deactivation should return HTTP 200.
    expect(res.status).toHaveBeenCalledWith(200);

    // The response should contain a success message and the deactivated user.
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Account deactivated successfully.",
        user: expect.objectContaining({
          user_id: 3,
          role: "patron"
        })
      })
    );
  });

  test("deactivateOwnAccount should return 404 when account is not found or already deactivated", async () => {
    const req = {
      user: {
        sub: 999,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Simulate the model finding no active account to deactivate.
    accountModel.deactivateOwnAccount.mockResolvedValue(null);

    await accountController.deactivateOwnAccount(req, res);

    // The controller should still pass the logged-in user ID to the model.
    expect(accountModel.deactivateOwnAccount).toHaveBeenCalledWith(999);

    // If nothing was updated, the controller should return 404.
    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Account not found or already deactivated."
      })
    );
  });

  test("deactivateOwnAccount should return 500 when model throws an error", async () => {
    const req = {
      user: {
        sub: 3,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Simulate database/model error.
    accountModel.deactivateOwnAccount.mockRejectedValue(
      new Error("Database error")
    );

    await accountController.deactivateOwnAccount(req, res);

    // Controller should handle the error and return HTTP 500.
    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Unable to deactivate account."
      })
    );
  });
});