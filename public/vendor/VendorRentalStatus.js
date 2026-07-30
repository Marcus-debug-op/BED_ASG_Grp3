// BED-74: Vendor Rental Agreement Acknowledgement.
// Renders every rental agreement belonging to the logged-in vendor's
// stalls, and lets them accept a pending one. Vendors never edit rental
// fee, lease period, or status here - that stays operator-controlled
// (BED-23, /api/operator/rental-agreements).
document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById("agreementsContainer");
    if (!container) return;

    const token = localStorage.getItem("token");

    function authHeaders(extra = {}) {
        return { Authorization: `Bearer ${token}`, ...extra };
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
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function formatMoney(n) {
        return `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function agreementCardHtml(a) {
        const accepted = !!a.is_accepted;
        const statusPillClass = accepted ? "paid" : "due";
        const statusLabel = accepted ? "Accepted" : "Pending Acceptance";

        return `
            <section class="rental-dashboard" data-id="${a.rental_agreement_id}">
                <header class="rental-head">
                    <div>
                        <h2 class="rental-title">${escapeHtml(a.stall_name)}</h2>
                        <p class="rental-sub">Agreement #${a.rental_agreement_id}</p>
                    </div>

                    <div class="status-pill ${statusPillClass}">${statusLabel}</div>
                </header>

                <div class="rental-grid">
                    <div class="rental-tile">
                        <div class="tile-meta">
                            <div class="tile-label">Monthly Rent</div>
                            <div class="tile-value">${formatMoney(a.monthly_rent)}</div>
                        </div>
                    </div>

                    <div class="rental-tile">
                        <div class="tile-meta">
                            <div class="tile-label">Lease Start</div>
                            <div class="tile-value">${formatDate(a.lease_start_date)}</div>
                        </div>
                    </div>

                    <div class="rental-tile">
                        <div class="tile-meta">
                            <div class="tile-label">Lease End</div>
                            <div class="tile-value">${formatDate(a.lease_end_date)}</div>
                        </div>
                    </div>

                    <div class="rental-tile">
                        <div class="tile-meta">
                            <div class="tile-label">Agreement Status</div>
                            <div class="tile-value">${escapeHtml(a.agreement_status)}</div>
                        </div>
                    </div>
                </div>

                <div class="rental-sep"></div>

                <div class="two-col">
                    <section class="panel">
                        <h3 class="panel-title">Acceptance</h3>

                        <div class="kv">
                            <span class="k">Status</span>
                            <span class="v">${statusLabel}</span>
                        </div>

                        <div class="kv">
                            <span class="k">Accepted On</span>
                            <span class="v">${a.acceptance_timestamp ? formatDate(a.acceptance_timestamp) : "-"}</span>
                        </div>

                        <div class="actions">
                            <button
                                type="button"
                                class="btn-primary"
                                data-action="accept"
                                ${accepted ? "disabled" : ""}
                            >
                                ${accepted ? "Already Accepted" : "Accept Agreement"}
                            </button>
                        </div>

                        <p class="form-msg" data-role="agreement-msg" aria-live="polite"></p>
                    </section>
                </div>
            </section>
        `;
    }

    function render(agreements) {
        if (agreements.length === 0) {
            container.innerHTML = `<p class="muted">You have no rental agreements yet. Your operator will create one for your stall.</p>`;
            return;
        }

        container.innerHTML = agreements.map(agreementCardHtml).join("<div class=\"rental-sep\"></div>");
    }

    async function loadAgreements() {
        try {
            const response = await fetch("/api/vendor/rental-agreements", {
                headers: authHeaders()
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load rental agreements.");

            render(data);
        } catch (error) {
            console.error("Error loading vendor rental agreements:", error);
            container.innerHTML = `<p class="muted">Failed to load your rental agreements.</p>`;
        }
    }

    container.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action='accept']");
        if (!btn) return;

        const card = btn.closest(".rental-dashboard");
        const agreementId = card.dataset.id;
        const msgEl = card.querySelector("[data-role='agreement-msg']");

        btn.disabled = true;
        msgEl.textContent = "";

        try {
            const response = await fetch(`/api/vendor/rental-agreements/${agreementId}/accept`, {
                method: "PATCH",
                headers: authHeaders()
            });

            const data = await response.json();

            if (response.status === 409) {
                msgEl.textContent = data.message || "This agreement has already been accepted.";
            } else if (!response.ok) {
                throw new Error(data.message || "Unable to accept this agreement.");
            }

            await loadAgreements();
        } catch (error) {
            console.error("Error accepting rental agreement:", error);
            msgEl.textContent = error.message || "Unable to accept this agreement.";
            btn.disabled = false;
        }
    });

    loadAgreements();
});
