// Removed all Firebase imports

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    stallId: (params.get("id") || params.get("stall") || "").trim(),
    returnUrl: (params.get("return") || "").trim(),
    // BED-92 edit mode: stallFeedback.js's Edit button links here with these
    // three extra params set. editId's presence is what flips this page from
    // "post a new review" (POST) to "update my review" (PUT).
    editId: (params.get("editId") || "").trim(),
    editRating: (params.get("editRating") || "").trim(),
    editComment: params.get("editComment") || ""
  };
}

// See menu.js's isGuestAccount() for why role (not just token) is the check -
// GuestLogin.js sets role="guest" and never writes a "user" record.
function isGuestAccount() {
  return localStorage.getItem("role") === "guest";
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
  const importBtn = document.getElementById("import-btn");
  const fileInput = document.getElementById("real-file-input");

  const { stallId, returnUrl, editId, editRating, editComment } = getParams();

  // BED-132: wire the existing "Add Photo" button (previously dead - it
  // rendered but never did anything) to the hidden file input.
  //
  // feedback.html already ships a properly styled preview area
  // (#photo-preview-wrapper > #image-preview + #remove-photo-btn), so this
  // reuses it rather than injecting its own <img>. An earlier version
  // created a second, unstyled preview next to the button, which rendered
  // full-size and broke the form layout.
  let selectedPhotoFile = null;

  const photoWrapper = document.getElementById("photo-preview-wrapper");
  const imagePreview = document.getElementById("image-preview");
  const removePhotoBtn = document.getElementById("remove-photo-btn");

  function clearSelectedPhoto() {
    selectedPhotoFile = null;
    if (fileInput) fileInput.value = "";
    if (imagePreview) imagePreview.src = "";
    if (photoWrapper) photoWrapper.classList.remove("show");
    if (importBtn) importBtn.textContent = "Add Photo";
  }

  // Hidden until a photo is actually chosen - Forms.css shows the area via
  // the .show class (.photo-preview-area is display:none by default).
  if (photoWrapper) photoWrapper.classList.remove("show");

  if (importBtn && fileInput) {
    importBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      selectedPhotoFile = file;
      importBtn.textContent = `📷 ${file.name}`;

      try {
        const dataUrl = await fileToCompressedDataUrl(file);
        if (imagePreview) imagePreview.src = dataUrl;
        if (photoWrapper) photoWrapper.classList.add("show");
      } catch (err) {
        console.error("Error previewing photo:", err);
      }
    });
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", clearSelectedPhoto);
  }

  // BED-92 edit mode: pre-fill the form with the existing review and relabel
  // the page so it's clear this updates rather than creates a new one.
  if (editId) {
    const heading = document.querySelector(".form-header h2");
    if (heading) heading.textContent = "Edit Your Review";

    if (commentBox && editComment) commentBox.value = editComment;

    if (ratingHidden && editRating) {
      ratingHidden.value = editRating;
      // feedbackrating.js builds the star buttons on its own DOMContentLoaded
      // listener; since script tags run in order and feedbackrating.js is
      // loaded before this file, the buttons already exist by the time we
      // get here, so just paint the correct ones active.
      const ratingNum = Number(editRating);
      document.querySelectorAll("#star-container .rating-star").forEach((star, index) => {
        star.classList.toggle("active", index < ratingNum);
      });
    }

    if (submitBtn) submitBtn.textContent = "Update Review";
  }

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

    // Guests hold a valid token too, but the backend's blockGuests middleware
    // rejects them on both POST /feedback and PUT /feedback/:id - catch it
    // here first so guests get a clear message instead of a failed request.
    if (isGuestAccount()) {
      alert("Guests can't submit or edit reviews. Please sign in as a patron.");
      return;
    }

    // 3. Build the request. Only the create (POST) route accepts a photo
    // (uploadFeedbackImage is only wired into POST /api/feedback) - editing
    // (PUT) stays JSON, unaffected by BED-132.
    const isEdit = Boolean(editId);
    const url = isEdit ? `/api/feedback/${editId}` : "/api/feedback";
    const method = isEdit ? "PUT" : "POST";

    let requestBody;
    let requestHeaders = { Authorization: `Bearer ${token}` };

    if (!isEdit && selectedPhotoFile) {
      const formData = new FormData();
      formData.append("stall_id", parseInt(stallId, 10));
      formData.append("rating", rating);
      formData.append("comment", comment);
      formData.append("image", selectedPhotoFile);
      requestBody = formData;
      // No Content-Type set - the browser fills in the multipart boundary.
    } else {
      requestHeaders["Content-Type"] = "application/json";
      requestBody = JSON.stringify({
        stall_id: parseInt(stallId, 10),
        rating: rating,
        comment: comment
      });
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = isEdit ? "Updating..." : "Posting...";

      // 4. Send to your Express API
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody
      });

      const responseData = await response.json();

      if (response.ok || response.status === 201) {
        alert(isEdit ? "Review updated successfully!" : "Review posted successfully!");
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
      submitBtn.textContent = isEdit ? "Update Review" : "Post Review";
    }
  });
});