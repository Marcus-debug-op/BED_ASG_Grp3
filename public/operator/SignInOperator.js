// Operator sign-in. Two-step flow: password step, then OTP step.
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const submitBtn = document.getElementById("submitBtn");

  const passwordFields = document.getElementById("password-fields");
  const otpStep = document.getElementById("otp-step");
  const otpEl = document.getElementById("otp");
  const otpBtn = document.getElementById("otpSubmitBtn");
  const devOtpHint = document.getElementById("dev-otp-hint");

  if (!emailEl || !passwordEl || !submitBtn) return;

  // Step 1: email + password -> triggers OTP, does not log the user in yet.
  submitBtn.addEventListener("click", handleLogin);
  passwordEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLogin();
  });

  async function handleLogin() {
    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    setLoading(submitBtn, true, "Sign In");

    try {
      const response = await fetch("/api/auth/login/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Login failed.");
        setLoading(submitBtn, false, "Sign In");
        return;
      }

      if (!data.mfaRequired || !data.pendingToken) {
        alert("Unexpected login response. Please try again.");
        setLoading(submitBtn, false, "Sign In");
        return;
      }

      sessionStorage.setItem("pendingToken", data.pendingToken);

      // Dev-only convenience so this can be demoed without a real mailbox.
      // Remove this block once real email delivery is wired up for production.
      if (data.devOtp && devOtpHint) {
        devOtpHint.textContent = `[DEV ONLY] Your OTP is: ${data.devOtp}`;
        devOtpHint.style.display = "block";
      }

      if (passwordFields) passwordFields.style.display = "none";
      if (otpStep) otpStep.style.display = "block";
      otpEl?.focus();
    } catch (err) {
      console.error("Operator login error:", err);
      alert("Unable to connect to the server.");
      setLoading(submitBtn, false, "Sign In");
    }
  }

  // Step 2: OTP -> only now is the user actually logged in.
  if (otpBtn) {
    otpBtn.addEventListener("click", handleVerifyOtp);
    otpEl?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleVerifyOtp();
    });
  }

  async function handleVerifyOtp() {
    const otp = otpEl.value.trim();
    const pendingToken = sessionStorage.getItem("pendingToken");

    if (!otp) {
      alert("Please enter the OTP.");
      return;
    }

    if (!pendingToken) {
      alert("Your login session expired. Please sign in again.");
      if (passwordFields) passwordFields.style.display = "block";
      if (otpStep) otpStep.style.display = "none";
      return;
    }

    setLoading(otpBtn, true, "Verify & Sign In");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "OTP verification failed.");
        setLoading(otpBtn, false, "Verify & Sign In");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.removeItem("pendingToken");

      window.location.href = "/operator/operator.html";
    } catch (err) {
      console.error("OTP verification error:", err);
      alert("Unable to connect to the server.");
      setLoading(otpBtn, false, "Verify & Sign In");
    }
  }

  function setLoading(btn, isLoading, restingLabel) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.style.opacity = isLoading ? "0.7" : "1";
    btn.textContent = isLoading ? "Please wait..." : restingLabel;
  }
});