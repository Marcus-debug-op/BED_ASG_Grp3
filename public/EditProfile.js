const token = localStorage.getItem("token");
const savedUser = localStorage.getItem("user");

if (!token || !savedUser) {
  window.location.href = "signup.html";
} else {
  const user = JSON.parse(savedUser);

  document.getElementById("full_name").value = user.full_name || "";
  document.getElementById("email").value = user.email || "";
  document.getElementById("phone_number").value = user.phone_number || "";
}

const form = document.getElementById("editProfileForm");
const message = document.getElementById("message");

if (form) {
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
        if (message) {
          message.textContent = data.message || "Unable to update profile.";
          message.style.color = "red";
        }
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      if (message) {
        message.textContent = "Profile updated successfully.";
        message.style.color = "green";
      }

      setTimeout(() => {
        window.location.href = "PatronProfile.html";
      }, 1000);

    } catch (error) {
      console.error("Update profile error:", error);

      if (message) {
        message.textContent = "Unable to connect to server.";
        message.style.color = "red";
      }
    }
  });
}