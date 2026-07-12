const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

const ordersContainer = document.getElementById("ordersContainer");
const searchInput = document.getElementById("order-search");
const filterButtons = document.querySelectorAll(".filter-chip");

let allOrders = [];
let currentStatusFilter = "All";

/*
  First check if the user is logged in.
  Vendor order page should only be used by vendor accounts.
*/
if (!token) {
  ordersContainer.innerHTML = "<p>Please login to view orders.</p>";
} else if (role !== "vendor") {
  ordersContainer.innerHTML = "<p>Please login as a vendor to view orders.</p>";
} else {
  loadVendorOrders();
}

/*
  Get all orders that belong to the logged-in vendor.
  Backend uses the JWT token to know which vendor is logged in.
*/
async function loadVendorOrders() {
  try {
    const response = await fetch("/api/orders/vendor/my-orders", {
        method: "GET",
        cache: "no-store",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });


    const data = await response.json();

    if (!response.ok) {
      ordersContainer.innerHTML = `<p>${data.message || "Unable to load orders."}</p>`;
      return;
    }

    allOrders = data;
    renderOrders();

  } catch (error) {
    console.error("Load vendor orders error:", error);
    ordersContainer.innerHTML = "<p>Unable to connect to server.</p>";
  }
}

/*
  Display the orders on the page.
  Also applies search and status filter.
*/
function renderOrders() {
  const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";

  let filteredOrders = allOrders;

  if (currentStatusFilter !== "All") {
    filteredOrders = filteredOrders.filter(order => {
      return order.order_status === currentStatusFilter;
    });
  }

  if (searchText) {
    filteredOrders = filteredOrders.filter(order => {
      return (
        String(order.order_id).includes(searchText) ||
        String(order.patron_name || "").toLowerCase().includes(searchText) ||
        String(order.stall_name || "").toLowerCase().includes(searchText)
      );
    });
  }

  if (filteredOrders.length === 0) {
    ordersContainer.innerHTML = "<p>No orders found.</p>";
    return;
  }

ordersContainer.innerHTML = filteredOrders.map(order => {
  return `
    <div class="order-card">
      <div class="order-card-top">
        <div>
          <h3>Order #${order.order_id}</h3>
          <p class="order-date">${new Date(order.order_date).toLocaleString()}</p>
        </div>

        <span class="status-badge ${order.order_status.toLowerCase()}">
          ${order.order_status}
        </span>
      </div>

      <div class="order-info-grid">
        <div class="order-info">
          <span>Customer</span>
          <strong>${order.patron_name}</strong>
        </div>

        <div class="order-info">
          <span>Stall</span>
          <strong>${order.stall_name}</strong>
        </div>

        <div class="order-info">
          <span>Total</span>
          <strong>$${Number(order.total_amount).toFixed(2)}</strong>
        </div>
      </div>

      <div class="order-actions">
        <select id="status-${order.order_id}">
          <option value="Pending" ${order.order_status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Preparing" ${order.order_status === "Preparing" ? "selected" : ""}>Preparing</option>
          <option value="Ready" ${order.order_status === "Ready" ? "selected" : ""}>Ready</option>
          <option value="Completed" ${order.order_status === "Completed" ? "selected" : ""}>Completed</option>
          <option value="Cancelled" ${order.order_status === "Cancelled" ? "selected" : ""}>Cancelled</option>
        </select>

        <button type="button" class="update-btn" onclick="updateOrderStatus(${order.order_id})">
          Update Status
        </button>

        <button type="button" class="details-btn" onclick="viewOrderDetails(${order.order_id})">
          View Details
        </button>
      </div>

      <div id="details-${order.order_id}" class="order-details"></div>
    </div>
  `;
}).join("");

}

/*
  Update order status.
  Example:
  Pending -> Preparing
  Preparing -> Ready
  Ready -> Completed
*/
async function updateOrderStatus(orderId) {
  const newStatus = document.getElementById(`status-${orderId}`).value;

  try {
    const response = await fetch(`/api/orders/vendor/my-orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        order_status: newStatus
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to update order status.");
      return;
    }

    alert("Order status updated successfully.");
    loadVendorOrders();

  } catch (error) {
    console.error("Update order status error:", error);
    alert("Unable to connect to server.");
  }
}

/*
  View the items inside one order.
  This calls the backend order details route.
*/
async function viewOrderDetails(orderId) {
  const detailsBox = document.getElementById(`details-${orderId}`);

  if (detailsBox.innerHTML.trim() !== "") {
    detailsBox.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(`/api/orders/vendor/my-orders/${orderId}`, {
        method: "GET",
        cache: "no-store",
        headers: {
            Authorization: `Bearer ${token}`
        }

    });

    const data = await response.json();

    if (!response.ok) {
      detailsBox.innerHTML = `<p>${data.message || "Unable to load order details."}</p>`;
      return;
    }

    detailsBox.innerHTML = `
      <h4>Order Items</h4>
      ${data.map(item => `
        <div class="order-item-row">
          <span>${item.item_name}</span>
          <span>Qty: ${item.quantity}</span>
          <span>$${Number(item.subtotal).toFixed(2)}</span>
        </div>
      `).join("")}
    `;

  } catch (error) {
    console.error("View order details error:", error);
    detailsBox.innerHTML = "<p>Unable to connect to server.</p>";
  }
}

/*
  Search orders when user types.
*/
if (searchInput) {
  searchInput.addEventListener("input", renderOrders);
}

/*
  Filter orders by status.
*/
filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    filterButtons.forEach(btn => {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-selected", "false");
    });

    button.classList.add("is-active");
    button.setAttribute("aria-selected", "true");

    const filterValue = button.dataset.filter;

    if (filterValue === "all") {
      currentStatusFilter = "All";
    } else if (filterValue === "new") {
      currentStatusFilter = "Pending";
    } else if (filterValue === "preparing") {
      currentStatusFilter = "Preparing";
    } else if (filterValue === "ready") {
      currentStatusFilter = "Ready";
    } else if (filterValue === "completed") {
      currentStatusFilter = "Completed";
    }

    renderOrders();
  });
});