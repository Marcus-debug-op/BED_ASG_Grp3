document.addEventListener("DOMContentLoaded", () => {

    // ===========================
    // Authentication
    // ===========================

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    const ordersListElement = document.getElementById("orders-list");
    const searchInput = document.getElementById("order-search");
    const filterButtons = Array.from(document.querySelectorAll(".filter-chip"));

    if (!token || role !== "vendor") {
        ordersListElement.innerHTML = '<div class="loading-text">Please login to view orders.</div>';
        return;
    }

    // ===========================
    // State
    // ===========================

    let allOrders = [];
    let currentStallId = null;
    let activeFilter = "all"; // all | new | preparing | ready | completed
    let searchTerm = "";
    let pollTimer = null;

    // SQL order_status values <-> the workflow keys the UI already uses.
    const STATUS_TO_WORKFLOW = {
        Pending: "new",
        Preparing: "preparing",
        Ready: "ready",
        Completed: "completed",
        Cancelled: "completed"
    };

    const WORKFLOW_TO_NEXT_STATUS = {
        new: "Preparing",
        preparing: "Ready",
        ready: "Completed"
    };

    function authHeaders(extra = {}) {
        return {
            Authorization: `Bearer ${token}`,
            ...extra
        };
    }

    // --- workflow helpers ---
    function getWorkflowStatus(order) {
        return STATUS_TO_WORKFLOW[order.order_status] || "new";
    }

    function workflowLabel(s) {
        if (s === "preparing") return "Preparing";
        if (s === "ready") return "Ready";
        if (s === "completed") return "Completed";
        return "New";
    }

    function nextActionLabel(s) {
        if (s === "new") return "Start Preparing";
        if (s === "preparing") return "Mark Ready";
        if (s === "ready") return "Complete";
        return null;
    }

    function safeLower(v) {
        return (v || "").toString().toLowerCase();
    }

    function orderMatchesSearch(order, term) {
        if (!term) return true;
        const t = term.trim().toLowerCase();
        if (!t) return true;

        const orderNo = String(order.order_id);
        const customerName = safeLower(order.customer_name);
        const itemsText = (order.items || [])
            .map((i) => `${i.item_name || ""} ${i.quantity || ""}`)
            .join(" ")
            .toLowerCase();

        return (
            orderNo.includes(t) ||
            customerName.includes(t) ||
            itemsText.includes(t)
        );
    }

    function applyFiltersAndRender() {
        const filtered = allOrders
            .filter((order) => {
                const ws = getWorkflowStatus(order);
                const matchesFilter = activeFilter === "all" ? true : ws === activeFilter;
                return matchesFilter && orderMatchesSearch(order, searchTerm);
            })
            .sort((a, b) => {
                const pr = { new: 0, preparing: 1, ready: 2, completed: 3 };
                const aS = getWorkflowStatus(a);
                const bS = getWorkflowStatus(b);

                const pDiff = (pr[aS] ?? 99) - (pr[bS] ?? 99);
                if (pDiff !== 0) return pDiff;

                return new Date(a.order_date) - new Date(b.order_date);
            });

        renderOrders(filtered);
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderOrders(orders) {
        ordersListElement.innerHTML = "";

        if (orders.length === 0) {
            ordersListElement.innerHTML = '<div class="loading-text">No active orders found for this stall.</div>';
            return;
        }

        orders.forEach((order) => {
            const orderCard = document.createElement("div");
            orderCard.className = "order-card";

            const items = order.items || [];
            const itemCount = items.length;
            const formattedPrice = Number(order.total_amount || 0).toFixed(2);
            const timeString = order.order_date
                ? new Date(order.order_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recently";

            const workflowStatus = getWorkflowStatus(order);
            const workflowText = workflowLabel(workflowStatus);
            const nextStatus = WORKFLOW_TO_NEXT_STATUS[workflowStatus];
            const nextText = nextActionLabel(workflowStatus);

            const itemsHtml = items.map((item) => `
                <div class="item-row">
                    <span>• ${escapeHtml(item.item_name)}</span>
                    <span>x ${item.quantity || 1}</span>
                </div>
            `).join("");

            orderCard.innerHTML = `
                <div class="queue-section">
                    <span class="queue-label">Queue No.</span>
                    <span class="queue-number">${order.order_id}</span>
                </div>

                <div class="details-section">
                    <div class="customer-badge">${escapeHtml(order.customer_name || "Customer")}</div>
                    <div class="items-list">${itemsHtml}</div>
                    <div class="order-meta">
                        <span class="item-count">${itemCount} Item${itemCount === 1 ? "" : "s"}</span>
                        <span class="divider">|</span>
                        <span class="total-price">$${formattedPrice}</span>
                        <span class="time-stamp">${timeString}</span>
                    </div>
                </div>

                <div class="payment-section">
                    <span class="section-label">Status</span>
                    <span class="order-status-badge ${workflowStatus}">${workflowText}</span>

                    ${nextText ? `
                    <div class="status-actions">
                        <button class="status-btn primary"
                        data-action="advance"
                        data-id="${order.order_id}"
                        data-next="${nextStatus}">
                        ${nextText}
                        </button>
                    </div>
                    ` : ""}
                </div>
            `;
            ordersListElement.appendChild(orderCard);
        });
    }

    // Event delegation (avoids re-binding listeners every render)
    ordersListElement.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const action = btn.getAttribute("data-action");
        if (action !== "advance") return;

        const orderId = btn.getAttribute("data-id");
        const next = btn.getAttribute("data-next");
        if (!orderId || !next) return;

        btn.disabled = true;

        try {
            const response = await fetch(`/api/vendor/orders/${orderId}/status`, {
                method: "PATCH",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ order_status: next })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update order status.");
            }

            await loadOrders();
        } catch (error) {
            console.error("Workflow update failed:", error);
            btn.disabled = false;
        }
    });

    // ===========================
    // Data loading
    // ===========================

    async function loadOrders() {
        if (!currentStallId) return;

        try {
            const response = await fetch(`/api/vendor/orders/stall/${currentStallId}`, {
                headers: authHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load orders.");
            }

            allOrders = data;
            applyFiltersAndRender();
        } catch (error) {
            console.error("Order loading error:", error);
            ordersListElement.innerHTML = '<div class="loading-text">Unable to load orders.</div>';
        }
    }

    async function init() {
        ordersListElement.innerHTML = '<div class="loading-text">Connecting to HawkerHub...</div>';

        try {
            const response = await fetch("/api/vendor/my-stalls", {
                headers: authHeaders()
            });

            const stalls = await response.json();

            if (!response.ok) {
                throw new Error(stalls.message || "Unable to load your stalls.");
            }

            if (stalls.length === 0) {
                ordersListElement.innerHTML = '<div class="loading-text">Error: No stall found linked to this account.</div>';
                return;
            }

            currentStallId = stalls[0].stall_id;

            await loadOrders();

            // Poll for new orders every 15s since there's no live push channel on the SQL backend.
            pollTimer = setInterval(loadOrders, 15000);
        } catch (error) {
            console.error("Vendor stall loading error:", error);
            ordersListElement.innerHTML = '<div class="loading-text">Unable to load your stall.</div>';
        }
    }

    window.addEventListener("beforeunload", () => {
        if (pollTimer) clearInterval(pollTimer);
    });

    // --- wire up UI controls ---
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchTerm = e.target.value || "";
            applyFiltersAndRender();
        });
    }

    filterButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            activeFilter = btn.getAttribute("data-filter") || "all";

            filterButtons.forEach((b) => {
                const isActive = (b.getAttribute("data-filter") || "all") === activeFilter;
                b.classList.toggle("is-active", isActive);
                b.setAttribute("aria-selected", isActive ? "true" : "false");
            });

            applyFiltersAndRender();
        });
    });

    init();
});
