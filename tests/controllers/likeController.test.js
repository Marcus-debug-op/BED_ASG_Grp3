const likeController = require("../../Controllers/likeController");
const menuItemLikeModel = require("../../Models/menuItemLikeModel");

/*
  Unit tests for the Menu Item Likes controller (BED-26).
 
  Main purpose:
  - Check that a logged-in user can like a menu item.
  - Check that liking the same item twice is treated as a friendly no-op,
    not an error (SQL primary key violation).
  - Check that liking a menu item that doesn't exist is rejected (SQL
    foreign key violation).
  - Check that a user can unlike a previously-liked item.
  - Check that the like count can be fetched publicly, without auth.
  - Check that unexpected database failures are caught and turned into a
    clean 500 response instead of crashing the server.

  This tests:
  likeController.likeItem
  likeController.unlikeItem
  likeController.getLikeCount
*/

// Models/feedbackModel is mocked so these tests never touch SQL Server - they only verify the controller's own logic
jest.mock("../Models/menuItemLikeModel");

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

describe("likeController.likeItem (BED-26)", () => {
    /*
    Test case 1:
    A registered patron liking a menu item for the first time should succeed.
 
    Expected result:
    - Model should be called with the user's ID and the menu item ID.
    - HTTP status should be 201 Created.
    - Response body should include the updated like count.
  */
  test("returns 201 with the updated like count on success", async () => {
    menuItemLikeModel.likeItem.mockResolvedValue({ menu_item_id: 10, likes: 6 });

    const req = { user: { sub: 42 }, params: { id: "10" } };
    const res = mockResponse();

    await likeController.likeItem(req, res);

    expect(menuItemLikeModel.likeItem).toHaveBeenCalledWith(42, 10);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ menu_item_id: 10, likes: 6 })
    );
  });
    /*
    Test case 2:
    Liking an item the user has already liked should NOT be treated as
    an error.
 
    Why this matters:
    - SQL Server rejects the duplicate (user_id, menu_item_id) pair with
      a primary key violation (error.number 2627).
    - From the user's point of view, "you already liked this" isn't a
      failure, so the controller should catch this specific error and
      respond with 200 instead of bubbling up a 500.
 
    Expected result:
    - HTTP status should be 200 OK.
    - Response body should include the message "Already liked."
  */
  test("returns 200 'Already liked' instead of an error on a duplicate like (SQL 2627)", async () => {
    const dupError = new Error("PK violation");
    dupError.number = 2627;
    menuItemLikeModel.likeItem.mockRejectedValue(dupError);

    const req = { user: { sub: 42 }, params: { id: "10" } };
    const res = mockResponse();

    await likeController.likeItem(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Already liked." })
    );
  });
  /*
    Test case 3:
    Liking a menu item that doesn't exist should be rejected.
 
    Why this matters:
    - SQL Server raises a foreign key violation (error.number 547) when
      the menu_item_id doesn't match any row in the MenuItems table.
 
    Expected result:
    - HTTP status should be 404 Not Found.
  */
  test("returns 404 when the menu item doesn't exist (SQL FK violation, 547)", async () => {
    const fkError = new Error("FK violation");
    fkError.number = 547;
    menuItemLikeModel.likeItem.mockRejectedValue(fkError);

    const req = { user: { sub: 42 }, params: { id: "9999" } };
    const res = mockResponse();

    await likeController.likeItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
    /*
    Test case 4:
    Liking an item should handle unexpected database failures gracefully.
 
    Expected result:
    - Model rejects with a generic (non-2627, non-547) DB error.
    - Controller should fall back to a 500 response, not crash.
  */
  test("returns 500 on an unexpected database error", async () => {
    menuItemLikeModel.likeItem.mockRejectedValue(new Error("connection lost"));

    const req = { user: { sub: 42 }, params: { id: "10" } };
    const res = mockResponse();

    await likeController.likeItem(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("likeController.unlikeItem (BED-26)", () => {
    /*
    Test case 5:
    A logged-in user removing an existing like should succeed.
 
    Expected result:
    - Model should be called with the user's ID and the menu item ID.
    - HTTP status should be 200 OK.
    - Response body should include the updated like count.
  */
  test("returns 200 with the updated like count on success", async () => {
    menuItemLikeModel.unlikeItem.mockResolvedValue({ menu_item_id: 10, likes: 5 });

    const req = { user: { sub: 42 }, params: { id: "10" } };
    const res = mockResponse();

    await likeController.unlikeItem(req, res);

    expect(menuItemLikeModel.unlikeItem).toHaveBeenCalledWith(42, 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ menu_item_id: 10, likes: 5 })
    );
  });
    /*
    Test case 6:
    Unliking an item that was never liked (nothing to remove) should 404.
 
    Expected result:
    - Model returns null (no existing like found).
    - HTTP status should be 404 Not Found.
  */
  test("returns 404 when there was no existing like to remove", async () => {
    menuItemLikeModel.unlikeItem.mockResolvedValue(null);

    const req = { user: { sub: 42 }, params: { id: "10" } };
    const res = mockResponse();

    await likeController.unlikeItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
    /*
    Test case 7:
    Unliking an item should handle unexpected database failures gracefully.
 
    Expected result:
    - Model rejects with a generic DB error.
    - Controller should catch it and return 500, not crash.
  */
  test("returns 500 on an unexpected database error", async () => {
    menuItemLikeModel.unlikeItem.mockRejectedValue(new Error("connection lost"));

    const req = { user: { sub: 42 }, params: { id: "10" } };
    const res = mockResponse();

    await likeController.unlikeItem(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("likeController.getLikeCount (BED-26)", () => {
    /*
    Test case 8:
    Fetching the like count for a menu item should work without
    authentication (this is a public endpoint).
 
    Expected result:
    - req has no user/token attached, and the call still succeeds.
    - HTTP status should be 200 OK.
    - Response body should include the menu item ID and like count.
  */
  test("returns 200 with the like count (public, no auth required)", async () => {
    menuItemLikeModel.getLikeCount.mockResolvedValue({ menu_item_id: 10, likes: 6 });

    const req = { params: { id: "10" } };
    const res = mockResponse();

    await likeController.getLikeCount(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ menu_item_id: 10, likes: 6 })
    );
  });
    /*
    Test case 9:
    Fetching the like count for a menu item that doesn't exist should 404.
 
    Expected result:
    - Model returns null (no matching menu item).
    - HTTP status should be 404 Not Found.
  */
  test("returns 404 when the menu item doesn't exist", async () => {
    menuItemLikeModel.getLikeCount.mockResolvedValue(null);

    const req = { params: { id: "9999" } };
    const res = mockResponse();

    await likeController.getLikeCount(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
    /*
    Test case 10:
    Fetching the like count should handle unexpected database failures
    gracefully.
 
    Expected result:
    - Model rejects with a generic DB error.
    - Controller should catch it and return 500, not crash.
  */

  test("returns 500 on an unexpected database error", async () => {
    menuItemLikeModel.getLikeCount.mockRejectedValue(new Error("connection lost"));

    const req = { params: { id: "10" } };
    const res = mockResponse();

    await likeController.getLikeCount(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
