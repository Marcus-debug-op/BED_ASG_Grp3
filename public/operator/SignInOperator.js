document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const submitBtn = document.getElementById("submitBtn");

  if (!emailEl || !passwordEl || !submitBtn) return;

  async function signIn() {
    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing In...";

    try {
      const response = await fetch("/api/auth/login/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to sign in.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.location.href = "/operator/operator.html";
    } catch (error) {
      console.error("Operator login error:", error);
      alert("Unable to connect to the server.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  }

  submitBtn.addEventListener("click", signIn);

  passwordEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") signIn();
  });
});