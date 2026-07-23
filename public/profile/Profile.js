const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

const operatorDashboardLink = document.getElementById("operatorDashboardLink");

if (operatorDashboardLink && role === "operator") {
  operatorDashboardLink.hidden = false;
}

const token = localStorage.getItem("token");

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

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (window.showLogoutModal) {
      window.showLogoutModal();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
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
        method: "PATCH",
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

      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");

      window.location.href = "/index.html";
    } catch (error) {
      console.error("Deactivate account error:", error);
      alert("Unable to connect to server.");
    }
  });
}

const discountContainer = document.getElementById("discount-container");

if (discountContainer) {
  discountContainer.innerHTML =
    "<p>Discount codes will be loaded from the backend soon.</p>";
}