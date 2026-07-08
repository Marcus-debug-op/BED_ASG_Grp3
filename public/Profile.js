const savedUser = localStorage.getItem("user");
const token = localStorage.getItem("token");

if (!token || !savedUser) {
  window.location.href = "signup.html";
} else {
  const user = JSON.parse(savedUser);

  document.getElementById("profileName").textContent =
    user.full_name || "Patron";

  document.getElementById("profileEmail").textContent =
    user.email || "-";

  
  document.getElementById("profilePhone").textContent =
  user.phone_number || "-"; // Marcus added this to for the profile details in profile page - 7/7 
  
  const logoutBtn = document.querySelector(".logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");

      window.location.href = "index.html";
    });
  }

  const discountContainer = document.getElementById("discount-container");

  if (discountContainer) {
    discountContainer.innerHTML =
      "<p>Discount codes will be loaded from the backend soon.</p>";
  }
}