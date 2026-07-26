const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

const historyList = document.getElementById("history-list");
const historyMessage = document.getElementById("history-message");
const historyDate = document.getElementById("history-date");
const clearFilterBtn = document.getElementById("clear-filter-btn");

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

function renderHistory(orders) {
  if (!historyList) return;

  if (!Array.isArray(orders) || orders.length === 0) {
    historyList.innerHTML = `
      <p class="empty-message">No past orders found.</p>
    `;
    return;
  }

  historyList.innerHTML = orders.map((order) => {
    return `
      <article class="order-card">
        <div class="order-card-header">
          <h3>Order #${order.order_id}</h3>
          <span class="order-status">${order.order_status || order.status || "-"}</span>
        </div>

        <p><strong>Customer:</strong> ${order.customer_name || order.full_name || "Customer"}</p>
        <p><strong>Date:</strong> ${formatDateTime(order.order_date || order.created_at)}</p>
        <p><strong>Total:</strong> ${formatCurrency(order.total_amount)}</p>

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
    const selectedDate = historyDate?.value;
    let url = "/api/orders/vendor/my-orders?status=Completed";

    if (selectedDate) {
      url += `&date=${selectedDate}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load order history.");
    }

    renderHistory(data);
    showMessage("Order history loaded.", "success");
  } catch (error) {
    console.error("Order history error:", error);
    showMessage(error.message, "error");
  }
}

function viewOrderDetails(orderId) {
  window.location.href = `/vendor/VendorOrderDetails.html?orderId=${orderId}`;
}

historyDate?.addEventListener("change", loadOrderHistory);

clearFilterBtn?.addEventListener("click", () => {
  if (historyDate) historyDate.value = "";
  loadOrderHistory();
});

loadOrderHistory();