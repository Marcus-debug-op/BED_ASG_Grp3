// Order History page — integrated with the SQL Order History API.
// Auth uses the SQL login token in localStorage (same as checkout & navbar).
// Data comes from GET /api/orders/history — no Firebase.

// ---------- STATE ----------
let allOrders = [];

// ---------- AUTH HELPERS (SQL token, not Firebase) ----------
function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

// ---------- UI STATE MESSAGES ----------
function showAuthRequired() {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const loadingEl = document.getElementById("loadingMsg");

  if (loadingEl) loadingEl.style.display = "none";
  if (emptyEl) emptyEl.style.display = "none";

  if (listEl) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h2 style="margin-bottom: 20px; color: #333;">Sign In Required</h2>
        <p style="margin-bottom: 30px; color: #666;">
          You need to be signed in to view your order history.
        </p>
        <button
          onclick="window.location.href='/auth/SignInPatron.html'"
          style="background:#f97316;color:white;border:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">
          Sign In / Sign Up
        </button>
      </div>
    `;
  }
}

// ---------- UTILS ----------
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}

// Order date from SQL is an ISO string (e.g. "2026-07-11T18:27:58.523Z").
function formatDate(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ---------- DETAIL VIEW ----------
// Note: the history endpoint returns a per-order summary only (no line items),
// so the detail view shows the summary fields we have.
// Opens the detail view for one order and loads its full breakdown (with items)
// from the new GET /api/orders/:id endpoint.
async function showDetail(orderId) {
  // Switch from the list view to the detail view.
  document.getElementById("listView")?.classList.add("hidden");
  document.getElementById("detailView")?.classList.remove("hidden");

  const detailEl = document.getElementById("detailsBody");
  if (!detailEl) return;

  // Show a temporary loading message while we fetch.
  detailEl.innerHTML = `<p style="padding:20px;">Loading order details...</p>`;

  try {
    // Call the new endpoint with the patron's token.
    const res = await fetch(`/api/orders/${orderId}`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    // Pull the order header and its items out of the response.
    const data = await res.json();
    const order = data.order || {};
    const items = Array.isArray(data.items) ? data.items : [];

    // Build the detail HTML: header, then each item, then the summary/total.
    detailEl.innerHTML = `
      <div class="detail-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div>
          <h2>Order #${escapeHtml(order.order_id)}</h2>
          <div class="detail-meta">
            <span>${escapeHtml(formatDate(order.order_date))}</span>
            <span class="pill">${escapeHtml(order.order_status || "Pending")}</span>
          </div>
        </div>
      </div>

      <div class="detail-items">
        ${items.map(i => `
          <div class="detail-item">
            <div class="detail-item-name">${escapeHtml(i.item_name || "Item")}</div>
            <div class="detail-item-qty">x${escapeHtml(i.quantity || 1)}</div>
            <div class="detail-item-price">${escapeHtml(formatMoney(i.subtotal))}</div>
          </div>
        `).join("")}
      </div>

      <div class="detail-summary">
        <div class="detail-row">
          <span>Stall</span>
          <strong>${escapeHtml(order.stall_name || "Unknown stall")}</strong>
        </div>
        <div class="detail-total-row">
          <span>Total</span>
          <span>${escapeHtml(formatMoney(order.total_amount))}</span>
        </div>
      </div>
    `;
  } catch (e) {
    // If the fetch fails, show a friendly message instead of a blank box.
    console.error("Error loading order details:", e);
    detailEl.innerHTML = `<p style="padding:20px;">Could not load order details.</p>`;
  }
}

// ---------- LOAD HISTORY (SQL API) ----------
async function loadHistory() {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const loadingEl = document.getElementById("loadingMsg");

  const token = getToken();
  if (!token) {
    showAuthRequired();
    return;
  }

  if (listEl) listEl.innerHTML = "";
  if (loadingEl) {
    loadingEl.style.display = "block";
    loadingEl.textContent = "Loading orders...";
  }
  if (emptyEl) emptyEl.style.display = "none";

  try {
    const response = await fetch("/api/orders/history", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    // Token missing/expired or wrong role -> ask them to sign in.
    if (response.status === 401 || response.status === 403) {
      showAuthRequired();
      return;
    }

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const data = await response.json();
    allOrders = Array.isArray(data.orders) ? data.orders : [];

    if (loadingEl) loadingEl.style.display = "none";

    // Empty state (patron with no past orders) -> 200 + empty list.
    if (!allOrders.length) {
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.textContent = "No orders yet.";
      }
      return;
    }

    if (!listEl) return;

    listEl.innerHTML = allOrders.map((o) => {
      const stall = escapeHtml(o.stall_name || "Unknown stall");
      const date = escapeHtml(formatDate(o.order_date));
      const total = escapeHtml(formatMoney(o.total_amount));
      const orderNo = escapeHtml(o.order_id);
      const status = escapeHtml(o.order_status || "Pending");

      return `
        <div class="history-item">
          <div>
            <div class="history-meta-row">
              <span class="history-status-pill">${status}</span>
              <span class="history-order-no">#${orderNo}</span>
            </div>
            <div class="history-stall">${stall}</div>
            <div class="history-date">${date}</div>
            <div class="history-total">Total: ${total}</div>
          </div>

          <div style="display:flex;gap:10px;align-items:center;">
            <button class="history-view-btn view-btn" data-id="${o.order_id}" type="button">
              View Details
            </button>
          </div>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => showDetail(e.currentTarget.dataset.id));
    });

  } catch (error) {
    console.error("Error fetching history:", error);
    if (loadingEl) loadingEl.style.display = "none";
    if (emptyEl) {
      emptyEl.style.display = "block";
      emptyEl.textContent = "Could not load orders. Please try again.";
    }
  }
}

// ---------- BACK TO LIST ----------
function showList() {
  document.getElementById("listView")?.classList.remove("hidden");
  document.getElementById("detailView")?.classList.add("hidden");
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  // No token -> not signed in on the SQL system.
  if (!getToken()) {
    showAuthRequired();
    return;
  }

  loadHistory();

  document.getElementById("backToListBtn")?.addEventListener("click", showList);

  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    loadHistory();
  });
});