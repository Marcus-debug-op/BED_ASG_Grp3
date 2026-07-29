// Import vendor order controller.
// This controller handles vendor order list, order details, and status update.
const orderController = require("../../Controllers/orderController");

// Import order model.
// The controller calls model functions, but we mock them for unit testing.
const orderModel = require("../../Models/orderModel");

// Mock the order model so the test does not use the real SQL database.
jest.mock("../Models/orderModel");

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

  test("getVendorOrders should return orders for logged-in vendor", async () => {
    // req.user.sub is the vendor user_id from JWT.
    const req = {
      user: { sub: 2 },
      query: {}
    };

    const res = mockResponse();

    // Fake data returned by the model.
    // This includes eco_friendly_packaging because you added that feature.
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

    // Simulate model returning vendor orders.
    orderModel.getOrdersForVendor.mockResolvedValue(mockOrders);

    await orderController.getVendorOrders(req, res);

    // Controller should pass vendor ID and query filters to the model.
    // This supports status/date filtering for vendor order history.
    expect(orderModel.getOrdersForVendor).toHaveBeenCalledWith(2, req.query);

    // Successful GET should return HTTP 200.
    expect(res.status).toHaveBeenCalledWith(200);

    // Response should be the vendor's orders.
    expect(res.json).toHaveBeenCalledWith(mockOrders);
  });

  test("getVendorOrderDetails should return details for vendor-owned order", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: 18 }
    };

    const res = mockResponse();

    // Fake item-level order details.
    // Your backend details endpoint returns an array because one order can have many items.
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

    // Controller should pass order ID and vendor ID.
    // This prevents a vendor from viewing another vendor's order.
    expect(orderModel.getOrderDetailsForVendor).toHaveBeenCalledWith("18", 2);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockDetails);
  });

  test("updateVendorOrderStatus should reject invalid status", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: 18 },
      body: {
        order_status: "InvalidStatus"
      }
    };

    const res = mockResponse();

    await orderController.updateVendorOrderStatus(req, res);

    // Invalid status should not call the model at all.
    expect(orderModel.updateOrderStatusForVendor).not.toHaveBeenCalled();

    // Controller should return 400 Bad Request.
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("updateVendorOrderStatus should update valid order status", async () => {
    const req = {
      user: { sub: 2 },
      params: { orderId: 18 },
      body: {
        order_status: "Completed"
      }
    };

    const res = mockResponse();

    // Simulate successful status update.
    orderModel.updateOrderStatusForVendor.mockResolvedValue({
      order_id: 18,
      order_status: "Completed"
    });

    await orderController.updateVendorOrderStatus(req, res);

    // Controller should pass orderId, vendorId, and new status to model.
    expect(orderModel.updateOrderStatusForVendor).toHaveBeenCalledWith(
      "18",
      2,
      "Completed"
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });
});