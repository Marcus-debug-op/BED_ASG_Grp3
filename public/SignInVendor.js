document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.querySelector(".submit");

  if (!emailEl || !passEl || !btn) return;

  btn.addEventListener("click", async () => {
    const email = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/auth/login/vendor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      console.log("Status:", response.status);

      const data = await response.json();

      console.log("Response:", data);

      if (response.ok) {
        console.log("Login successful");
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);

        console.log("Redirecting...");

        window.location.href = "VendorStallDetails.html";
      } else {
        alert(data.message);
      }

    } catch (err) {
      console.error("Vendor login error:", err);
    }
  });
});