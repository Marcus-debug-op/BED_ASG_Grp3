document.addEventListener("DOMContentLoaded", () => {

    // ===========================
    // Authentication
    // ===========================

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "vendor") {
        alert("Please sign in as a vendor.");
        window.location.href = "/auth/SignInVendor.html";
        return;
    }

    // ===========================
    // Elements
    // ===========================

    const stallLabel = document.getElementById("stallLabel");
    const stallSelect = document.getElementById("stallSelect");
    const menuGrid = document.getElementById("menuGrid");
    const menuMsg = document.getElementById("menuMsg");

    const addItemBtn = document.getElementById("addItemBtn");
    const modal = document.getElementById("itemModal");
    const modalTitle = document.getElementById("modalTitle");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const itemForm = document.getElementById("itemForm");
    const formMsg = document.getElementById("formMsg");

    const itemIdField = document.getElementById("itemId");
    const nameField = document.getElementById("itemName");
    const descriptionField = document.getElementById("itemDescription");
    const priceField = document.getElementById("itemPrice");
    const categoryField = document.getElementById("itemCategory");
    const imageUrlField = document.getElementById("itemImageUrl");
    const availableField = document.getElementById("itemAvailable");

    let stalls = [];
    let currentStallId = null;
    let currentItems = [];

    // ===========================
    // Helpers
    // ===========================

    function authHeaders(extra = {}) {
        return {
            Authorization: `Bearer ${token}`,
            ...extra
        };
    }

    function showMenuMsg(text, isError = true) {
        menuMsg.textContent = text || "";
        menuMsg.classList.toggle("success", !isError);
    }

    function showFormMsg(text) {
        formMsg.textContent = text || "";
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function openModal(item = null) {
        itemForm.reset();
        showFormMsg("");

        if (item) {
            modalTitle.textContent = "Edit Menu Item";
            itemIdField.value = item.menu_item_id;
            nameField.value = item.item_name;
            descriptionField.value = item.description || "";
            priceField.value = item.price;
            categoryField.value = item.category || "";
            imageUrlField.value = item.image_url || "";
            availableField.checked = !!item.is_available;
        } else {
            modalTitle.textContent = "Add Menu Item";
            itemIdField.value = "";
            availableField.checked = true;
        }

        modal.hidden = false;
    }

    function closeModal() {
        modal.hidden = true;
    }

    // ===========================
    // Rendering
    // ===========================

    function renderItems() {
        if (currentItems.length === 0) {
            menuGrid.innerHTML = `<p class="empty-text">No menu items yet. Click "Add Item" to create your first dish.</p>`;
            return;
        }

        menuGrid.innerHTML = currentItems.map((item) => {
            const image = item.image_url
                ? `<img class="menu-item-image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.item_name)}" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'menu-item-image-placeholder', innerHTML: '<i class=\\'fa-solid fa-utensils\\'></i>'}))">`
                : `<div class="menu-item-image-placeholder"><i class="fa-solid fa-utensils"></i></div>`;

            const available = !!item.is_available;

            return `
                <div class="menu-item-card" data-id="${item.menu_item_id}">
                    ${image}
                    <div class="menu-item-body">
                        <div class="menu-item-top">
                            <span class="menu-item-name">${escapeHtml(item.item_name)}</span>
                            ${item.category ? `<span class="menu-item-category">${escapeHtml(item.category)}</span>` : ""}
                        </div>

                        <p class="menu-item-desc">${escapeHtml(item.description || "")}</p>
                        <p class="menu-item-price">$${Number(item.price).toFixed(2)}</p>

                        <span class="menu-item-status ${available ? "status-available" : "status-unavailable"}">
                            ${available ? "Available" : "Unavailable"}
                        </span>

                        <div class="menu-item-actions">
                            <button type="button" class="btn-toggle" data-action="toggle">
                                ${available ? "Set Unavailable" : "Set Available"}
                            </button>
                            <button type="button" class="btn-edit" data-action="edit">Edit</button>
                            <button type="button" class="btn-delete" data-action="delete">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // ===========================
    // Data loading
    // ===========================

    async function loadMenu(stallId) {
        showMenuMsg("");
        menuGrid.innerHTML = `<p class="empty-text">Loading menu items...</p>`;

        try {
            const response = await fetch(`/api/vendor/menu/stall/${stallId}`, {
                headers: authHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load menu items.");
            }

            currentItems = data;
            renderItems();
        } catch (error) {
            console.error("Error loading menu:", error);
            showMenuMsg(error.message || "Unable to load menu items.");
            menuGrid.innerHTML = `<p class="empty-text">Failed to load menu items.</p>`;
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
                stallLabel.textContent = "No stall linked to this account yet.";
                menuGrid.innerHTML = `<p class="empty-text">Set up your stall under "Stall Details" before adding menu items.</p>`;
                addItemBtn.disabled = true;
                return;
            }

            if (stalls.length > 1) {
                stallSelect.hidden = false;
                stallSelect.innerHTML = stalls
                    .map((stall) => `<option value="${stall.stall_id}">${escapeHtml(stall.stall_name)}</option>`)
                    .join("");

                stallSelect.addEventListener("change", () => {
                    currentStallId = Number(stallSelect.value);
                    const stall = stalls.find((s) => s.stall_id === currentStallId);
                    stallLabel.textContent = `${stall.stall_name} · ${stall.centre_name}`;
                    loadMenu(currentStallId);
                });
            }

            const initialStall = stalls[0];
            currentStallId = initialStall.stall_id;
            stallLabel.textContent = `${initialStall.stall_name} · ${initialStall.centre_name}`;

            await loadMenu(currentStallId);
        } catch (error) {
            console.error("Error loading stalls:", error);
            stallLabel.textContent = "Unable to load your stall.";
            menuGrid.innerHTML = `<p class="empty-text">Unable to load your stall.</p>`;
        }
    }

    // ===========================
    // Item actions (toggle / edit / delete)
    // ===========================

    menuGrid.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const card = btn.closest(".menu-item-card");
        const menuItemId = card.dataset.id;
        const action = btn.dataset.action;
        const item = currentItems.find((i) => String(i.menu_item_id) === menuItemId);
        if (!item) return;

        if (action === "edit") {
            openModal(item);
            return;
        }

        if (action === "toggle") {
            try {
                const response = await fetch(`/api/vendor/menu/${menuItemId}/availability`, {
                    method: "PATCH",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ is_available: !item.is_available })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to update availability.");
                }

                await loadMenu(currentStallId);
            } catch (error) {
                console.error("Error toggling availability:", error);
                showMenuMsg(error.message || "Unable to update availability.");
            }
            return;
        }

        if (action === "delete") {
            const confirmed = confirm(`Delete "${item.item_name}"? This cannot be undone.`);
            if (!confirmed) return;

            try {
                const response = await fetch(`/api/vendor/menu/${menuItemId}`, {
                    method: "DELETE",
                    headers: authHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to delete menu item.");
                }

                showMenuMsg(`"${item.item_name}" deleted.`, false);
                await loadMenu(currentStallId);
            } catch (error) {
                console.error("Error deleting item:", error);
                showMenuMsg(error.message || "Unable to delete menu item.");
            }
        }
    });

    // ===========================
    // Add / Edit form submit
    // ===========================

    addItemBtn.addEventListener("click", () => openModal());
    closeModalBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        showFormMsg("");

        const payload = {
            item_name: nameField.value.trim(),
            description: descriptionField.value.trim(),
            price: Number(priceField.value),
            category: categoryField.value.trim(),
            image_url: imageUrlField.value.trim(),
            is_available: availableField.checked
        };

        if (!payload.item_name) {
            showFormMsg("Item name is required.");
            return;
        }

        if (!Number.isFinite(payload.price) || payload.price <= 0) {
            showFormMsg("Price must be a number greater than 0.");
            return;
        }

        const editingId = itemIdField.value;

        try {
            const response = await fetch(
                editingId ? `/api/vendor/menu/${editingId}` : `/api/vendor/menu/stall/${currentStallId}`,
                {
                    method: editingId ? "PUT" : "POST",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const details = Array.isArray(data.errors) ? ` (${data.errors.join(", ")})` : "";
                throw new Error((data.message || "Unable to save menu item.") + details);
            }

            closeModal();
            showMenuMsg(editingId ? "Menu item updated." : "Menu item added.", false);
            await loadMenu(currentStallId);
        } catch (error) {
            console.error("Error saving item:", error);
            showFormMsg(error.message || "Unable to save menu item.");
        }
    });

    // ===========================
    // Init
    // ===========================

    loadStalls();
});