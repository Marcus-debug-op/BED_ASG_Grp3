document.addEventListener("DOMContentLoaded", () => {

    // ===========================
    // Authentication
    // ===========================
    // Every vendor page checks these three things the same way: a JWT must
    // exist, the role stored alongside it must be "vendor", and the user's
    // profile info (name, email) is cached here so we don't have to fetch it
    // again just to show a greeting.

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
    // Purely cosmetic - picks a time-of-day message based on the vendor's
    // own device clock. No backend involved.

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
    // Comes from the cached "user" object in localStorage (set at login),
    // not a fresh API call - just displaying what we already have.

    if (user) {

        document.getElementById("vendorName").textContent =
            user.full_name;

    }

    // ===========================
    // Empty Revenue Chart
    // ===========================
    // Sets up the Chart.js line chart with no data yet (data: []). The real
    // numbers get plugged in later, inside loadDashboard() below, once the
    // API response comes back - this block just builds the empty shell so
    // the chart renders immediately instead of waiting on the network.

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

    // ===========================
    // Dashboard summary cards
    // ===========================
    // Everything below this point talks to GET /api/vendor/dashboard, which
    // is a real SQL-backed endpoint (Models/vendorDashboardModel.js) - it
    // aggregates today's revenue/orders, pending order count, average
    // rating, recent orders, weekly revenue-by-day, and top selling dishes
    // straight from the Orders/OrderItems/Feedbacks/Stalls tables. Nothing
    // here is hardcoded or fabricated - if the DB has no data yet, the
    // numbers are genuinely 0 and the tables/lists show their own
    // "no data yet" empty states instead of made-up placeholder content.

   const monthSelect = document.getElementById("dashboardMonth");
const yearSelect = document.getElementById("dashboardYear");

const currentDate = new Date();

monthSelect.value = currentDate.getMonth() + 1;

for (let year = currentDate.getFullYear(); year >= currentDate.getFullYear() - 5; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
}

yearSelect.value = currentDate.getFullYear();

    // Wrapped in its own named function (instead of a one-off fetch) so it
    // can be called both immediately on page load AND again on a timer
    // below - that's what keeps the dashboard updating on its own without
    // the vendor having to manually refresh the page.
    function loadDashboard() {
        fetch(
    `/api/vendor/dashboard?month=${monthSelect.value}&year=${yearSelect.value}`,
    {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    // Covers BED-73's validation errors (e.g. future month
                    // requested) the same way as a network failure below -
                    // one friendly-message path for any kind of API error.
                    throw new Error(data.message || "Unable to load dashboard data.");
                }
                return data;
            })
            .then((data) => {
                // The 4 top summary cards.
                document.getElementById("todayRevenue").textContent = `$${data.todayRevenue}`;
                document.getElementById("todayOrders").textContent = data.todayOrders;
                document.getElementById("pendingOrders").textContent = data.pendingOrders;
                const ratingElement = document.getElementById("averageRating");
                if (
                        data.averageRating === null ||
                        data.averageRating === undefined ||
                        Number(data.averageRating) === 0
                    ) {
                        ratingElement.textContent = "No ratings yet";
                    } else {
                        ratingElement.textContent = data.averageRating;
                    }

                // Always call these (even with an empty array) rather than only
                // calling them "if there's data" - both render functions already
                // know how to show their own empty state, so this keeps the UI
                // correct whether the vendor has 0 orders or 50.
                renderRecentOrders(Array.isArray(data.recentOrders) ? data.recentOrders : []);
                renderTopDishes(Array.isArray(data.topSellingDishes) ? data.topSellingDishes : []);

                if (Array.isArray(data.weeklyRevenue) && data.weeklyRevenue.length) {
                    const weeklyRevenue = data.weeklyRevenue.map(Number);
                    const hasRevenue = weeklyRevenue.some((amount) => amount > 0);

                    // Always plot the real numbers - including real zeros. No fake
                    // fallback data; the empty-state message (not fabricated
                    // numbers) is what tells the vendor there's nothing yet.
                    revenueChart.data.datasets[0].data = weeklyRevenue;
                    revenueChart.update();
                    setRevenueEmptyState(hasRevenue);
                }
            })
            .catch((error) => {
    console.error("Error loading dashboard metrics:", error);

    document.getElementById("todayRevenue").textContent = "--";
    document.getElementById("todayOrders").textContent = "--";
    document.getElementById("pendingOrders").textContent = "--";
    document.getElementById("averageRating").textContent = "--";

    // A friendly inline message instead of a blank screen - deliberately
    // not a blocking alert() popup, which is disruptive rather than graceful.
    document.getElementById("ordersBody").innerHTML = `
        <tr>
            <td colspan="3">${error.message || "No sales data available for this period."}</td>
        </tr>
    `;
});
    }

    // Load once immediately so the vendor isn't staring at a blank
    // dashboard, then keep polling every 30 seconds so new orders,
    // status changes, or new reviews show up on their own - matches
    // the same auto-refresh pattern used on the operator dashboard.
    loadDashboard();

monthSelect.addEventListener("change", loadDashboard);
yearSelect.addEventListener("change", loadDashboard);

setInterval(loadDashboard, 30000);

    // Builds the "Recent Orders" table rows from scratch each time it's
    // called. Clears whatever was there before (replaceChildren) so old
    // rows never linger after a refresh.
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
            // e.g. order_status "Pending" -> CSS class "status-pending", so the
            // badge color is driven by whatever status the backend actually sent.
            statusBadge.className = `order-status status-${String(order.order_status).toLowerCase()}`;
            statusBadge.textContent = order.order_status;
            status.appendChild(statusBadge);
            row.append(orderId, customer, status);
            ordersBody.appendChild(row);
        });
    }

    // Builds the "Top Selling Dishes" list. A bit more defensive than the
    // other render functions because it also has to find (or create) the
    // <ol> list itself - some earlier versions of the HTML didn't have a
    // dedicated #topDishesList element, so this falls back to building one
    // on the fly inside whichever .panel contains the "Top Selling Dishes"
    // heading, keeping this working even if only this JS file gets updated
    // without a matching HTML change.
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

    // Toggles the little "no revenue data yet" overlay on the chart panel.
    // hasData = true hides it (real numbers are on screen); hasData = false
    // shows it (every day this week was $0, so say so instead of showing a
    // flat empty-looking line with no explanation).
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
    // Clears every piece of this vendor's session state from localStorage,
    // then sends them back to the signup/landing page. Guarded with
    // "if (logoutBtn)" in case this script ever runs on a page that
    // doesn't have a logout button in its HTML.

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("hawkerhub_auth");
        localStorage.removeItem("cart");

        window.location.href = "/auth/signup.html";
    });
    }

});
