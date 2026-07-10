const token = localStorage.getItem("token");
const savedUser = localStorage.getItem("user");

const form = document.getElementById("editVendorProfileForm");
const message = document.getElementById("message");

if (!token || !savedUser) {
  window.location.href = "SignInVendor.html";
} else {
  const user = JSON.parse(savedUser);

  if (user.role !== "vendor") {
    window.location.href = "index.html";
  } else {
    loadProfile();
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

    document.getElementById("full_name").value = profile.full_name || "";
    document.getElementById("email").value = profile.email || "";
    document.getElementById("phone_number").value = profile.phone_number || "";

  } catch (error) {
    console.error("Load vendor profile error:", error);
    message.textContent = "Unable to load profile.";
    message.style.color = "red";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const updatedProfile = {
    full_name: document.getElementById("full_name").value.trim(),
    phone_number: document.getElementById("phone_number").value.trim()
  };

  try {
    const response = await fetch("/api/profile/my-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updatedProfile)
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.message || "Unable to update profile.";
      message.style.color = "red";
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.user));

    message.textContent = "Profile updated successfully.";
    message.style.color = "green";

    setTimeout(() => {
      window.location.href = "VendorProfile.html";
    }, 1000);

  } catch (error) {
    console.error("Update vendor profile error:", error);
    message.textContent = "Unable to connect to server.";
    message.style.color = "red";
  }
});