// Import account controller.
// This handles patron account deactivation.
const accountController = require("../../Controllers/accountController");

// Import account model.
// We mock it so the test does not change the real database.
const accountModel = require("../../Models/accountModel");

jest.mock("../Models/accountModel");

// Fake Express response object.
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Account Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deactivateMyAccount should deactivate logged-in patron account", async () => {
    // req.user.sub is the logged-in user's ID from JWT.
    // req.user.role confirms the user is a patron.
    const req = {
      user: {
        sub: 3,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Simulate successful soft deactivation.
    // The real model should set is_active = 0 and deactivated_at = current date.
    accountModel.deactivateAccount.mockResolvedValue({
      user_id: 3,
      is_active: false
    });

    await accountController.deactivateMyAccount(req, res);

    // Controller should deactivate the logged-in user's account only.
    expect(accountModel.deactivateAccount).toHaveBeenCalledWith(3);

    // Successful deactivation should return HTTP 200.
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("deactivateMyAccount should handle account not found", async () => {
    const req = {
      user: {
        sub: 999,
        role: "patron"
      }
    };

    const res = mockResponse();

    // Simulate no user found or no account updated.
    accountModel.deactivateAccount.mockResolvedValue(null);

    await accountController.deactivateMyAccount(req, res);

    expect(accountModel.deactivateAccount).toHaveBeenCalledWith(999);

    // If no account is found, controller should return 404.
    expect(res.status).toHaveBeenCalledWith(404);
  });
});