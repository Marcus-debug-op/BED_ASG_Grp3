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

  // 2) Hook filters - search/cuisine/dietary all re-query the server now
  // that BED-148's backend filter exists (previously halal/veg only
  // filtered client-side against a hardcoded `false`, since the server
  // had nothing to filter on yet).
  searchInput?.addEventListener("input", debounce(refreshStalls, 300));
  cuisineSelect?.addEventListener("change", refreshStalls);
  hawkerCentreSelect?.addEventListener("change", refreshStalls);
  halalCheck?.addEventListener("change", refreshStalls);
  vegCheck?.addEventListener("change", refreshStalls);

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

    // BED-148: build ?dietary=Halal,Vegetarian from whichever boxes are
    // checked. Matches the exact tag names seeded into Cuisines.
    const dietaryTags = [];
    if (halalCheck?.checked) dietaryTags.push("Halal");
    if (vegCheck?.checked) dietaryTags.push("Vegetarian");
    if (dietaryTags.length > 0) {
      params.dietary = dietaryTags.join(",");
    }

    try {
      const stalls = await loadStalls(params);
      renderStalls(stalls);
      if (countText) countText.textContent = `${stalls.length} stalls found`;
    } catch (err) {
      console.error("Failed to load stalls:", err);
      stallGrid.innerHTML = `<p style="padding:12px;">Unable to load stalls right now.</p>`;
      if (countText) countText.textContent = "0 stalls found";
    }
  }

  async function loadStalls(params) {
    const qs = new URLSearchParams(params).toString();
    // no-store: without it the browser can serve a cached copy of this GET
    // response, so a stall photo updated by a vendor (BED-147) would keep
    // showing the old image_url until a hard refresh.
    const res = await fetch(`/api/stalls${qs ? `?${qs}` : ""}`, { cache: "no-store" });

    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  function renderStalls(list) {
    stallGrid.innerHTML = list
      .map((s) => {
        const cuisine = (s.cuisine_type || "all").toLowerCase();

        const imageUrl = normalizeImageUrl(s.image_url);
        const shortDesc = s.description || "";

        const hygieneGrade = s.current_hygiene_grade? `Grade ${s.current_hygiene_grade}`: "No grade yet";

        return `
          <article class="stall-card"
            data-name="${escapeAttr((s.stall_name || "").toLowerCase())}"
            data-category="${escapeAttr(cuisine)}"
          >
            <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(s.stall_name || "Stall")}" class="stall-img" onerror="this.src='/img/placeholder.jpg'" />
            <div class="stall-body">
              <h3>${escapeHtml(s.stall_name || "Unnamed Stall")}</h3>

              <div class="stall-meta">
                ${escapeHtml(cap(cuisine))} • ${escapeHtml(s.centre_name || "")}
              </div>

              <div class="stall-meta">
                Hygiene: ${escapeHtml(hygieneGrade)}
              </div>

              <p class="stall-desc">${escapeHtml(shortDesc)}</p>

              <a class="view-btn" href="/patron/stalldetails.html?stall=${encodeURIComponent(s.stall_id)}">View</a>
            </div>
          </article>
        `;
      })
      .join("");
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

  // BED-147: fix paths saved as uploads/stalls/example.jpg (no leading
  // slash) - the vendor stall photo upload endpoint returns paths in this
  // exact shape, which previously fell through to the final img/ fallback
  // below and produced a broken /img/uploads/... URL.
  if (cleaned.startsWith("uploads/")) {
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