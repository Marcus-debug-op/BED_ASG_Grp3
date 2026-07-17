const token = localStorage.getItem("token");
const savedUser = localStorage.getItem("user");

const form = document.getElementById("editVendorProfileForm");
const message = document.getElementById("message");

if (!token || !savedUser) {
  window.location.href = "/auth/SignInVendor.html";
} else {
  const user = JSON.parse(savedUser);

  if (user.role !== "vendor") {
    window.location.href = "/index.html";
  } else {
    loadProfile();
  }
}



function validateSingaporePhone(phoneNumber) {
  const cleanedPhone = phoneNumber.trim();

  if (!/^\d+$/.test(cleanedPhone)) {
    return "Phone number must contain numbers only.";
  }

  if (!/^[689]\d{7}$/.test(cleanedPhone)) {
    return "Phone number must be 8 digits and start with 6, 8, or 9.";
  }

  return null;
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
  const phoneError = validateSingaporePhone(updatedProfile.phone_number);

  if (phoneError) {
    message.textContent = phoneError;
    message.style.color = "red";
    return;
  }

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
      window.location.href = "/profile/VendorProfile.html";
    }, 1000);

  } catch (error) {
    console.error("Update vendor profile error:", error);
    message.textContent = "Unable to connect to server.";
    message.style.color = "red";
  }
});