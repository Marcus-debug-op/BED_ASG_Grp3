document.addEventListener("DOMContentLoaded", () => {
    const emailField = document.getElementById("email");
    const submitBtn = document.getElementById("submitBtn");
    const formMsg = document.getElementById("formMsg");

    function showMsg(text, isError) {
        formMsg.textContent = text;
        formMsg.classList.toggle("is-error", !!isError);
    }

    async function submitRequest() {
        const email = emailField.value.trim();

        if (!email) {
            showMsg("Please enter your email address.", true);
            return;
        }

        submitBtn.disabled = true;
        showMsg("Sending...", false);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                const details = Array.isArray(data.errors) ? ` (${data.errors.join(", ")})` : "";
                throw new Error((data.message || "Unable to process your request.") + details);
            }

            // Backend always returns this same generic message whether or not
            // the email exists - see passwordResetController.js for why.
            showMsg(data.message, false);
        } catch (error) {
            console.error("Forgot password request failed:", error);
            showMsg(error.message || "Something went wrong. Please try again.", true);
        } finally {
            submitBtn.disabled = false;
        }
    }

    submitBtn.addEventListener("click", submitRequest);

    emailField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitRequest();
    });
});
