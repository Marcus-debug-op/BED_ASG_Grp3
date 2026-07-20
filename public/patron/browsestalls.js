// BED-49: Integrate Browse Stalls Page with Stall Search and Filter API
//
// This page now calls the backend Stall Listing API (BED-61)
// Search + cuisine filtering are sent to the server as query params.

const CUISINE_ALL = "All";

document.addEventListener("DOMContentLoaded", async () => {
  const stallGrid = document.getElementById("stallGrid");
  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");

  filterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    filterMenu.classList.toggle("active");
  });

  // Close menu when clicking outside
  document.addEventListener("click", () => {
    filterMenu?.classList.remove("active");
  });

  filterMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  const searchInput = document.querySelector(".search-input");
  const cuisineSelect = document.getElementById("cuisineSelect");
  const hawkerCentreSelect = document.getElementById("hawkerCentreSelect");
  const halalCheck = document.getElementById("halalCheck");
  const vegCheck = document.getElementById("vegCheck");
  const countText = document.querySelector(".count-text");

  // 1) Load hawker & stalls from the backend (initial load = no filters)
  await loadHawkerCentres();
  await refreshStalls();

  // 2) Hook filters - search/cuisine re-query the server, halal/veg filter client-side
  searchInput?.addEventListener("input", debounce(refreshStalls, 300));
  cuisineSelect?.addEventListener("change", refreshStalls);
  hawkerCentreSelect?.addEventListener("change", refreshStalls);
  halalCheck?.addEventListener("change", applyClientOnlyFilters);
  vegCheck?.addEventListener("change", applyClientOnlyFilters);

  async function loadHawkerCentres() {
  try {
    const res = await fetch("/api/hawkercentres");

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const centres = await res.json();

    centres.forEach((centre) => {
      const option = document.createElement("option");

      option.value = centre.hawker_centre_id;
      option.textContent = centre.centre_name;

      hawkerCentreSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load hawker centres:", err);
  }
}

  async function refreshStalls() {
    const params = {};

    const search = (searchInput?.value || "").trim();
    if (search) params.search = search;

    const cuisine = cuisineSelect?.value || CUISINE_ALL;
    if (cuisine !== CUISINE_ALL) {
      params.cuisine = cuisine;
    }

    const hawkerCentreId = hawkerCentreSelect?.value || "All";
    if (hawkerCentreId !== "All") {
      params.hawker_centre_id = hawkerCentreId;
    }

    try {
      const stalls = await loadStalls(params);
      renderStalls(stalls);
      applyClientOnlyFilters();
    } catch (err) {
      console.error("Failed to load stalls:", err);
      stallGrid.innerHTML = `<p style="padding:12px;">Unable to load stalls right now.</p>`;
      if (countText) countText.textContent = "0 stalls found";
    }
  }

  async function loadStalls(params) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/stalls${qs ? `?${qs}` : ""}`);

    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  function renderStalls(list) {
    stallGrid.innerHTML = list
      .map((s) => {
        const cuisine = (s.cuisine_type || "all").toLowerCase();

        // NOTE: halal / vegetarian aren't in the DB yet, defaulting to false
        // until BED-61's schema is extended (see the guide's optional migration).
        const halal = false;
        const vegetarian = false;

        const imageUrl = normalizeImageUrl(s.image_url);
        const shortDesc = s.description || "";

        return `
          <article class="stall-card"
            data-name="${escapeAttr((s.stall_name || "").toLowerCase())}"
            data-category="${escapeAttr(cuisine)}"
            data-halal="${halal}"
            data-vegetarian="${vegetarian}"
          >
            <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(s.stall_name || "Stall")}" class="stall-img" onerror="this.src='/img/placeholder.jpg'" />
            <div class="stall-body">
              <h3>${escapeHtml(s.stall_name || "Unnamed Stall")}</h3>
              <div class="stall-meta">
                ${escapeHtml(cap(cuisine))} • ${escapeHtml(s.centre_name || "")}
              </div>
              <p class="stall-desc">${escapeHtml(shortDesc)}</p>

              <a class="view-btn" href="/patron/stalldetails.html?stall=${encodeURIComponent(s.stall_id)}">View</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  // Halal/veg checkboxes can only filter what's already on the page
  // (client-side) since the server doesn't have that data to filter on yet.
  function applyClientOnlyFilters() {
    const wantHalal = !!halalCheck?.checked;
    const wantVeg = !!vegCheck?.checked;

    const cards = stallGrid.querySelectorAll(".stall-card");
    let visible = 0;

    cards.forEach((card) => {
      const isHalal = card.dataset.halal === "true";
      const isVeg = card.dataset.vegetarian === "true";

      const okHalal = !wantHalal || isHalal;
      const okVeg = !wantVeg || isVeg;

      const show = okHalal && okVeg;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });

    if (countText) countText.textContent = `${visible} stalls found`;
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(str = "") {
    return escapeHtml(str);
  }

  function normalizeImageUrl(imageUrl) {
  if (!imageUrl) {
    return "/img/placeholder.jpg";
  }

  const cleaned = String(imageUrl).trim();

  // Keep full online image links unchanged
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  // Keep already-correct root paths unchanged
  if (cleaned.startsWith("/img/") || cleaned.startsWith("/uploads/")) {
    return cleaned;
  }

  // Fix paths saved as img/example.jpg
  if (cleaned.startsWith("img/")) {
    return `/${cleaned}`;
  }

  // Fix paths saved as only filename, e.g. Laksa Legend.jpg
  return `/img/${cleaned}`;
}

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
});
