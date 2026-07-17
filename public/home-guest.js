// BED-50: Integrate Home Page with Stall Listing API
//
// This page now calls the backend Stall Listing API (BED-61) instead of Firestore.
// NOTE: there's no popularity/likes/order-count data on Stalls yet, so "trending"
// is currently just the first 3 stalls returned (alphabetical, per BED-61's ORDER BY).
// Swap the slice(0, 3) below for a real ranking once that data exists (see guide).

document.addEventListener("DOMContentLoaded", async () => {
  const trendingGrid = document.getElementById("trendingGrid");
  if (!trendingGrid) return;

  try {
    const stalls = await loadStalls();
    const trending = stalls.slice(0, 3);
    renderTrending(trendingGrid, trending);
    wireTrendingClicks(trendingGrid);
  } catch (err) {
    console.error("Home trending failed to load:", err);
    trendingGrid.innerHTML = `<p style="padding:12px;">Unable to load trending stalls right now.</p>`;
  }
});

async function loadStalls() {
  const res = await fetch("/api/stalls");
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

function renderTrending(container, list) {
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `<p style="padding:12px;">No trending stalls found.</p>`;
    return;
  }

  container.innerHTML = list
    .map((s) => {
      const name = s.stall_name || "Unnamed Stall";
      const cuisine = s.cuisine_type || "Food";
      const imageUrl = "/img/placeholder.jpg";
      const desc = s.description || "";

      return `
        <article class="food-card">
          <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(name)}" class="food-img" />
          <div class="food-body">
            <div class="food-title">${escapeHtml(name)}</div>
            <div class="food-meta">
              ${escapeHtml(cuisine)} • ${escapeHtml(s.centre_name || "")}
            </div>
            <p class="food-desc">${escapeHtml(desc)}</p>
            <button
              class="food-btn"
              type="button"
              data-i18n="btn_view"
              data-href="/patron/stalldetails.html?stall=${encodeURIComponent(s.stall_id)}">
              View
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function wireTrendingClicks(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".food-btn");
    if (!btn) return;
    const href = btn.getAttribute("data-href");
    if (href) window.location.href = href;
  });
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
