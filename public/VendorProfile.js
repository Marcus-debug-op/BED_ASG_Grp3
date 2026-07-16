const token = localStorage.getItem("token");
const savedUser = localStorage.getItem("user");

console.log("VendorProfile.js loaded"); 

if (!token || !savedUser) {
  window.location.href = "SignInVendor.html";
} else {
  const user = JSON.parse(savedUser);

  if (user.role !== "vendor") {
    window.location.href = "index.html";
  } else {
    loadProfile();
    loadVendorStalls();
  }
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

    const DEFAULT_PROFILE_IMAGE = "img/avatars/default-profile.png";

    const profileImage = document.getElementById("profileImage");

    profileImage.src = profile.profile_image_url || DEFAULT_PROFILE_IMAGE;

    profileImage.onerror = () => {
      profileImage.src = DEFAULT_PROFILE_IMAGE;
    };

  } catch (error) {
    console.error("Vendor profile loading failed:", error);
  }
}


async function loadVendorStalls() {
  console.log("Loading vendor stalls...");

  const totalStalls = document.getElementById("totalStalls");
  const mainHawkerCentre = document.getElementById("mainHawkerCentre");
  const vendorStallsList = document.getElementById("vendorStallsList");

  try {
    const response = await fetch("/api/vendor/my-stalls", {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Vendor stalls response status:", response.status);

    const stalls = await response.json();
    console.log("Vendor stalls data:", stalls);

    if (!response.ok) {
      vendorStallsList.innerHTML = `<p>${stalls.message || "Unable to load stall details."}</p>`;
      return;
    }

    totalStalls.textContent = stalls.length;

    if (stalls.length === 0) {
      mainHawkerCentre.textContent = "-";
      vendorStallsList.innerHTML = "<p>No stalls linked to this vendor.</p>";
      return;
    }

    mainHawkerCentre.textContent = stalls[0].centre_name || "-";

    vendorStallsList.innerHTML = stalls.map(stall => {
      return `
        <div class="vendor-stall-card">
          <h4>${stall.stall_name}</h4>
          <p><strong>Hawker Centre:</strong> ${stall.centre_name || "-"}</p>
          <p><strong>Cuisine:</strong> ${stall.cuisine_type || "-"}</p>
          <p><strong>Unit:</strong> ${stall.unit_number || "-"}</p>
          <p><strong>Status:</strong> ${stall.is_active ? "Active" : "Inactive"}</p>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Load vendor stalls error:", error);
    vendorStallsList.innerHTML = "<p>Unable to connect to server.</p>";
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

    if (!file) return;

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

      if (response.status === 401 || response.status === 403) {
        alert("Your session has expired. Please log in again.");
        localStorage.clear();
        window.location.href = "SignInVendor.html";
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
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    window.location.href = "index.html";
  });
}