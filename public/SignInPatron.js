console.log("SignInPatron.js loaded");
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.getElementById("submitBtn");

  if (!emailEl || !passEl || !btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/auth/login/patron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.location.href = "index.html";

    } catch (err) {
      console.error(err);
      alert("Unable to connect to the server.");
    }
  });
});