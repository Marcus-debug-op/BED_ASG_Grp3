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

    const revenueChart = new Chart(ctx, {

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

    // Show a useful dashboard immediately. Live API data below replaces these
    // values once it is available; this also keeps the page presentable when
    // the database has not been populated yet.
    const demoRecentOrders = [
        { order_id: 1042, customer_name: "Aisha Rahman", order_status: "Preparing" },
        { order_id: 1041, customer_name: "Marcus Lim", order_status: "Ready" },
        { order_id: 1040, customer_name: "Siti Nur", order_status: "Completed" },
        { order_id: 1039, customer_name: "Daniel Tan", order_status: "Pending" }
    ];
    const demoWeeklyRevenue = [18.5, 26.8, 31.2, 24.6, 38.9, 52.4, 45.7];
    const demoTopSellingDishes = [
        { item_name: "Chicken Rice", total_quantity: 42 },
        { item_name: "Laksa", total_quantity: 35 },
        { item_name: "Char Kway Teow", total_quantity: 28 },
        { item_name: "Fried Hokkien Mee", total_quantity: 21 },
        { item_name: "Teh Tarik", total_quantity: 18 }
    ];

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

            if (Array.isArray(data.recentOrders) && data.recentOrders.length) {
                renderRecentOrders(data.recentOrders);
            }

            if (Array.isArray(data.topSellingDishes) && data.topSellingDishes.length) {
                renderTopDishes(data.topSellingDishes);
            }

            if (Array.isArray(data.weeklyRevenue) && data.weeklyRevenue.length) {
                const hasRevenue = data.weeklyRevenue.some((amount) => Number(amount) > 0);
                revenueChart.data.datasets[0].data = hasRevenue ? data.weeklyRevenue : demoWeeklyRevenue;
                revenueChart.update();
                setRevenueEmptyState(true);
            }
        })
        .catch((error) => {
            console.error("Error loading dashboard metrics:", error);
        });

    function renderRecentOrders(orders) {
        const ordersBody = document.getElementById("ordersBody");
        ordersBody.replaceChildren();

        if (!orders.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 3;
            cell.textContent = "No recent orders.";
            row.appendChild(cell);
            ordersBody.appendChild(row);
            return;
        }

        orders.forEach((order) => {
            const row = document.createElement("tr");
            const orderId = document.createElement("td");
            const customer = document.createElement("td");
            const status = document.createElement("td");
            const statusBadge = document.createElement("span");

            orderId.textContent = `#${order.order_id}`;
            customer.textContent = order.customer_name;
            statusBadge.className = `order-status status-${String(order.order_status).toLowerCase()}`;
            statusBadge.textContent = order.order_status;
            status.appendChild(statusBadge);
            row.append(orderId, customer, status);
            ordersBody.appendChild(row);
        });
    }

    function renderTopDishes(dishes) {
        const panel = [...document.querySelectorAll(".panel")].find((element) =>
            element.querySelector("h2")?.textContent.trim() === "Top Selling Dishes"
        );
        let list = document.getElementById("topDishesList");
        const emptyState = document.getElementById("dishesEmptyState") || panel?.querySelector(".empty-state");

        // Supports the original HTML too, so this feature works even if only
        // the JavaScript and CSS files are replaced.
        if (!list && panel) {
            list = document.createElement("ol");
            list.id = "topDishesList";
            list.className = "top-dishes-list";
            panel.insertBefore(list, emptyState || null);
        }

        if (!list) return;
        list.replaceChildren();
        if (emptyState) {
            emptyState.hidden = dishes.length > 0;
            emptyState.style.display = dishes.length > 0 ? "none" : "";
        }

        dishes.forEach((dish, index) => {
            const item = document.createElement("li");
            const name = document.createElement("span");
            const sales = document.createElement("span");

            item.className = "top-dish-item";
            name.textContent = `${index + 1}. ${dish.item_name}`;
            sales.textContent = `${dish.total_quantity} sold`;
            sales.className = "dish-sales";
            item.append(name, sales);
            list.appendChild(item);
        });
    }

    function setRevenueEmptyState(hasData) {
        const chartPanel = document.getElementById("revenueChart")?.closest(".panel");
        const emptyState = document.getElementById("revenueEmptyState") || chartPanel?.querySelector(".empty-state");
        if (emptyState) {
            emptyState.hidden = hasData;
            emptyState.style.display = hasData ? "none" : "";
        }
    }

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
