document.addEventListener("DOMContentLoaded", () => {

    // ===========================
    // Authentication
    // ===========================

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token || role !== "vendor") {
        alert("Please sign in as a vendor.");
        window.location.href = "SignInVendor.html";
        return;
    }

    // ===========================
    // Greeting
    // ===========================

    const greeting = document.getElementById("greeting");

    const hour = new Date().getHours();

    if (hour < 12) {

        greeting.innerHTML = "☀ Good Morning";

    } else if (hour < 18) {

        greeting.innerHTML = "☀ Good Afternoon";

    } else {

        greeting.innerHTML = "🌙 Good Evening";

    }

    // ===========================
    // Vendor Name
    // ===========================

    if (user) {

        document.getElementById("vendorName").textContent =
            user.full_name;

    }

    // ===========================
    // Empty Revenue Chart
    // ===========================

    const ctx = document
        .getElementById("revenueChart")
        .getContext("2d");

    new Chart(ctx, {

        type: "line",

        data: {

            labels: [
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun"
            ],

            datasets: [

                {

                    label: "Revenue",

                    data: [],

                    borderColor: "#F97316",

                    backgroundColor: "rgba(249,115,22,0.15)",

                    borderWidth: 3,

                    tension: .4,

                    fill: true

                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    display: false

                }

            },

            scales: {

                y: {

                    beginAtZero: true

                }

            }

        }

    });

    // ===========================
    // Dashboard summary cards
    // ===========================

    fetch("/api/vendor/dashboard", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
        .then((res) => res.json())
        .then((data) => {
            document.getElementById("todayRevenue").textContent = `$${data.todayRevenue}`;
            document.getElementById("todayOrders").textContent = data.todayOrders;
            document.getElementById("pendingOrders").textContent = data.pendingOrders;
            document.getElementById("averageRating").textContent = data.averageRating;
        })
        .catch((error) => {
            console.error("Error loading dashboard metrics:", error);
        });

    // ===========================
    // Logout
    // ===========================

    document
        .getElementById("logoutBtn")
        .addEventListener("click", () => {

            localStorage.clear();

            window.location.href = "signup.html";

        });

});