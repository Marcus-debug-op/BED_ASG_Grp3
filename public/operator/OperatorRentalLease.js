// Runs alongside operator.js on the same page - that file already handles
// the auth guard, logout button, and top-level navigation. This file
// covers BED-23 (create/list/update rental agreements). BED-74's
// acceptance flow lives on the vendor side, not here - operators never
// touch is_accepted.
document.addEventListener("DOMContentLoaded", () => {

    const agreementsBody = document.getElementById("agreementsBody");
    if (!agreementsBody) return;

    const token = localStorage.getItem("token");

    const addAgreementBtn = document.getElementById("addAgreementBtn");
    const modal = document.getElementById("agreementModal");
    const modalTitle = document.getElementById("agreementModalTitle");
    const closeModalBtn = document.getElementById("closeAgreementModalBtn");
    const cancelBtn = document.getElementById("cancelAgreementBtn");
    const agreementForm = document.getElementById("agreementForm");
    const formMsg = document.getElementById("agreementFormMsg");

    const agreementIdField = document.getElementById("agreementId");
    const stallIdField = document.getElementById("agreementStallId");
    const leaseStartField = document.getElementById("leaseStartDate");
    const leaseEndField = document.getElementById("leaseEndDate");
    const monthlyRentField = document.getElementById("monthlyRent");
    const statusField = document.getElementById("agreementStatus");
    const statusLabel = document.getElementById("agreementStatusLabel");

    let currentAgreements = [];
    let stallOptions = [];

    function authHeaders(extra = {}) {
        return { Authorization: `Bearer ${token}`, ...extra };
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }

    // yyyy-mm-dd, what <input type="date"> needs - formatDate above is for
    // display only and can't round-trip back into the input.
    function toDateInputValue(dateStr) {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
    }

    function formatMoney(n) {
        return `$${(Number(n) || 0).toFixed(2)}`;
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function showFormMsg(text) {
        formMsg.textContent = text || "";
    }

    function stallLabel(stallId) {
        const stall = stallOptions.find((s) => s.stall_id === stallId);
        return stall ? `${escapeHtml(stall.stall_name)} (#${stallId})` : `#${stallId}`;
    }

    function openModal(agreement = null) {
        agreementForm.reset();
        showFormMsg("");

        if (agreement) {
            modalTitle.textContent = `Edit Agreement #${agreement.rental_agreement_id}`;
            agreementIdField.value = agreement.rental_agreement_id;
            stallIdField.value = agreement.stall_id;
            stallIdField.disabled = true; // stall isn't editable after creation
            leaseStartField.value = toDateInputValue(agreement.lease_start_date);
            leaseEndField.value = toDateInputValue(agreement.lease_end_date);
            monthlyRentField.value = agreement.monthly_rent;
            statusField.value = agreement.agreement_status;
            statusField.style.display = "";
            statusLabel.style.display = "";
        } else {
            modalTitle.textContent = "New Rental Agreement";
            agreementIdField.value = "";
            stallIdField.disabled = false;
            statusField.style.display = "none";
            statusLabel.style.display = "none";
        }

        modal.hidden = false;
    }

    function closeModal() {
        modal.hidden = true;
    }

    function renderSummary(agreements) {
        const today = new Date();
        const in30Days = new Date();
        in30Days.setDate(today.getDate() + 30);

        const activeCount = agreements.filter((a) => a.agreement_status === "Active").length;
        const expiringCount = agreements.filter((a) => {
            if (a.agreement_status !== "Active") return false;
            const end = new Date(a.lease_end_date);
            return end >= today && end < in30Days;
        }).length;

        document.getElementById("active-agreements").textContent = activeCount;
        document.getElementById("expiring-leases").textContent = expiringCount;
    }

    function renderAgreements(agreements) {
        if (agreements.length === 0) {
            agreementsBody.innerHTML = `<tr><td colspan="9" class="text-muted-center">No rental agreements yet. Click "New Agreement" to create one.</td></tr>`;
            return;
        }

        agreementsBody.innerHTML = agreements.map((a) => `
            <tr data-id="${a.rental_agreement_id}">
                <td>${a.rental_agreement_id}</td>
                <td>${escapeHtml(a.stall_name)}</td>
                <td>${escapeHtml(a.vendor_name)}</td>
                <td>${formatDate(a.lease_start_date)}</td>
                <td>${formatDate(a.lease_end_date)}</td>
                <td>${formatMoney(a.monthly_rent)}</td>
                <td><span class="badge ${a.agreement_status === "Active" ? "badge-success" : "badge-inactive"}">${escapeHtml(a.agreement_status)}</span></td>
                <td>${a.is_accepted ? '<span class="badge badge-success">Accepted</span>' : '<span class="badge-inactive">Pending</span>'}</td>
                <td>
                    <div class="row-actions">
                        <button type="button" class="btn-edit-row" data-action="edit">Edit</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    async function loadStallOptions() {
        try {
            const response = await fetch("/api/operator/stalls", { headers: authHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load stalls.");

            stallOptions = data;
            stallIdField.innerHTML = `<option value="">-- Select Stall --</option>` + stallOptions.map((s) =>
                `<option value="${s.stall_id}">${escapeHtml(s.stall_name)} - #${s.stall_id}</option>`
            ).join("");
        } catch (error) {
            console.error("Error loading stalls for dropdown:", error);
            stallIdField.innerHTML = `<option value="">Failed to load stalls</option>`;
        }
    }

    async function loadAgreements() {
        try {
            const response = await fetch("/api/operator/rental-agreements", {
                headers: authHeaders()
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load rental agreements.");

            currentAgreements = data;
            renderAgreements(data);
            renderSummary(data);
        } catch (error) {
            console.error("Error loading rental agreements:", error);
            agreementsBody.innerHTML = `<tr><td colspan="9" class="text-muted-center">Failed to load rental agreements.</td></tr>`;
        }
    }

    agreementsBody.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action='edit']");
        if (!btn) return;

        const row = btn.closest("tr");
        const agreementId = row.dataset.id;
        const agreement = currentAgreements.find((a) => String(a.rental_agreement_id) === agreementId);
        if (agreement) openModal(agreement);
    });

    addAgreementBtn.addEventListener("click", () => openModal());
    closeModalBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    agreementForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        showFormMsg("");

        const editingId = agreementIdField.value;

        const payload = {
            lease_start_date: leaseStartField.value,
            lease_end_date: leaseEndField.value,
            monthly_rent: Number(monthlyRentField.value)
        };

        if (editingId) {
            // BED-23 update route requires agreement_status too - create
            // doesn't accept it at all (new agreements always start Active).
            payload.agreement_status = statusField.value;
        } else {
            payload.stall_id = Number(stallIdField.value);
            if (!Number.isInteger(payload.stall_id) || payload.stall_id <= 0) {
                return showFormMsg("Please select a stall.");
            }
        }

        if (!payload.lease_start_date || !payload.lease_end_date) {
            return showFormMsg("Lease start and end dates are required.");
        }
        if (!payload.monthly_rent || payload.monthly_rent <= 0) {
            return showFormMsg("Monthly rent must be a positive number.");
        }

        try {
            const response = await fetch(
                editingId ? `/api/operator/rental-agreements/${editingId}` : "/api/operator/rental-agreements",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to save rental agreement.");
            }

            closeModal();
            await loadAgreements();
        } catch (error) {
            console.error("Error saving rental agreement:", error);
            showFormMsg(error.message || "Unable to save rental agreement.");
        }
    });

    async function init() {
        await loadStallOptions();
        await loadAgreements();
    }

    init();
    setInterval(loadAgreements, 30000);
});
