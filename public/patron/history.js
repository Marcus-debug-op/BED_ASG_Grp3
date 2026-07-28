// Order History page — integrated with the SQL Order History API.
// Auth uses the SQL login token in localStorage (same as checkout & navbar).
// Data comes from GET /api/orders/history — no Firebase.

// ---------- STATE ----------
let allOrders = [];

// ---------- AUTH HELPERS (SQL token, not Firebase) ----------
// Reads the JWT saved by the patron login. Its presence is how this page
// knows someone is signed in.
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
// Replaces the order list with a sign-in prompt. Used when there is no token,
// or when the API rejects the token (401/403).
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
// Converts characters that mean something in HTML (< > & " ') into safe text.
// Needed because the order data is injected with innerHTML — without this,
// a stall or item name containing HTML could run as code (XSS).
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
// SQL Server returns dates as ISO strings, so convert to a readable local date.
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
// Opens one order and loads its full breakdown, including each item,
// from the order details endpoint.
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

// ============================================================================
// showCombinedReceipt
// ----------------------------------------------------------------------------
// Fetches every order in a checkout (via the new /checkout/:checkoutId endpoint)
// and renders them as one full receipt: each stall with its items, plus the
// shared delivery / payment info and the combined total.
// ============================================================================
async function showCombinedReceipt(checkoutId) {

  // Switch from the list view to the detail view. The detail view container
  // already holds the working "Back to History" button, outside the box.
  document.getElementById("listView")?.classList.add("hidden");
  document.getElementById("detailView")?.classList.remove("hidden");

  // Render into the same body element that the single-order detail view uses.
  const detailEl = document.getElementById("detailsBody");
  if (!detailEl) return;

  try {
    // Call the new endpoint with the patron's token (proves who we are).
    const res = await fetch(`/api/orders/checkout/${encodeURIComponent(checkoutId)}`, {
      headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    const data = await res.json();
    const orders = data.orders || [];
    if (!orders.length) return;

    // The checkout-level fields (collection, payment, fee) are the same on every
    // order in the group, so we read them from the first one.
    const first = orders[0];
    const collection = escapeHtml(first.collection_method || "Pickup");
    const payment = escapeHtml(first.payment_method || "-");
    // Delivery fee was stored on only one order, so summing gives the real total.
    const deliveryFee = orders.reduce((s, o) => s + Number(o.delivery_charge || 0), 0);
    const grandTotal = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    // BED-209: total promo discount across all orders in this checkout, and
    // the code used (all orders in one checkout share the same promo code).
    const totalDiscount = orders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
    const promoCode = orders.find((o) => o.promo_code)?.promo_code || null;
    // Subtotal = sum of every item's subtotal across all stalls, before any
    // eco, delivery or promo adjustments.
    const subtotal = orders.reduce((sum, o) =>
      sum + (o.items || []).reduce((s, i) => s + Number(i.subtotal || 0), 0), 0);

    // Build a block for each stall, listing that order's items.
    const stallBlocks = orders.map((o) => {
      const items = (o.items || []).map((i) => `
        <div class="detail-item">
          <span>${escapeHtml(i.item_name || "Item")} <span style="color:var(--text-muted);">x${escapeHtml(i.quantity)}</span></span>
          <span>${escapeHtml(formatMoney(i.subtotal))}</span>
        </div>`).join("");

      return `
        <div class="combined-stall-block">
          <div class="history-meta-row">
            <span class="history-status-pill">${escapeHtml(o.order_status || "Pending")}</span>
            <span class="history-order-no">#${escapeHtml(o.order_id)}</span>
            <span class="history-stall" style="margin-left:8px;">${escapeHtml(o.stall_name || "Stall")}</span>
          </div>
          ${items}
        </div>`;
    }).join("");

    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h2>Checkout Receipt</h2>
          <div class="detail-meta">
            <span>${escapeHtml(checkoutId)}</span>
          </div>
        </div>
      </div>

      ${stallBlocks}

      <div class="detail-summary">
        <div class="detail-row">
          <span>Collection</span>
          <strong>${collection}</strong>
        </div>
        <div class="detail-row">
          <span>Payment</span>
          <strong>${payment}</strong>
        </div>
        <div class="detail-row">
          <span>Subtotal</span>
          <strong>${escapeHtml(formatMoney(subtotal))}</strong>
        </div>
        ${promoCode ? `
        <div class="detail-row">
          <span>Promo (${escapeHtml(promoCode)})</span>
          <strong>-${escapeHtml(formatMoney(totalDiscount))}</strong>
        </div>` : ""}
        ${deliveryFee > 0 ? `
        <div class="detail-row">
          <span>Delivery fee</span>
          <strong>${escapeHtml(formatMoney(deliveryFee))}</strong>
        </div>` : ""}
        <div class="detail-row">
          <span>Total</span>
          <strong>${escapeHtml(formatMoney(grandTotal))}</strong>
        </div>
      </div>`;
  } catch (e) {
    console.error("Combined receipt error:", e);
  }
}

// Loads the patron's past orders and renders them newest-first.
// Orders sharing a checkout_id are grouped into one combined receipt;
// older orders (no checkout_id) still render as single cards.
async function loadHistory() {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const loadingEl = document.getElementById("loadingMsg");

  // No token -> the patron isn't signed in.
  const token = getToken();
  if (!token) {
    showAuthRequired();
    return;
  }

  try {
    // Show the loading state while we fetch.
    if (loadingEl) loadingEl.style.display = "block";
    if (emptyEl) emptyEl.style.display = "none";

    // Ask the backend for this patron's orders. The token tells the backend
    // WHO we are - no id is sent in the URL.
    const response = await fetch("/api/orders/history", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    // Expired/invalid token or wrong role -> ask them to sign in.
    if (response.status === 401 || response.status === 403) {
      showAuthRequired();
      return;
    }
    if (!response.ok) throw new Error(`Request failed (${response.status})`);

    const data = await response.json();
    const allOrders = data.orders || [];

    if (loadingEl) loadingEl.style.display = "none";

    // No orders at all -> friendly empty state.
    if (allOrders.length === 0) {
      if (emptyEl) emptyEl.style.display = "block";
      listEl.innerHTML = "";
      return;
    }

    // BED-165: group the flat list by checkout id, then render each group.
    const groups = groupByCheckout(allOrders);

    listEl.innerHTML = groups.map((group) => {
      const orders = group.orders;
      const isCombined = orders.length > 1;   // >1 stall = combined receipt

      // ---------- SINGLE ORDER (old orders / one-stall checkout) ----------
      if (!isCombined) {
        const o = orders[0];
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
          </div>`;
      }

      // ---------- COMBINED RECEIPT (one checkout, several stalls) ----------
      const checkoutId = escapeHtml(group.key);
      const date = escapeHtml(formatDate(orders[0].order_date));
      const grandTotal = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

      const stallBlocks = orders.map((o) => `
        <div class="combined-stall-block">
          <div class="history-meta-row">
            <span class="history-status-pill">${escapeHtml(o.order_status || "Pending")}</span>
            <span class="history-order-no">#${escapeHtml(o.order_id)}</span>
            <span class="history-stall" style="margin-left:8px;">${escapeHtml(o.stall_name || "Stall")}</span>
          </div>
          <div class="history-total" style="font-size:0.9em;">${escapeHtml(formatMoney(o.total_amount))}</div>
        </div>
      `).join("");

      return `
        <div class="history-item combined-receipt">
          <div style="width:100%;">
            <div class="history-date">Checkout: ${checkoutId}</div>
            <div class="history-date">${date}</div>
            ${stallBlocks}
            <div class="history-total">Total: ${escapeHtml(formatMoney(grandTotal))}</div>
            <button class="history-view-btn view-btn" data-checkout="${checkoutId}" type="button">
              View Full Receipt
            </button>
          </div>
        </div>`;
    }).join("");

    // Wire up the buttons: combined cards carry data-checkout, single cards
    // carry data-id. Branch on which attribute exists.
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const checkoutId = btn.getAttribute("data-checkout");
        if (checkoutId) {
          showCombinedReceipt(checkoutId);          // combined receipt view
        } else {
          showDetail(btn.getAttribute("data-id"));  // single order (existing)
        }
      });
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
// Returns from the detail view back to the list of orders.
function showList() {
  document.getElementById("listView")?.classList.remove("hidden");
  document.getElementById("detailView")?.classList.add("hidden");
}

// ============================================================================
// BED-165: groupByCheckout
// ----------------------------------------------------------------------------
// The history API returns a flat list of orders. This groups them by their
// checkout_id so orders from the SAME checkout can be shown as one receipt.
// Older orders have no checkout_id (NULL) - each of those gets its own unique
// "solo-<orderId>" key, so it still shows as a single card (nothing breaks).
// ============================================================================
function groupByCheckout(orders) {
  const groups = {};   // key -> array of orders
  const order = [];    // remembers the order groups first appear (newest first)

  for (const o of orders) {
    // Old orders (no checkout_id) each get a unique key so they stay separate.
    const key = o.checkout_id || `solo-${o.order_id}`;
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(o);
  }

  // Return as an array of { key, orders } in display order.
  return order.map((key) => ({ key, orders: groups[key] }));
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