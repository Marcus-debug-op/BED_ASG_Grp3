// Removed all Firebase imports

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    stallId: (params.get("id") || params.get("stall") || "").trim(),
    returnUrl: (params.get("return") || "").trim()
  };
}

// Kept this just in case your UI uses it to show a preview on the screen, 
// but we will NOT send it to the backend for BED-2.
function fileToCompressedDataUrl(file, maxSize = 700, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxSize) {
          h = Math.round((h * maxSize) / w);
          w = maxSize;
        } else if (h >= w && h > maxSize) {
          w = Math.round((w * maxSize) / h);
          h = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.querySelector(".btn-submit");
  const closeBtn = document.querySelector(".close-modal-btn");
  const ratingHidden = document.getElementById("rating-value");
  const commentBox = document.querySelector(".main-complaint");
  const stars = document.querySelectorAll(".star");

  const { stallId, returnUrl } = getParams();

  // Star Rating UI Logic
  if (stars.length > 0) {
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const val = parseInt(star.getAttribute("data-value"));
        if (ratingHidden) ratingHidden.value = val;
        updateStars(val);
      });
    });
  }

  function updateStars(rating) {
    stars.forEach(star => {
      const starVal = parseInt(star.getAttribute("data-value"));
      star.classList.toggle("active", starVal <= rating);
    });
  }

  // Close Button Logic
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (returnUrl) window.location.href = returnUrl;
      else window.history.back();
    });
  }

  if (!submitBtn) return;

  // The BED-2 Express POST Logic
  submitBtn.addEventListener("click", async () => {
    const comment = (commentBox?.value || "").trim();
    const rating = Number(ratingHidden?.value || 0);

    // 1. Frontend Validation
    if (!stallId) {
      alert("Missing stall id. Please go back and try again.");
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      alert("Please select a rating (1–5 stars).");
      return;
    }

    // 2. Auth Check (BED-2 requires the user to be logged in)
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to leave a review.");
      return;
    }

    // 3. Build exact payload for Joi validation (ignoring Name and Photo)
    const payload = {
      stall_id: parseInt(stallId, 10),
      rating: rating,
      comment: comment
    };

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Posting...";

      // 4. Send to your Express API
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (response.ok || response.status === 201) {
        alert("Review posted successfully!");
        if (returnUrl) window.location.href = returnUrl;
        else window.history.back();
      } else {
        // Log the exact error coming from Joi or SQL (e.g., 400 Bad Request)
        console.error("Backend Error:", responseData);
        alert(`Failed: ${responseData.message || "Invalid data submitted"}`);
      }
    } catch (err) {
      console.error("Network/Server Error:", err);
      alert("Failed to connect to the server.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post Review";
    }
  });
});