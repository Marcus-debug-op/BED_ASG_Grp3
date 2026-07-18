const stallController = require("../Controllers/stallController");
const stallModel = require("../Models/stallModel");

/*
  This file unit-tests the Stall Listing / Menu Display / Reviews Summary
  controller (BED-61, BED-62, BED-85).
 
  Main purpose:
  - Check that stalls can be listed, with and without search/cuisine filters.
  - Check that a stall's menu can be fetched by ID.
  - Check that a stall's review summary can be fetched by ID.
  - Check that invalid input (non-numeric IDs) and "not found" cases are
    rejected with the right status codes.
  - Check that unexpected database failures are caught and turned into a
    clean 500 response instead of crashing the server.
 
  This tests:
  stallController.getStalls
  stallController.getStallMenu
  stallController.getStallReviewsSummary
*/

// Replace the real model with a Jest mock. Every exported function on
// stallModel automatically becomes a jest.fn() we can control per test.
jest.mock("../Models/stallModel");

// A fresh mock response object for each test - status() is chainable (like
// Express's real res.status()) so `res.status(200).json(...)` works, and
// both status and json are jest.fn()s we can assert against.
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
/*
  afterEach runs after every test in this file.
 
  Purpose:
  - Clear all mock call history and mocked return values between tests.
  - Without this, a mockResolvedValue/mockRejectedValue set in one test
    could leak into the next test and cause confusing failures.
*/
afterEach(() => {
  jest.clearAllMocks();
});

describe("stallController.getStalls (BED-61)", () => {
    /*
    Test case 1:
    Fetching the stall list with no filters should succeed.
 
    Expected result:
    - Model is called and returns a list of stalls.
    - HTTP status should be 200 OK.
    - Response body should be exactly the list returned by the model.
  */
  test("returns 200 with the stall list on success", async () => {
    const mockStalls = [
      { stall_id: 1, stall_name: "Ah Huat Chicken Rice", cuisine_type: "Chinese" },
      { stall_id: 2, stall_name: "Golden Wok Hokkien Mee", cuisine_type: "Chinese" }
    ];
    stallModel.getAllStalls.mockResolvedValue(mockStalls);

    const req = { query: {} };
    const res = mockResponse();

    await stallController.getStalls(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockStalls);
  });
    /*
    Test case 2:
    Search and cuisine query params should be forwarded to the model.
 
    Expected result:
    - The controller should not silently drop query params.
    - The model should be called with an object containing the same
      search and cuisine values that came in on req.query.
  */
  test("passes search and cuisine query params through to the model as filters", async () => {
    stallModel.getAllStalls.mockResolvedValue([]);

    const req = { query: { search: "laksa", cuisine: "Chinese Cuisine" } };
    const res = mockResponse();

    await stallController.getStalls(req, res);

    expect(stallModel.getAllStalls).toHaveBeenCalledWith(
      expect.objectContaining({ search: "laksa", cuisine: "Chinese Cuisine" })
    );
  });
    /*
    Test case 3:
    Stall list should handle unexpected database failures gracefully.
 
    Expected result:
    - Model rejects with a generic DB error.
    - Controller should catch it and return 500, not crash.
    - Response body should include a message field explaining the failure.
  */
  test("returns 500 when the model throws", async () => {
    stallModel.getAllStalls.mockRejectedValue(new Error("DB connection lost"));

    const req = { query: {} };
    const res = mockResponse();

    await stallController.getStalls(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});

describe("stallController.getStallMenu (BED-62)", () => {
    /*
    Test case 4:
    Fetching a stall's menu with a valid numeric stall ID should succeed.
 
    Expected result:
    - Model should be called with the stall ID converted to a number.
    - HTTP status should be 200 OK.
    - Response body should be exactly the menu object returned by the model.
  */
  test("returns 200 with the stall's menu on success", async () => {
    const mockMenu = {
      stall: { stall_id: 5, stall_name: "Golden Wok Hokkien Mee" },
      menu_items: [{ menu_item_id: 10, item_name: "Hokkien Mee", price: 5.5 }]
    };
    stallModel.getMenuByStallId.mockResolvedValue(mockMenu);

    const req = { params: { stallId: "5" } };
    const res = mockResponse();

    await stallController.getStallMenu(req, res);

    expect(stallModel.getMenuByStallId).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockMenu);
  });
    /*
    Test case 5:
    A non-numeric stall ID should be rejected before touching the model.
 
    Expected result:
    - Model should never be called with bad input.
    - HTTP status should be 400 Bad Request.
  */
  test("returns 400 for a non-numeric stall ID without calling the model", async () => {
    const req = { params: { stallId: "not-a-number" } };
    const res = mockResponse();

    await stallController.getStallMenu(req, res);

    expect(stallModel.getMenuByStallId).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
    /*
    Test case 6:
    Requesting the menu for a stall that doesn't exist should 404.
 
    Expected result:
    - Model returns null (no matching stall).
    - HTTP status should be 404 Not Found.
  */
  test("returns 404 when the model finds no matching stall", async () => {
    stallModel.getMenuByStallId.mockResolvedValue(null);

    const req = { params: { stallId: "999" } };
    const res = mockResponse();

    await stallController.getStallMenu(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
    /*
    Test case 7:
    Fetching the menu should handle unexpected database failures gracefully.
 
    Expected result:
    - Model rejects with a generic DB error.
    - Controller should catch it and return 500, not crash.
  */
  test("returns 500 when the model throws", async () => {
    stallModel.getMenuByStallId.mockRejectedValue(new Error("DB error"));

    const req = { params: { stallId: "5" } };
    const res = mockResponse();

    await stallController.getStallMenu(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("stallController.getStallReviewsSummary (BED-85)", () => {
    /*
    Test case 8:
    Fetching a stall's review summary with a valid stall ID should succeed.
 
    Expected result:
    - HTTP status should be 200 OK.
    - Response body should be exactly the summary object from the model,
      including average rating, total review count, and recent reviews.
  */
  test("returns 200 with the aggregated summary on success", async () => {
    const mockSummary = { avg_rating: 4.5, total_reviews: 2, recent_reviews: [] };
    stallModel.getStallReviewsSummary.mockResolvedValue(mockSummary);

    const req = { params: { stallId: "5" } };
    const res = mockResponse();

    await stallController.getStallReviewsSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockSummary);
  });
    /*
    Test case 9:
    A stall with no reviews yet should return a valid empty-state summary,
    not an error.
 
    Expected result:
    - HTTP status should still be 200 OK.
    - avg_rating should be null and total_reviews should be 0, rather than
      the endpoint failing or returning undefined fields.
  */
  test("returns the empty-state shape when a stall has no reviews yet", async () => {
    const emptyState = { avg_rating: null, total_reviews: 0, recent_reviews: [] };
    stallModel.getStallReviewsSummary.mockResolvedValue(emptyState);

    const req = { params: { stallId: "5" } };
    const res = mockResponse();

    await stallController.getStallReviewsSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(emptyState);
  });
    /*
    Test case 10:
    A non-numeric stall ID should be rejected before touching the model.
 
    Expected result:
    - Model should never be called with bad input.
    - HTTP status should be 400 Bad Request.
  */
  test("returns 400 for a non-numeric stall ID", async () => {
    const req = { params: { stallId: "abc" } };
    const res = mockResponse();

    await stallController.getStallReviewsSummary(req, res);

    expect(stallModel.getStallReviewsSummary).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
    /*
    Test case 11:
    Requesting a review summary for a stall that doesn't exist should 404.
 
    Expected result:
    - Model returns null (no matching stall).
    - HTTP status should be 404 Not Found.
  */
  test("returns 404 when the stall does not exist", async () => {
    stallModel.getStallReviewsSummary.mockResolvedValue(null);

    const req = { params: { stallId: "999" } };
    const res = mockResponse();

    await stallController.getStallReviewsSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
