// Runs alongside operator.js on the same page - that file already handles
// the auth guard, logout button, and top-level navigation. This file only
// covers the Stall Management card (BED-28).
document.addEventListener("DOMContentLoaded", () => {

    const stallsBody = document.getElementById("stallsBody");

    const addStallBtn = document.getElementById("addStallBtn");
    const modal = document.getElementById("stallModal");
    const modalTitle = document.getElementById("modalTitle");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const stallForm = document.getElementById("stallForm");
    const formMsg = document.getElementById("stallFormMsg");

    const stallIdField = document.getElementById("stallId");
    const vendorIdField = document.getElementById("vendorId");
    const hawkerCentreIdField = document.getElementById("hawkerCentreId");
    const stallNameField = document.getElementById("stallName");
    const unitNumberField = document.getElementById("unitNumber");
    const descriptionField = document.getElementById("description");
    const operatingHoursField = document.getElementById("operatingHours");
    const priceRangeField = document.getElementById("priceRange");
    const phoneNumberField = document.getElementById("phoneNumber");
    const imageUrlField = document.getElementById("imageUrl");

    if (!stallsBody) return; // section not on this page for some reason - bail quietly

    const token = localStorage.getItem("token");

    let currentStalls = [];
    let vendorOptions = [];
    let hawkerCentreOptions = [];

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

    function showFormMsg(text) {
        formMsg.textContent = text || "";
    }

    function vendorLabel(vendorId) {
        const vendor = vendorOptions.find((v) => v.user_id === vendorId);
        return vendor ? `${escapeHtml(vendor.full_name)} (#${vendorId})` : `#${vendorId}`;
    }

    function hawkerCentreLabel(centreId) {
        const centre = hawkerCentreOptions.find((c) => c.hawker_centre_id === centreId);
        return centre ? `${escapeHtml(centre.centre_name)} (#${centreId})` : `#${centreId}`;
    }

    function openModal(stall = null) {
        stallForm.reset();
        showFormMsg("");

        if (stall) {
            modalTitle.textContent = `Edit Stall #${stall.stall_id}`;
            stallIdField.value = stall.stall_id;
            vendorIdField.value = stall.vendor_id;
            hawkerCentreIdField.value = stall.hawker_centre_id;
            stallNameField.value = stall.stall_name;
            unitNumberField.value = stall.unit_number || "";
            descriptionField.value = stall.description || "";
            operatingHoursField.value = stall.operating_hours || "";
            priceRangeField.value = stall.price_range || "";
            phoneNumberField.value = stall.phone_number || "";
            imageUrlField.value = stall.image_url || "";
        } else {
            modalTitle.textContent = "Add Stall";
            stallIdField.value = "";
        }

        modal.hidden = false;
    }

    function closeModal() {
        modal.hidden = true;
    }

    function renderStalls() {
        if (currentStalls.length === 0) {
            stallsBody.innerHTML = `<tr><td colspan="7" class="text-muted-center">No stalls yet. Click "Add Stall" to create one.</td></tr>`;
            return;
        }

        stallsBody.innerHTML = currentStalls.map((stall) => {
            const isActive = !!stall.is_active;

            return `
                <tr data-id="${stall.stall_id}">
                    <td>${stall.stall_id}</td>
                    <td>${escapeHtml(stall.stall_name)}</td>
                    <td>${vendorLabel(stall.vendor_id)}</td>
                    <td>${hawkerCentreLabel(stall.hawker_centre_id)}</td>
                    <td>${escapeHtml(stall.unit_number || "-")}</td>
                    <td>${isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge-inactive">Inactive</span>'}</td>
                    <td>
                        <div class="row-actions">
                            <button type="button" class="btn-edit-row" data-action="edit">Edit</button>
                            <button type="button" class="btn-deactivate-row" data-action="deactivate" ${isActive ? "" : "disabled"}>
                                ${isActive ? "Deactivate" : "Deactivated"}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    async function loadVendorOptions() {
        try {
            const response = await fetch("/api/operator/stalls/vendors", { headers: authHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load vendors.");

            vendorOptions = data;
            vendorIdField.innerHTML = `<option value="">-- Select Vendor --</option>` + vendorOptions.map((v) =>
                `<option value="${v.user_id}">${escapeHtml(v.full_name)} (${escapeHtml(v.email)}) - #${v.user_id}</option>`
            ).join("");
        } catch (error) {
            console.error("Error loading vendors:", error);
            vendorIdField.innerHTML = `<option value="">Failed to load vendors</option>`;
        }
    }

    async function loadHawkerCentreOptions() {
        try {
            const response = await fetch("/api/hawkercentres", { headers: authHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load hawker centres.");

            hawkerCentreOptions = data;
            hawkerCentreIdField.innerHTML = `<option value="">-- Select Hawker Centre --</option>` + hawkerCentreOptions.map((c) =>
                `<option value="${c.hawker_centre_id}">${escapeHtml(c.centre_name)}${c.area ? ` (${escapeHtml(c.area)})` : ""} - #${c.hawker_centre_id}</option>`
            ).join("");
        } catch (error) {
            console.error("Error loading hawker centres:", error);
            hawkerCentreIdField.innerHTML = `<option value="">Failed to load hawker centres</option>`;
        }
    }

    async function loadStalls() {
        stallsBody.innerHTML = `<tr><td colspan="7" class="text-muted-center">Loading stalls...</td></tr>`;

        try {
            const response = await fetch("/api/operator/stalls", { headers: authHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load stalls.");

            currentStalls = data;
            renderStalls();
        } catch (error) {
            console.error("Error loading stalls:", error);
            stallsBody.innerHTML = `<tr><td colspan="7" class="text-muted-center">Failed to load stalls.</td></tr>`;
        }
    }

    stallsBody.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const row = btn.closest("tr");
        const stallId = row.dataset.id;
        const action = btn.dataset.action;
        const stall = currentStalls.find((s) => String(s.stall_id) === stallId);
        if (!stall) return;

        if (action === "edit") {
            openModal(stall);
            return;
        }

        if (action === "deactivate") {
            const confirmed = confirm(`Deactivate "${stall.stall_name}"? This can be reversed later by editing the record.`);
            if (!confirmed) return;

            try {
                const response = await fetch(`/api/operator/stalls/${stallId}`, {
                    method: "DELETE",
                    headers: authHeaders()
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Unable to deactivate stall.");

                await loadStalls();
            } catch (error) {
                console.error("Error deactivating stall:", error);
                alert(error.message || "Unable to deactivate stall.");
            }
        }
    });

    addStallBtn.addEventListener("click", () => openModal());
    closeModalBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    stallForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        showFormMsg("");

        const payload = {
            vendor_id: Number(vendorIdField.value),
            hawker_centre_id: Number(hawkerCentreIdField.value),
            stall_name: stallNameField.value.trim(),
            unit_number: unitNumberField.value.trim(),
            description: descriptionField.value.trim(),
            operating_hours: operatingHoursField.value.trim(),
            price_range: priceRangeField.value.trim(),
            phone_number: phoneNumberField.value.trim(),
            image_url: imageUrlField.value.trim()
        };

        if (!payload.stall_name) return showFormMsg("Stall name is required.");
        if (!Number.isInteger(payload.vendor_id) || payload.vendor_id <= 0) return showFormMsg("Please select a vendor.");
        if (!Number.isInteger(payload.hawker_centre_id) || payload.hawker_centre_id <= 0) return showFormMsg("Please select a hawker centre.");

        const editingId = stallIdField.value;

        try {
            const response = await fetch(
                editingId ? `/api/operator/stalls/${editingId}` : "/api/operator/stalls",
                {
                    method: editingId ? "PUT" : "POST",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const details = Array.isArray(data.errors) ? ` (${data.errors.join(", ")})` : "";
                throw new Error((data.message || "Unable to save stall.") + details);
            }

            closeModal();
            await loadStalls();
        } catch (error) {
            console.error("Error saving stall:", error);
            showFormMsg(error.message || "Unable to save stall.");
        }
    });

    async function init() {
        await Promise.all([loadVendorOptions(), loadHawkerCentreOptions()]);
        await loadStalls();
    }

    init();
    setInterval(loadStalls, 30000);
});
