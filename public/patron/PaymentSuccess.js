// ===== Queue number (BED-25) =====
const queueEl = document.getElementById("queueNumber");
const LAST_ORDER_NO_KEY = "hawkerhub_last_order_no";
const HISTORY_KEY = "hawkerhub_order_history";

function formatQueueNo(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "--";
  return String(num).padStart(2, "0");
}
function setQueueNo(n) {
  if (!queueEl) return;
  queueEl.textContent = formatQueueNo(n);
}

const lastNo = localStorage.getItem(LAST_ORDER_NO_KEY);
if (lastNo != null && String(lastNo).trim() !== "") {
  setQueueNo(lastNo);
} else {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    if (Array.isArray(history) && history.length > 0) {
      const latest = history[history.length - 1];
      if (latest && latest.orderNo != null) setQueueNo(latest.orderNo);
    }
  } catch (e) {
    setQueueNo("--");
  }
}

// ===== Order receipt (BED-93) =====
const CHECKOUT_ID_KEY = "last_checkout_id";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function money(n) { return "$" + Number(n || 0).toFixed(2); }

async function loadReceipt() {
  const wrap = document.getElementById("receiptWrap");
  if (!wrap) return;

  const checkoutId = localStorage.getItem(CHECKOUT_ID_KEY);
  const token = localStorage.getItem("token");
  if (!checkoutId || !token) { wrap.innerHTML = ""; return; }

  try {
    const res = await fetch(`/api/orders/checkout/${encodeURIComponent(checkoutId)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    const data = await res.json();
    const orders = data.orders || [];
    if (!orders.length) { wrap.innerHTML = ""; return; }

    const first = orders[0];
    const collection = esc(first.collection_method || "Pickup");
    const payment = esc(first.payment_method || "-");
    const deliveryFee = orders.reduce((s, o) => s + Number(o.delivery_charge || 0), 0);
    const grandTotal = orders.reduce((s, o) => s + Number(o.total_amount), 0);
    const totalDiscount = orders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
    const promoCode = orders.find((o) => o.promo_code)?.promo_code || null;
    const subtotal = orders.reduce((sum, o) =>
      sum + (o.items || []).reduce((s, i) => s + Number(i.subtotal || 0), 0), 0);

    const stallBlocks = orders.map((o) => {
      const items = (o.items || []).map((i) => `
        <div class="rc-item">
          <span>${esc(i.item_name || "Item")} <span class="rc-qty">x${esc(i.quantity)}</span></span>
          <span>${esc(money(i.subtotal))}</span>
        </div>`).join("");
      return `
        <div class="rc-stall">
          <div class="rc-stall-head">
            <span class="rc-pill">${esc(o.order_status || "Pending")}</span>
            <span class="rc-orderno">#${esc(o.order_id)}</span>
            <span class="rc-stallname">${esc(o.stall_name || "Stall")}</span>
          </div>
          ${items}
        </div>`;
    }).join("");

    wrap.innerHTML = `
      <div class="receipt-card">
        <div class="rc-checkout">Checkout: ${esc(checkoutId)}</div>
        ${stallBlocks}
        <div class="rc-summary">
          <div class="rc-row"><span>Subtotal</span><span>${esc(money(subtotal))}</span></div>
          ${promoCode ? `<div class="rc-row"><span>Promo (${esc(promoCode)})</span><span>-${esc(money(totalDiscount))}</span></div>` : ""}
          ${deliveryFee > 0 ? `<div class="rc-row"><span>Delivery fee</span><span>${esc(money(deliveryFee))}</span></div>` : ""}
          <div class="rc-row rc-total"><span>Total</span><span>${esc(money(grandTotal))}</span></div>
        </div>
        <div class="rc-details">
          <div class="rc-row"><span>Collection</span><span>${collection}</span></div>
          <div class="rc-row"><span>Payment</span><span>${payment}</span></div>
        </div>
      </div>`;
  } catch (e) {
    console.error("Receipt error:", e);
    wrap.innerHTML = `<p class="rc-error">Your order was placed. The receipt could not be loaded right now.</p>`;
  }
}

loadReceipt();