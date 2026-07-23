document.addEventListener("DOMContentLoaded", () => {
    const newPasswordField = document.getElementById("newPassword");
    const confirmPasswordField = document.getElementById("confirmPassword");
    const submitBtn = document.getElementById("submitBtn");
    const formMsg = document.getElementById("formMsg");

    const token = new URLSearchParams(window.location.search).get("token");

    function showMsg(text, isError) {
        formMsg.textContent = text;
        formMsg.classList.toggle("is-error", !!isError);
    }

    if (!token) {
        showMsg("This reset link is missing its token. Please use the link from your email.", true);
        submitBtn.disabled = true;
    }

    async function submitReset() {
        const newPassword = newPasswordField.value;
        const confirmPassword = confirmPasswordField.value;

        if (!newPassword || !confirmPassword) {
            showMsg("Please fill in both password fields.", true);
            return;
        }

        if (newPassword !== confirmPassword) {
            showMsg("Passwords do not match.", true);
            return;
        }

        submitBtn.disabled = true;
        showMsg("Resetting...", false);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                const details = Array.isArray(data.errors) ? ` (${data.errors.join(", ")})` : "";
                throw new Error((data.message || "Unable to reset password.") + details);
            }

            showMsg(`${data.message} Redirecting to sign in...`, false);
            setTimeout(() => {
    window.location.href = data.role === "vendor"
        ? "SignInVendor.html"
        : "SigninPatron.html";
        }, 2000);
        } catch (error) {
            console.error("Reset password failed:", error);
            showMsg(error.message || "Something went wrong. Please try again.", true);
            submitBtn.disabled = false;
        }
    }

    submitBtn.addEventListener("click", submitReset);

    confirmPasswordField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitReset();
    });
});
