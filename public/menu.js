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
                        <!-- Add-to-cart button. The dish's details ride in data-* attributes
                             so the click handler can read them without another API call. -->
                        <button class="add-to-cart"
                                data-id="${item.menu_item_id}"
                                data-name="${escapeAttr(item.item_name)}"
                                data-price="${item.price}"
                                data-image="${escapeAttr(item.image_url || "")}">
                          Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }).join("");

         // One listener on the container handles every card's button (event delegation),
        // so we don't attach a separate listener to each card.
        menuContainer.addEventListener("click", (e) => {
            // Only react if an add-to-cart button (or something inside it) was clicked.
            const btn = e.target.closest(".add-to-cart");
            if (!btn) return;

            // Build the item using the exact keys ScriptCart.js's normalizeItem expects:
            // id, name, price, qty (+ stallId so the cart key is unique per stall).
            const item = {
                id: btn.dataset.id,               // menu_item_id
                name: btn.dataset.name,           // dish name
                price: Number(btn.dataset.price), // string attribute -> number
                qty: 1,                           // adding one at a time
                stallId: stallId,                  // current stall from the URL
                img: btn.dataset.image        
            };

            // Read the shared cart, add or increment this item, then save it back.
            const cart = readCart();                          // from ScriptCart.js
            const existing = cart.find(c => c.id === item.id); // already in cart?
            if (existing) {
                existing.qty += 1;                            // bump quantity
            } else {
                cart.push(item);                              // add new line
            }
            saveCart(cart);                                    // from ScriptCart.js

            // Refresh the little cart count badge in the nav.
            if (typeof updateCartDot === "function") updateCartDot();
        });

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