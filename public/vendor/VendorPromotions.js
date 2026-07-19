document.addEventListener("DOMContentLoaded", () => {

    // ===========================
    // Authentication
    // ===========================

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    const form = document.getElementById("promoForm");
    const promoList = document.getElementById("promoList");
    const promoMsg = document.getElementById("promoMsg");
    const stallSelect = document.getElementById("stallSelect");
    const cancelEditBtn = document.getElementById("cancelEditBtn");

    const promoIdEl = document.getElementById("promoId");
    const codeEl = document.getElementById("code");
    const descriptionEl = document.getElementById("description");
    const valueEl = document.getElementById("value");
    const activeEl = document.getElementById("active");
    const startDateEl = document.getElementById("startDate");
    const endDateEl = document.getElementById("endDate");
    const minSpendEl = document.getElementById("minSpend");
    const maxRedemptionsEl = document.getElementById("maxRedemptions");

    if (!token || role !== "vendor") {
        showMsg("Please sign in as a vendor to manage promotions.", true);
        form.querySelector("button[type='submit']").disabled = true;
        return;
    }

    let stalls = [];
    let currentStallId = null;
    let currentPromotions = [];

    // ===========================
    // Helpers
    // ===========================

    function authHeaders(extra = {}) {
        return {
            Authorization: `Bearer ${token}`,
            ...extra
        };
    }

    function showMsg(text, isError = false) {
        promoMsg.textContent = text || "";
        promoMsg.style.color = isError ? "#b00020" : "";
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(dateStr) {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    }

    // Dates come back from the API as full ISO timestamps (SQL DATE -> midnight UTC);
    // <input type="date"> needs just the yyyy-mm-dd part.
    function toDateInputValue(dateStr) {
        if (!dateStr) return "";
        return String(dateStr).slice(0, 10);
    }

    function resetForm() {
        form.reset();
        promoIdEl.value = "";
        activeEl.checked = true;
        if (minSpendEl) minSpendEl.value = "";
        if (maxRedemptionsEl) maxRedemptionsEl.value = "";
        cancelEditBtn.hidden = true;
        form.querySelector(".promo-save-btn").textContent = "Save Promotion";
    }

    // ===========================
    // Rendering
    // ===========================

    function renderPromotionItem(promo) {
        const status = promo.is_active ? "Active" : "Inactive";

        const conditions = [];
        if (promo.min_spend_amount) {
            conditions.push(`Min spend $${Number(promo.min_spend_amount).toFixed(2)}`);
        }
        if (promo.max_redemptions) {
            conditions.push(`Limit ${promo.max_redemptions} uses`);
        }

        return `
            <div class="promo-item" data-id="${promo.promotion_id}">
                <div class="promo-item-top">
                    <div class="promo-code">${escapeHtml(promo.promo_code)}</div>
                    <div class="promo-pill">${status}</div>
                </div>

                <div class="promo-title">${promo.discount_percent}% off</div>
                <div>${escapeHtml(promo.description || "")}</div>
                <div class="promo-expiry">${formatDate(promo.start_date)} – ${formatDate(promo.end_date)}</div>
                ${conditions.length ? `<div class="promo-conditions">${conditions.join(" · ")}</div>` : ""}

                <div class="promo-actions">
                    <button type="button" class="promo-action-btn" data-action="toggle">
                        ${promo.is_active ? "Set Inactive" : "Set Active"}
                    </button>

                    <button type="button" class="promo-action-btn" data-action="edit">
                        Edit
                    </button>

                    <button type="button" class="promo-action-btn" data-action="delete">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    function renderPromotions() {
        if (currentPromotions.length === 0) {
            promoList.innerHTML = `<p style="margin:0; opacity:.75;">No promo codes yet.</p>`;
            return;
        }

        promoList.innerHTML = currentPromotions.map(renderPromotionItem).join("");
    }

    // ===========================
    // Data loading
    // ===========================

    async function loadPromotions(stallId) {
        promoList.innerHTML = `<p style="margin:0; opacity:.75;">Loading promotions...</p>`;

        try {
            const response = await fetch(`/api/vendor/promotions/stall/${stallId}`, {
                headers: authHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load promotions.");
            }

            currentPromotions = data;
            renderPromotions();
        } catch (error) {
            console.error("Error loading promotions:", error);
            promoList.innerHTML = `<p style="margin:0; color:#b00020;">Failed to load promotions.</p>`;
        }
    }

    async function loadStalls() {
        try {
            const response = await fetch("/api/vendor/my-stalls", {
                headers: authHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load your stalls.");
            }

            stalls = data;

            if (stalls.length === 0) {
                showMsg("No stall linked to this account yet. Set one up under Stall Details.", true);
                form.querySelector("button[type='submit']").disabled = true;
                return;
            }

            if (stalls.length > 1) {
                stallSelect.hidden = false;
                stallSelect.innerHTML = stalls
                    .map((stall) => `<option value="${stall.stall_id}">${escapeHtml(stall.stall_name)}</option>`)
                    .join("");

                stallSelect.addEventListener("change", () => {
                    currentStallId = Number(stallSelect.value);
                    resetForm();
                    loadPromotions(currentStallId);
                });
            }

            currentStallId = stalls[0].stall_id;
            await loadPromotions(currentStallId);
        } catch (error) {
            console.error("Error loading stalls:", error);
            showMsg("Unable to load your stall.", true);
        }
    }

    // ===========================
    // Add / Edit / Toggle / Delete
    // ===========================

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        showMsg("");

        const minSpendRaw = minSpendEl ? minSpendEl.value.trim() : "";
        const maxRedemptionsRaw = maxRedemptionsEl ? maxRedemptionsEl.value.trim() : "";

        const payload = {
            promo_code: codeEl.value.trim(),
            description: descriptionEl.value.trim(),
            discount_percent: Number(valueEl.value),
            start_date: startDateEl.value,
            end_date: endDateEl.value,
            is_active: activeEl.checked,
            // Blank means "no minimum" / "unlimited" - send null, not 0 or NaN.
            min_spend_amount: minSpendRaw === "" ? null : Number(minSpendRaw),
            max_redemptions: maxRedemptionsRaw === "" ? null : Number(maxRedemptionsRaw)
        };

        if (!payload.promo_code) return showMsg("Promo code cannot be empty.", true);
        if (!Number.isFinite(payload.discount_percent) || payload.discount_percent <= 0 || payload.discount_percent > 100) {
            return showMsg("Discount must be a number between 1 and 100.", true);
        }
        if (!payload.start_date || !payload.end_date) return showMsg("Start and end dates are required.", true);
        if (payload.end_date < payload.start_date) return showMsg("End date must be on or after the start date.", true);
        if (payload.min_spend_amount !== null && (!Number.isFinite(payload.min_spend_amount) || payload.min_spend_amount <= 0)) {
            return showMsg("Minimum spend must be a positive number, or left blank.", true);
        }
        if (payload.max_redemptions !== null && (!Number.isInteger(payload.max_redemptions) || payload.max_redemptions <= 0)) {
            return showMsg("Usage limit must be a whole number, or left blank.", true);
        }

        const editingId = promoIdEl.value;

        try {
            const response = await fetch(
                editingId ? `/api/vendor/promotions/${editingId}` : `/api/vendor/promotions/stall/${currentStallId}`,
                {
                    method: editingId ? "PUT" : "POST",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const details = Array.isArray(data.errors) ? ` (${data.errors.join(", ")})` : "";
                throw new Error((data.message || "Failed to save promo code.") + details);
            }

            showMsg(editingId ? "Promo code updated." : "Promo code saved!");
            resetForm();
            await loadPromotions(currentStallId);
        } catch (error) {
            console.error(error);
            showMsg(error.message || "Failed to save promo code.", true);
        }
    });

    cancelEditBtn.addEventListener("click", () => {
        resetForm();
        showMsg("");
    });

    promoList.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const card = btn.closest(".promo-item");
        if (!card) return;

        const promotionId = card.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        const promo = currentPromotions.find((p) => String(p.promotion_id) === promotionId);
        if (!promo) return;

        try {
            if (action === "toggle") {
                // There's no dedicated "toggle active" route - PUT /:promotionId is the
                // one real update route, and it requires the full promotion payload
                // (matching what the create route validates), not a partial patch.
                const response = await fetch(`/api/vendor/promotions/${promotionId}`, {
                    method: "PUT",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({
                        promo_code: promo.promo_code,
                        description: promo.description || "",
                        discount_percent: promo.discount_percent,
                        start_date: toDateInputValue(promo.start_date),
                        end_date: toDateInputValue(promo.end_date),
                        is_active: !promo.is_active,
                        min_spend_amount: promo.min_spend_amount ?? null,
                        max_redemptions: promo.max_redemptions ?? null
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Failed to update status.");

                showMsg(`Status updated to ${!promo.is_active ? "Active" : "Inactive"}.`);
                await loadPromotions(currentStallId);
            }

            if (action === "edit") {
                promoIdEl.value = promo.promotion_id;
                codeEl.value = promo.promo_code;
                descriptionEl.value = promo.description || "";
                valueEl.value = promo.discount_percent;
                activeEl.checked = !!promo.is_active;
                startDateEl.value = toDateInputValue(promo.start_date);
                endDateEl.value = toDateInputValue(promo.end_date);
                if (minSpendEl) minSpendEl.value = promo.min_spend_amount ?? "";
                if (maxRedemptionsEl) maxRedemptionsEl.value = promo.max_redemptions ?? "";
                cancelEditBtn.hidden = false;
                form.querySelector(".promo-save-btn").textContent = "Update Promotion";
                form.scrollIntoView({ behavior: "smooth", block: "start" });
            }

            if (action === "delete") {
                const confirmed = confirm(`Delete promo code "${promo.promo_code}"? This can't be undone.`);
                if (!confirmed) return;

                const response = await fetch(`/api/vendor/promotions/${promotionId}`, {
                    method: "DELETE",
                    headers: authHeaders()
                });

                // A successful delete is 204 No Content - there's no body to parse,
                // so only read the response as JSON on the error path.
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || "Failed to delete promo code.");
                }

                if (promoIdEl.value === promotionId) resetForm();
                showMsg("Promo code deleted.");
                await loadPromotions(currentStallId);
            }
        } catch (error) {
            console.error(error);
            showMsg(error.message || "Action failed.", true);
        }
    });

    // ===========================
    // Init
    // ===========================

    loadStalls();
});