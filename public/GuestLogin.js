console.log("GuestLogin loaded");

document.addEventListener("DOMContentLoaded", () => {
    const guestBtn = document.getElementById("guestBtn");
    console.log("Button found:", guestBtn);

    if (!guestBtn) return;

    guestBtn.addEventListener("click", async () => {
        console.log("Guest clicked");

        try {
            const response = await fetch("http://localhost:3000/api/auth/guest", {
                method: "POST"
            });

            const data = await response.json();
            console.log(data);

            if (response.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", "guest");

                window.location.href = "index.html";
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error(error);
        }
    });
});