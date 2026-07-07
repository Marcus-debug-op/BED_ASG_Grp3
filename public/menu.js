document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get the stall ID from the URL (e.g., menus.html?id=2)
    const params = new URLSearchParams(window.location.search);
    const stallId = params.get("id");

    const menuContainer = document.getElementById("menu-container");
    const stallTitle = document.getElementById("stall-name");
    const stallLocation = document.getElementById("stall-location");

    if (!stallId) {
        menuContainer.innerHTML = "<p>No stall selected.</p>";
        return;
    }

    try {
        // 2. Fetch data from your BED-62 API endpoint
        const response = await fetch(`/api/stalls/${stallId}/menu`);
        
        if (!response.ok) throw new Error("Could not load menu");
        
        const data = await response.json();

        // 3. Update the Page Header
        if (stallTitle) stallTitle.textContent = data.stall.stall_name;
        if (stallLocation) stallLocation.textContent = `${data.stall.centre_name} (#${data.stall.unit_number})`;

        // 4. Render Menu Items
        if (data.menu_items.length === 0) {
            menuContainer.innerHTML = "<p>No menu items available.</p>";
            return;
        }

        menuContainer.innerHTML = data.menu_items.map(item => {
            // FIX: Wrap the <img> in the 'image-container' div defined in Menu.css
            // This applies the 220px height and object-fit: cover styles correctly
            const imageHtml = item.image_url 
                ? `<div class="image-container"><img src="${escapeAttr(item.image_url)}" alt="${escapeHtml(item.item_name)}" /></div>` 
                : "";

            return `
                <div class="menu-card"> 
                    ${imageHtml}
                    <div class="card-body">
                        <h3>${escapeHtml(item.item_name)}</h3>
                        <p class="desc">${escapeHtml(item.description || "")}</p>
                        <p class="price">$${parseFloat(item.price).toFixed(2)}</p>
                        <p class="likes">❤️ ${item.likes !== undefined ? item.likes : 0} likes</p>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Error loading menu:", err);
        menuContainer.innerHTML = "<p>Failed to load menu. Please try again later.</p>";
    }
});

// Helper functions
function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function escapeAttr(str) {
    return escapeHtml(str);
}