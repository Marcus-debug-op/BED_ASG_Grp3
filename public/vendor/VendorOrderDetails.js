const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

const detailsMessage = document.getElementById("details-message");
const orderDetails = document.getElementById("order-details");

if (!token || role !== "vendor") {
  window.location.href = "/auth/SignInVendor.html";
}

const params = new URLSearchParams(window.location.search);
const orderIdFromUrl = params.get("orderId");

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-SG");
}

function showMessage(message, type = "info") {
  if (!detailsMessage) return;
  detailsMessage.textContent = message;
  detailsMessage.className = `status-message ${type}`;
}

function renderOrderDetails(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    orderDetails.innerHTML = `
      <p class="empty-message">No order details found.</p>
    `;
    return;
  }

  const firstRow = rows[0];

  const ecoPackaging = firstRow.eco_friendly_packaging ? "Yes" : "No";

  orderDetails.innerHTML = `
    <article class="order-card">
      <div class="order-card-header">
        <h3>Order #${firstRow.order_id}</h3>
        <span class="order-status">${firstRow.order_status || "-"}</span>
      </div>

      <p><strong>Customer:</strong> ${firstRow.patron_name || "Customer"}</p>
      <p><strong>Stall:</strong> ${firstRow.stall_name || "-"}</p>
      <p><strong>Date:</strong> ${formatDateTime(firstRow.order_date)}</p>
      <p><strong>Total:</strong> ${formatCurrency(firstRow.total_amount)}</p>
      <p><strong>Eco-Friendly Packaging:</strong> ${ecoPackaging}</p>

      <h3>Items Ordered</h3>

      ${rows.map(item => `
        <div class="order-item-row">
          <span>${item.item_name || "Item"}</span>
          <span>Qty: ${item.quantity || 1}</span>
          <span>${formatCurrency(item.subtotal || item.unit_price)}</span>
        </div>
      `).join("")}
    </article>
  `;
}

async function loadOrderDetails() {
  if (!orderIdFromUrl) {
    showMessage("Missing order ID.", "error");
    return;
  }

  try {
    const response = await fetch(`/api/orders/vendor/my-orders/${orderIdFromUrl}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    console.log("Order details response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Unable to load order details.");
    }

    renderOrderDetails(data);
    showMessage("Order details loaded.", "success");
  } catch (error) {
    console.error("Order details error:", error);
    showMessage(error.message, "error");
  }
}

loadOrderDetails();