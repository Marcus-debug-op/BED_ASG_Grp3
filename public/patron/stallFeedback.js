function getStallId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("stall");
  return id ? id.trim() : null;
}

function createStars(container, rating) {
  if (!container) return;
  container.innerHTML = "";
  const rounded = Math.round(Number(rating || 0));

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("i");
    star.className = i <= rounded ? "fa-solid fa-star" : "fa-regular fa-star";
    star.style.color = "#f5b301";
    container.appendChild(star);
  }
}

function ratingBucket(rating) {
  const rounded = Math.round(Number(rating || 0));
  return Math.max(1, Math.min(5, rounded));
}

// Updated to handle SQL Server Datetime format
function fmtDate(value) {
  try {
    if (!value) return "";
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }
    return "";
  } catch {
    return "";
  }
}

// BED-92 frontend: who's logged in right now, so we know which review
// cards are "yours" (SignInPatron.js stores this under the plain "user" key,
// not through authStorage.js - see menu.js's BED-78 fix for why that matters).
function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function renderReviews(reviews) {
  const list = document.getElementById("reviewsList");
  if (!list) return;

  list.innerHTML = "";

  const currentUser = getCurrentUser();

  for (const r of reviews) {
    const card = document.createElement("div");
    card.className = "review-post dynamic-review";

    // Mapped to match your SQL column names (e.g., reviewer_name, created_at)
    const reviewerName = r.reviewer_name || r.name || "Guest Patron";
    const reviewDate = r.created_at || r.createdAt;
    const reviewComment = r.comment || "";
    const reviewRating = r.rating || 0;

    const hasPhoto = r.photo && typeof r.photo === "string" && r.photo.trim().length > 0;

    // Only the patron who wrote this review sees a delete button on it -
    // the backend also enforces this (403 on mismatch), this is just UI.
    const isOwnReview = currentUser && r.patron_id === currentUser.user_id;

    card.innerHTML = `
      <div class="user-meta">
        <div class="user-avatar">
          <img class="avatar-img" />
        </div>

        <div class="user-title">
          <strong>${reviewerName}</strong>
          <div class="stars-gold-small"></div>
        </div>

        <div class="post-meta-right">
          <span class="post-date">${fmtDate(reviewDate)}</span>
          ${isOwnReview ? `<button type="button" class="review-delete-btn" data-feedback-id="${r.feedback_id}">Delete</button>` : ""}
        </div>
      </div>

      <div class="review-content-row">
        <p class="post-text">${reviewComment}</p>

        ${hasPhoto ? `
          <div class="review-photo-wrap">
            <img class="review-photo" src="${r.photo}" alt="Review Photo">
          </div>
        ` : ""}
      </div>
    `;

    list.appendChild(card);

    const avatarImg = card.querySelector(".avatar-img");
    avatarImg.src = (r.avatar && r.avatar.trim()) ? r.avatar : "/img/avatars/default.png";
    avatarImg.onerror = () => (avatarImg.src = "/img/avatars/default.png");

    createStars(card.querySelector(".stars-gold-small"), reviewRating);

    const reviewPhoto = card.querySelector(".review-photo");
    if (reviewPhoto) {
      reviewPhoto.onerror = () => {
        reviewPhoto.closest(".review-photo-wrap")?.remove();
      };
    }
  }
}

// BED-92 frontend: delete own feedback. Delegated on the list container since
// cards are re-rendered wholesale on every loadFeedback() call.
async function handleDeleteClick(e) {
  const btn = e.target.closest(".review-delete-btn");
  if (!btn) return;

  const feedbackId = btn.dataset.feedbackId;
  if (!confirm("Delete this review? This can't be undone.")) return;

  const token = localStorage.getItem("token");
  if (!token) {
    alert("You must be logged in to delete your review.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Deleting...";

  try {
    const response = await fetch(`/api/feedback/${feedbackId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Delete request failed");

    // Re-fetch rather than just removing the card, so avg_rating/total_reviews/
    // star breakdown all stay in sync with the server after the delete.
    const stallId = getStallId();
    await loadFeedback(stallId);
  } catch (error) {
    console.error("Error deleting feedback:", error);
    alert("Couldn't delete your review. Please try again.");
    btn.disabled = false;
    btn.textContent = "Delete";
  }
}

function updateStats(reviews) {
  const total = reviews.length;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of reviews) {
    const rating = Number(r.rating || 0);
    if (!isNaN(rating)) sum += rating;

    const bucket = ratingBucket(rating);
    counts[bucket] += 1;
  }

  const avg = total > 0 ? sum / total : 0;

  const avgRatingEl = document.getElementById("avgRating");
  const avgStarsEl = document.getElementById("avgStars");
  const totalEl = document.getElementById("totalReviews");

  if (avgRatingEl) avgRatingEl.textContent = avg.toFixed(1);
  if (totalEl) totalEl.textContent = String(total);

  createStars(avgStarsEl, avg);

  for (let i = 1; i <= 5; i++) {
    const countEl = document.getElementById(`count${i}`);
    const barEl = document.getElementById(`bar${i}`);

    const c = counts[i] || 0;
    if (countEl) countEl.textContent = String(c);

    const pct = total > 0 ? (c / total) * 100 : 0;
    if (barEl) barEl.style.width = `${pct}%`;
  }
}

// Rewritten to use Express SQL API instead of Firebase
async function loadStallInfo(stallId) {
  try {
    const response = await fetch('/api/stalls');
    const allStalls = await response.json();
    
    // Find stall by snake_case stall_id
    const s = allStalls.find(stall => stall.stall_id == stallId);

    if (!s) {
      alert("Stall not found in database");
      return null;
    }

    const stallDisplayName = s.stall_name || `Stall ${stallId}`;

    const nameEl = document.getElementById("stallNameText");
    if (nameEl) nameEl.textContent = stallDisplayName;

    const imgEl = document.getElementById("stallHeroImg");
    if (imgEl) imgEl.src = s.image_url || "/img/placeholder.jpg"; // Adjust for DB columns

    const closeBtn = document.querySelector(".btn-close-modal");
    if (closeBtn) closeBtn.addEventListener("click", () => window.history.back());

    // Fix the "Add Feedback" button wiring
    const returnUrl = `stallFeedback.html?id=${encodeURIComponent(stallId)}`;
    const addLink = document.getElementById("addFeedbackLink");
    if (addLink) {
      // Ensure 'feedback.html' matches your actual submission form file name
      addLink.href = `feedback.html?stall=${encodeURIComponent(stallDisplayName)}&id=${encodeURIComponent(stallId)}&return=${encodeURIComponent(returnUrl)}`;
    }

    document.title = `${stallDisplayName} - Feedback`;
    return stallDisplayName;
  } catch (error) {
    console.error("Error loading stall info from backend:", error);
    return null;
  }
}

// Rewritten to fetch BED-85 feature from Express
async function loadFeedback(stallId) {
  try {
    const response = await fetch(`/api/stalls/${stallId}/reviews/summary`);
    
    if (!response.ok) {
        console.error("Failed to load reviews summary");
        return;
    }

    const data = await response.json();
    
    // Defensive parsing: Handle whatever structure your SQL controller returns
    let reviewsList = [];
    if (Array.isArray(data)) {
        reviewsList = data; // Fallback for raw arrays
    } else if (data.recent_reviews) {
        reviewsList = data.recent_reviews;
    }

    renderReviews(reviewsList);

    // Apply exact SQL Math if your BED-85 query returns it
    if (data.avg_rating !== undefined && data.total_reviews !== undefined) {
        const avgRatingEl = document.getElementById("avgRating");
        const avgStarsEl = document.getElementById("avgStars");
        const totalEl = document.getElementById("totalReviews");

        if (avgRatingEl) {
            avgRatingEl.textContent = data.avg_rating !== null ? Number(data.avg_rating).toFixed(1) : "0.0";
        }
        if (totalEl) totalEl.textContent = data.total_reviews;
        
        createStars(avgStarsEl, Number(data.avg_rating || 0));
        updateStats(reviewsList); // Run bar math
    } else {
        // Fallback to manual frontend calculation
        updateStats(reviewsList);
    }
  } catch (error) {
    console.error("Error loading feedback from backend:", error);
  }
}

async function init() {
  const stallId = getStallId();
  if (!stallId) {
    alert("Error: No stall selected.");
    return;
  }

  const list = document.getElementById("reviewsList");
  if (list) list.addEventListener("click", handleDeleteClick);

  await loadStallInfo(stallId);
  await loadFeedback(stallId);
}

init().catch(console.error);