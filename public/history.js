document.addEventListener("DOMContentLoaded", () => {

    const listEl = document.getElementById("historyList");
    const emptyEl = document.getElementById("historyEmpty");
    const loadingEl = document.getElementById("loadingMsg");
    const refreshBtn = document.getElementById("refreshBtn");

    // ===========================
    // Helpers
    // ===========================

    function escapeHtml(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatMoney(n) {
        return `$${(Number(n) || 0).toFixed(2)}`;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return "";
        return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }

    function showAuthRequired() {
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
                        onclick="window.location.href='SigninPatron.html'"
                        style="background:#f97316;color:white;border:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;"
                    >
                        Sign In / Sign Up
                    </button>
                </div>
            `;
        }
    }

    // ===========================
    // Data loading
    // ===========================

    async function loadHistory() {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (!token || role !== "patron") {
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
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load order history.");
            }

            const orders = data.orders || [];

            if (loadingEl) loadingEl.style.display = "none";

            if (orders.length === 0) {
                if (emptyEl) {
                    emptyEl.style.display = "block";
                    emptyEl.textContent = "No orders found.";
                }
                return;
            }

            if (listEl) {
                listEl.innerHTML = orders.map((o) => `
                    <div class="history-item">
                        <div>
                            <div class="history-meta-row">
                                <span class="history-status-pill">${escapeHtml(o.order_status)}</span>
                                <span class="history-order-no">#${o.order_id}</span>
                            </div>

                            <div class="history-stall">${escapeHtml(o.stall_name)}</div>
                            <div class="history-date">${escapeHtml(formatDate(o.order_date))}</div>
                            <div class="history-total">Total: ${escapeHtml(formatMoney(o.total_amount))}</div>
                        </div>
                    </div>
                `).join("");
            }
        } catch (error) {
            console.error("Error loading order history:", error);
            if (loadingEl) loadingEl.style.display = "none";
            if (emptyEl) {
                emptyEl.style.display = "block";
                emptyEl.textContent = "Could not load orders. Please try again.";
            }
        }
    }

    refreshBtn?.addEventListener("click", loadHistory);

    loadHistory();
});
