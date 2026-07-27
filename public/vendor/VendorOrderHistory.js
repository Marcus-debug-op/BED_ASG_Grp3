const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

const historyList = document.getElementById("history-list");
const historyMessage = document.getElementById("history-message");
const historyDate = document.getElementById("history-date");
const clearFilterBtn = document.getElementById("clear-filter-btn");

let allHistoryOrders = [];

// Role guard so only vendors can view vendor order history.
if (!token || role !== "vendor") {
  window.location.href = "/auth/SignInVendor.html";
}

function showMessage(message, type = "info") {
  if (!historyMessage) return;
  historyMessage.textContent = message;
  historyMessage.className = `status-message ${type}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-SG");
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getDateOnly(value) {
  if (!value) return "";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function renderHistory(orders) {
  if (!historyList) return;

  const selectedDate = historyDate?.value;

  let filteredOrders = Array.isArray(orders) ? orders : [];

  if (selectedDate) {
    filteredOrders = filteredOrders.filter((order) => {
      return getDateOnly(order.order_date || order.created_at) === selectedDate;
    });
  }

  if (filteredOrders.length === 0) {
    historyList.innerHTML = `
      <p class="empty-message">No completed orders found for this date.</p>
    `;
    return;
  }

  historyList.innerHTML = filteredOrders.map((order) => {
    return `
      <article class="order-card">
        <div class="order-card-header">
          <h3>Order #${order.order_id}</h3>
          <span class="order-status">${order.order_status || order.status || "-"}</span>
        </div>

        <p><strong>Customer:</strong> ${order.customer_name || order.full_name || "Customer"}</p>
        <p><strong>Date:</strong> ${formatDateTime(order.order_date || order.created_at)}</p>
        <p><strong>Total:</strong> ${formatCurrency(order.total_amount)}</p>

        <p><strong>Eco-Friendly Packaging:</strong> ${order.eco_friendly_packaging ? "Yes" : "No"}</p>

        <button 
          class="view-details-btn" 
          type="button"
          onclick="viewOrderDetails(${order.order_id})"
        >
          View Details
        </button>
      </article>
    `;
  }).join("");
}

async function loadOrderHistory() {
  try {
    const url = "/api/orders/vendor/my-orders?status=Completed";

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load order history.");
    }

    allHistoryOrders = data;
    renderHistory(allHistoryOrders);
    showMessage("Order history loaded.", "success");
  } catch (error) {
    console.error("Order history error:", error);
    showMessage(error.message, "error");
  }
}

function viewOrderDetails(orderId) {
  window.location.href = `/vendor/VendorOrderDetails.html?orderId=${orderId}`;
}

historyDate?.addEventListener("change", () => {
  renderHistory(allHistoryOrders);
});

clearFilterBtn?.addEventListener("click", () => {
  if (historyDate) historyDate.value = "";
  renderHistory(allHistoryOrders);
});

loadOrderHistory();