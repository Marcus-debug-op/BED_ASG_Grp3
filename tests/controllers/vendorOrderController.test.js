// This test file checks the vendor order controller logic.
// It focuses on vendor order listing, order details, and order status update.

// Import the controller that handles order-related requests.
const orderController = require("../../Controllers/orderController");

// Import the model that the controller depends on.
// The model is mocked so these tests do not require SQL Server.
const orderModel = require("../../Models/orderModel");

// Mock the order model.
// This lets us test the controller without touching the real database.
jest.mock("../../Models/orderModel");

// Fake Express response object.
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Vendor Order Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getVendorOrders should return orders for the logged-in vendor", async () => {
    // req.user.sub represents the logged-in vendor's user_id from JWT.
    const req = {
      user: { sub: 2 }
    };

    const res = mockResponse();

    // Fake orders returned from the model.
    // eco_friendly_packaging is included because your feature displays it now.
    const mockOrders = [
      {
        order_id: 18,
        stall_name: "Lao Ban Soya Beancurd",
        patron_name: "Marcus Patron",
        order_status: "Completed",
        total_amount: 5.4,
        eco_friendly_packaging: true
      }
    ];

    // Simulate successful model response.
    orderModel.getOrdersForVendor.mockResolvedValue(mockOrders);

    await orderController.getVendorOrders(req, res);

    // Your current controller only passes vendorId to the model.
    // It does not pass req.query yet.
    expect(orderModel.getOrdersForVendor).toHaveBeenCalledWith(2);

    // Successful retrieval should return HTTP 200.
    expect(res.status).toHaveBeenCalledWith(200);

    // Controller should return the vendor orders.
    expect(res.json).toHaveBeenCalledWith(mockOrders);
  });

  test("getVendorOrderDetails should return item details for a vendor-owned order", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: "18" }
    };

    const res = mockResponse();

    // Your backend returns order details as an array because one order can have many items.
    const mockDetails = [
      {
        order_id: 18,
        stall_name: "Lao Ban Soya Beancurd",
        patron_name: "Marcus Patron",
        item_name: "Soya Beancurd",
        quantity: 2,
        subtotal: 5.4,
        eco_friendly_packaging: true
      }
    ];

    orderModel.getOrderDetailsForVendor.mockResolvedValue(mockDetails);

    await orderController.getVendorOrderDetails(req, res);

    // The controller converts req.params.orderId from string to Number.
    // So the expected value is 18, not "18".
    expect(orderModel.getOrderDetailsForVendor).toHaveBeenCalledWith(18, 2);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockDetails);
  });

  test("getVendorOrderDetails should return 400 for invalid order ID", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: "abc" }
    };

    const res = mockResponse();

    await orderController.getVendorOrderDetails(req, res);

    // Invalid order ID should stop before calling the model.
    expect(orderModel.getOrderDetailsForVendor).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid order ID."
      })
    );
  });

  test("getVendorOrderDetails should return 404 when order does not belong to vendor or does not exist", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: "999" }
    };

    const res = mockResponse();

    // Empty array means no matching order details were found.
    orderModel.getOrderDetailsForVendor.mockResolvedValue([]);

    await orderController.getVendorOrderDetails(req, res);

    expect(orderModel.getOrderDetailsForVendor).toHaveBeenCalledWith(999, 2);
    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Order not found."
      })
    );
  });

  test("updateVendorOrderStatus should reject invalid status", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: "18" },
      body: {
        order_status: "InvalidStatus"
      }
    };

    const res = mockResponse();

    await orderController.updateVendorOrderStatus(req, res);

    // Invalid status should not update the database.
    expect(orderModel.updateOrderStatusForVendor).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid order status."
      })
    );
  });

  test("updateVendorOrderStatus should update valid order status", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: "18" },
      body: {
        order_status: "Completed"
      }
    };

    const res = mockResponse();

    // Simulate successful update.
    orderModel.updateOrderStatusForVendor.mockResolvedValue({
      order_id: 18,
      order_status: "Completed"
    });

    await orderController.updateVendorOrderStatus(req, res);

    // Controller converts orderId to Number before passing it to the model.
    expect(orderModel.updateOrderStatusForVendor).toHaveBeenCalledWith(
      18,
      2,
      "Completed"
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Order status updated successfully.",
        order: expect.objectContaining({
          order_id: 18,
          order_status: "Completed"
        })
      })
    );
  });

  test("updateVendorOrderStatus should return 404 when vendor does not own the order", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: "888" },
      body: {
        order_status: "Completed"
      }
    };

    const res = mockResponse();

    // null means model found no order belonging to this vendor.
    orderModel.updateOrderStatusForVendor.mockResolvedValue(null);

    await orderController.updateVendorOrderStatus(req, res);

    expect(orderModel.updateOrderStatusForVendor).toHaveBeenCalledWith(
      888,
      2,
      "Completed"
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Order not found or you do not own this stall."
      })
    );
  });
});