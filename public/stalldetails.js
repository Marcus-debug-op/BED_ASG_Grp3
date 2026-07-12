function getStallId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || params.get("stall"); 
    return id ? id.trim() : null;
}

async function loadDetails() {
    const stallId = getStallId();
    
    if (!stallId) {
        document.getElementById("stall-name").textContent = "No stall selected";
        return;
    }

    try {
        // Fetch from your local Express backend
        const response = await fetch('/api/stalls');
        const allStalls = await response.json();
        
        // Find the specific stall
        const s = allStalls.find(stall => stall.stall_id == stallId);

        if (!s) {
            document.getElementById("stall-name").textContent = "Stall not found";
            return;
        }

        // --- 1. Set Name & Title ---
        document.getElementById("stall-name").textContent = s.stall_name;
        document.title = `${s.stall_name} - Details`;

        // --- 2. Set Image (Now using your database image_url) ---
        const imgElement = document.getElementById("stall-img");
        if (imgElement) {
            imgElement.src = s.image_url || "img/placeholder.jpg";
            imgElement.alt = s.stall_name;
        }

        // --- 3. Set Description, Cuisine, and Rating ---
        const descEl = document.getElementById("stall-desc");
        if (descEl) descEl.textContent = s.description || "No description available.";

        const cuisineEl = document.getElementById("stall-cuisine");
        if (cuisineEl) cuisineEl.textContent = s.cuisine_type || "General";

        // BED-85 stretch goal: fetch the real average instead of hardcoding it.
        // Separate request from /api/stalls above since that endpoint doesn't
        // include rating data - a failure here shouldn't break the rest of
        // the page, so it's wrapped in its own try/catch.
        const ratingEl = document.getElementById("stall-rating");
        if (ratingEl) {
            try {
                const reviewsResponse = await fetch(`/api/stalls/${stallId}/reviews/summary`);

                if (reviewsResponse.ok) {
                    const reviewsData = await reviewsResponse.json();

                    if (reviewsData.avg_rating !== null && reviewsData.total_reviews > 0) {
                        const avg = Number(reviewsData.avg_rating).toFixed(1);
                        const reviewWord = reviewsData.total_reviews === 1 ? "review" : "reviews";
                        ratingEl.textContent = `${avg} (${reviewsData.total_reviews} ${reviewWord})`;
                    } else {
                        ratingEl.textContent = "Not yet rated";
                    }
                } else {
                    ratingEl.textContent = "Not yet rated";
                }
            } catch (reviewsErr) {
                console.error("Error fetching reviews summary:", reviewsErr);
                ratingEl.textContent = "Not yet rated";
            }
        }


        // --- 4. INFO GRID (Now using real SQL data!) ---
        const locEl = document.getElementById("stall-location");
        if (locEl) locEl.textContent = s.unit_number ? `Unit ${s.unit_number}` : "-";

        const hoursEl = document.getElementById("stall-hours");
        if (hoursEl) hoursEl.textContent = s.operating_hours || "Hours not specified";

        const priceEl = document.getElementById("stall-price");
        if (priceEl) priceEl.textContent = s.price_range || "N/A";

        const phoneEl = document.getElementById("stall-phone");
        if (phoneEl) phoneEl.textContent = s.phone_number || "N/A";


        // --- 5. Keep Button Links Working ---
        const menuBtn = document.querySelector('a[href*="menus.html"]') || document.getElementById("menu-link");
        if (menuBtn) menuBtn.href = `menus.html?id=${encodeURIComponent(stallId)}`;

        const feedbackLink = document.getElementById("feedback-link") || document.querySelector('a[href*="stallFeedback.html"]');
        if (feedbackLink) feedbackLink.href = `stallFeedback.html?id=${encodeURIComponent(stallId)}`;

        const complaintBtn = document.getElementById("add-complaint-btn") || document.querySelector('a[href*="complaint.html"]');
        if (complaintBtn) complaintBtn.href = `complaint.html?id=${encodeURIComponent(stallId)}`;

    } catch (err) {
        console.error("Error fetching stall details:", err);
        document.getElementById("stall-name").textContent = "Error loading stall details.";
    }
}

loadDetails();