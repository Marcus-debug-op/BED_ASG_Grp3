const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

if (!token) {
  window.location.href = "/auth/signup.html";
} else {
  loadProfile();
}

async function loadProfile() {
  try {
    const response = await fetch("/api/profile/my-profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const profile = await response.json();

    if (!response.ok) {
      throw new Error(profile.message || "Unable to load profile.");
    }

    document.getElementById("profileName").textContent =
      profile.full_name || "-";

    document.getElementById("profileEmail").textContent =
      profile.email || "-";

    document.getElementById("profilePhone").textContent =
      profile.phone_number || "-";

    const DEFAULT_PROFILE_IMAGE = "/img/avatars/default-profile.png";

    const profileImage = document.getElementById("profileImage");

    profileImage.src = profile.profile_image_url || DEFAULT_PROFILE_IMAGE;

    profileImage.onerror = () => {
      profileImage.src = DEFAULT_PROFILE_IMAGE;
    };

  } catch (error) {
    console.error("Profile loading failed:", error);
    // Keep this commented while debugging so the page does not suddenly redirect
    // window.location.href = "signup.html";
  }
}

const fileInput = document.getElementById("profileImageFileInput");
const updateProfileImageBtn = document.getElementById("updateProfileImageBtn");
const profileImage = document.getElementById("profileImage");

let selectedProfileImageFile = null;
let originalProfileImageSrc = profileImage ? profileImage.src : "";

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      fileInput.value = "";
      return;
    }

    selectedProfileImageFile = file;

    const previewUrl = URL.createObjectURL(file);

    if (profileImage) {
      profileImage.src = previewUrl;
    }

    if (updateProfileImageBtn) {
      updateProfileImageBtn.style.display = "block";
    }
  });
}

if (updateProfileImageBtn) {
  updateProfileImageBtn.addEventListener("click", async () => {
    if (!selectedProfileImageFile) {
      alert("Please choose an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", selectedProfileImageFile);

    updateProfileImageBtn.disabled = true;
    updateProfileImageBtn.textContent = "Saving...";

    try {
      const response = await fetch("/api/profile/profile-picture-upload", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      //if token = expired --> sign up page
      if (response.status === 401 || response.status === 403) {
        alert("Your session has expired. Please log in again.");
        localStorage.clear();
        window.location.href = "/auth/signup.html";
        return;
      }

      if (!response.ok) {
        alert(data.message || "Unable to upload profile picture.");

        if (profileImage) {
          profileImage.src = originalProfileImageSrc;
        }

        return;
      }

      if (profileImage) {
        profileImage.src = data.profile_image_url;
        originalProfileImageSrc = data.profile_image_url;
      }

      selectedProfileImageFile = null;
      fileInput.value = "";
      updateProfileImageBtn.style.display = "none";

      alert("Profile picture updated successfully.");
    } catch (error) {
      console.error("Upload profile picture error:", error);
      alert("Unable to connect to the server.");

      if (profileImage) {
        profileImage.src = originalProfileImageSrc;
      }
    } finally {
      updateProfileImageBtn.disabled = false;
      updateProfileImageBtn.textContent = "Save Profile Picture";
    }
  });
}

const logoutBtn = document.querySelector(".logout-btn");

function clearLoginSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  localStorage.removeItem("hawkerhub_auth");
  localStorage.removeItem("cart");
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (window.showLogoutModal) {
      window.showLogoutModal();
    } else {
      const confirmLogout = confirm("Log out?");
      if (!confirmLogout) return;

      clearLoginSession();
      window.location.href = "/index.html";
    }
  });
}

const accountSettingsBtn = document.getElementById("accountSettingsBtn");
const dangerZone = document.getElementById("dangerZone");

if (accountSettingsBtn && dangerZone) {
  accountSettingsBtn.addEventListener("click", () => {
    dangerZone.classList.toggle("hidden");
  });
}

const deactivateAccountBtn = document.getElementById("deactivateAccountBtn");

if (deactivateAccountBtn) {
  deactivateAccountBtn.addEventListener("click", async () => {
    const typedConfirmation = prompt(
      "To confirm account deactivation, type DEACTIVATE below:"
    );

    if (typedConfirmation !== "DEACTIVATE") {
      alert("Account deactivation cancelled.");
      return;
    }

    try {
      const response = await fetch("/api/account/deactivate", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to deactivate account.");
        return;
      }

      alert("Your account has been deactivated successfully.");

      clearLoginSession();
      window.location.href = "/index.html";
    } catch (error) {
      console.error("Deactivate account error:", error);
      alert("Unable to connect to server.");
    }
  });
}

const discountContainer = document.getElementById("discount-container");

if (discountContainer) {
  loadAvailableDiscounts();
}

async function loadAvailableDiscounts() {
  try {
    const response = await fetch("/api/promotions/available", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      discountContainer.innerHTML = "<p class='loading-text'>Unable to load discounts right now.</p>";
      return;
    }

    const promotions = await response.json();

    if (!promotions.length) {
      discountContainer.innerHTML = "<p class='loading-text'>No discount codes available right now.</p>";
      return;
    }

    discountContainer.innerHTML = promotions.map(renderDiscountCard).join("");
  } catch (error) {
    console.error("Error loading available discounts:", error);
    discountContainer.innerHTML = "<p class='loading-text'>Unable to load discounts right now.</p>";
  }
}

function renderDiscountCard(promo) {
  const minSpendText = promo.min_spend_amount
    ? `Min. spend $${Number(promo.min_spend_amount).toFixed(2)}`
    : "No minimum spend";

  const expiryText = new Date(promo.end_date).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return `
    <div class="discount-card">
      <div class="discount-code">${escapeHtml(promo.promo_code)}</div>
      <div class="discount-stall">${escapeHtml(promo.stall_name)}</div>
      <div class="discount-percent">${Number(promo.discount_percent)}% off</div>
      <div class="discount-meta">${minSpendText} · Valid till ${expiryText}</div>
      ${promo.description ? `<div class="discount-description">${escapeHtml(promo.description)}</div>` : ""}
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}