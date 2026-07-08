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