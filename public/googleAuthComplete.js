// Runs on index.html after Google OAuth redirects back with either
// ?token=... (success) or ?error=... (cancelled / failed) in the URL.
(function () {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    function cleanUrl() {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) {
        const messages = {
            google_auth_init_failed: "Could not start Google sign-in. Please try again.",
            google_auth_cancelled: "Google sign-in was cancelled.",
            google_auth_invalid_state: "Your Google sign-in session expired. Please try again.",
            google_auth_no_email: "Your Google account has no email address on file.",
            google_auth_wrong_role: "This Google account is already registered under a different role. Please use that role's sign-in page instead.",
            google_auth_failed: "Google sign-in failed. Please try again."
        };

        alert(messages[error] || "Google sign-in failed. Please try again.");
        cleanUrl();
        return;
    }

    if (!token) return;

    (async () => {
        try {
            const response = await fetch("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to complete Google sign-in.");
            }

            // /api/auth/me returns the raw JWT payload (sub/email/full_name/role).
            // The rest of the app expects localStorage "user" to have user_id, so map it here.
            const user = {
                user_id: data.user.sub,
                full_name: data.user.full_name,
                email: data.user.email,
                role: data.user.role
            };

            localStorage.setItem("token", token);
            localStorage.setItem("role", user.role);
            localStorage.setItem("user", JSON.stringify(user));
        } catch (err) {
            console.error("Google sign-in completion failed:", err);
            alert("Google sign-in failed. Please try again.");
        } finally {
            cleanUrl();
        }
    })();
})();
