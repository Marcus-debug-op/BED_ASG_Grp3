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
            const imageUrl = normalizeImageUrl(item.image_url);
            const imageHtml = `
                <div class="image-container">
                    <img 
                    src="${escapeAttr(imageUrl)}" 
                    alt="${escapeHtml(item.item_name)}"
                    onerror="this.src='/img/placeholder.jpg'"
                    />
                </div>
                `;

            return `
                <div class="menu-card"> 
                    ${imageHtml}
                    <div class="card-body">
                        <h3>${escapeHtml(item.item_name)}</h3>
                        <p class="desc">${escapeHtml(item.description || "")}</p>
                        <p class="price">$${parseFloat(item.price).toFixed(2)}</p>
                        <div class="likes-container like-btn" data-liked="false"
                             data-id="${item.menu_item_id}"
                             data-count="${item.likes !== undefined ? item.likes : 0}"
                             role="button" tabindex="0"
                             aria-label="Like ${escapeAttr(item.item_name)}">
                          <img class="heart-icon" src="/img/heart.png" alt="" />
                          <span class="like-count">${item.likes !== undefined ? item.likes : 0}</span>
                        </div>
                        <!-- Add-to-cart button. The dish's details ride in data-* attributes
                             so the click handler can read them without another API call. -->
                        <button class="add-to-cart"
                                data-id="${item.menu_item_id}"
                                data-name="${escapeAttr(item.item_name)}"
                                data-price="${item.price}"
                                data-image="${escapeAttr(imageUrl)}">
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

            // BED-116: notify the patron the item was added.
            if (typeof showToast === "function") showToast(`${item.name} added to cart`)
        });

        // BED-26 has no "did I already like this" endpoint, so every heart
        // defaults to "not liked" on load - the click toggles local + server
        // state from there. Nothing in the acceptance criteria requires
        // persisting toggle state across reloads, just that the count and
        // rollback-on-failure work.
        menuContainer.addEventListener("click", async (e) => {
            const btn = e.target.closest(".like-btn");
            if (!btn) return;
            if (btn.dataset.busy === "true") return; // ignore rapid double-clicks mid-request

            const menuItemId = btn.dataset.id;
            const wasLiked = btn.dataset.liked === "true";
            const previousCount = Number(btn.dataset.count);
            const heartEl = btn.querySelector(".heart-icon");
            const countEl = btn.querySelector(".like-count");

            // Optimistic update - flip the UI immediately, roll back if the
            // request fails.
            const nextLiked = !wasLiked;
            const nextCount = wasLiked ? previousCount - 1 : previousCount + 1;

            btn.dataset.busy = "true";
            btn.classList.remove("like-error");
            applyLikeState(btn, heartEl, countEl, nextLiked, nextCount);

            // Read the token the same way the rest of the app does
            // (SignInPatron.js / SignInVendor.js / checkout.js) - authStorage.js's
            // hawkerhub_auth key is never written to, so it can't be used here.
            const token = localStorage.getItem("token");
            if (!token) {
                alert("You must be logged in to like an item.");
                applyLikeState(btn, heartEl, countEl, wasLiked, previousCount);
                btn.dataset.busy = "false";
                return;
            }

            // Guests (GuestLogin.js) hold a valid token too, but only role="guest",
            // no "user" record - the backend rejects them with blockGuests, so
            // catch it here first for a clearer message instead of a failed request.
            if (isGuestAccount()) {
                alert("Guests can't like menu items. Please sign in as a patron.");
                applyLikeState(btn, heartEl, countEl, wasLiked, previousCount);
                btn.dataset.busy = "false";
                return;
            }

            try {
                const response = await fetch(`/api/menu-items/${menuItemId}/likes`, {
                    method: nextLiked ? "POST" : "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error("Like request failed");

                const data = await response.json();

                // Trust the server's count if it sent one back (e.g. "already liked").
                if (typeof data.likes === "number") {
                    applyLikeState(btn, heartEl, countEl, nextLiked, data.likes);
                }
            } catch (err) {
                console.error("Error toggling like:", err);

                // Revert the heart/count and show a subtle error state.
                applyLikeState(btn, heartEl, countEl, wasLiked, previousCount);
                btn.classList.add("like-error");
                setTimeout(() => btn.classList.remove("like-error"), 2000);
            } finally {
                btn.dataset.busy = "false";
            }
        });

    } catch (err) {
        console.error("Error loading menu:", err);
        menuContainer.innerHTML = "<p>Failed to load menu. Please try again later.</p>";
    }
});


function normalizeImageUrl(imageUrl) {
  if (!imageUrl) {
    return "/img/placeholder.jpg";
  }

  const cleaned = String(imageUrl).trim();

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  if (cleaned.startsWith("/img/") || cleaned.startsWith("/uploads/")) {
    return cleaned;
  }

  if (cleaned.startsWith("img/")) {
    return `/${cleaned}`;
  }

  return `/img/${cleaned}`;
}   

// Helper functions
// GuestLogin.js sets role="guest" and never writes a "user" record, so
// checking role is the reliable way to tell a guest session apart from a
// registered patron/vendor session (both of which always have "user" set).
function isGuestAccount() {
    return localStorage.getItem("role") === "guest";
}

function applyLikeState(btn, heartEl, countEl, liked, count) {
    btn.dataset.liked = String(liked);
    btn.dataset.count = String(count);
    btn.classList.toggle("liked", liked);
    heartEl.classList.toggle("liked", liked);
    heartEl.src = liked ? "/img/heart-filled.png" : "/img/heart.png";
    countEl.textContent = count;
}
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