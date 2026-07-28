const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

// Role guard: only logged-in operators can access any operator page.
// This runs on all 5 pages since they all load this same script.
if (!token || role !== "operator") {
  window.location.replace("/operator/SignInOperator.html");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD"
  }).format(Number(value || 0));
}

function loadOperatorInfo() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setText("operator-email", user.email || "Operator account");
  } catch {
    setText("operator-email", "Operator account");
  }
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  localStorage.removeItem("hawkerhub_auth");

  window.location.href = "/operator/SignInOperator.html";
});

loadOperatorInfo();

// ===========================
// Dashboard-only logic below
// ===========================
// Everything past this point only runs on operator.html itself - the other
// 4 pages (Stall Management, Rental & Lease, Complaints, Hygiene Grades)
// don't have these elements, so this whole block quietly does nothing
// there instead of throwing errors on missing elements.

const dashboardMessage = document.getElementById("dashboard-message");

if (dashboardMessage) {

  let revenueChart = null;

  function setupRevenueChart() {
    const canvas = document.getElementById("revenueTrendChart");
    if (!canvas || typeof Chart === "undefined") return null;

    return new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          label: "Centre Revenue",
          data: [],
          borderColor: "#f97316",
          backgroundColor: "rgba(249,115,22,0.15)",
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Display the latest hygiene grade summary from completed NEA inspections.
  function renderHygieneGrades(grades) {
    const body = document.getElementById("hygiene-grades");
    if (!body) return;

    if (!grades.length) {
      body.innerHTML =
        '<tr><td colspan="2" class="text-muted-center">No completed inspections yet.</td></tr>';
      return;
    }

    body.innerHTML = grades.map(({ grade, stallCount }) => `
      <tr>
        <td><span class="badge badge-success">Grade ${grade}</span></td>
        <td>${stallCount}</td>
      </tr>
    `).join("");
  }

  // Load live centre-wide metrics from the backend instead of using hard-coded values.
  async function loadDashboard() {
    try {
      const response = await fetch("/api/operator/dashboard/metrics", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load dashboard metrics.");
      }

      setText("total-revenue", formatCurrency(data.financialMetrics.totalRevenue));
      setText("active-stalls", data.stallMetrics.activeStalls);
      setText("total-stalls", data.stallMetrics.totalStalls);
      setText("total-orders", data.financialMetrics.totalOrders);
      setText("completed-orders", data.financialMetrics.completedOrders);
      setText("pending-complaints", data.complaintMetrics.pendingComplaints);

      renderHygieneGrades(data.hygieneMetrics.grades);

      if (revenueChart && Array.isArray(data.revenueTrend)) {
        revenueChart.data.datasets[0].data = data.revenueTrend.map(Number);
        revenueChart.update();
      }

      dashboardMessage.textContent = "Dashboard updated successfully.";
      dashboardMessage.classList.add("is-success");
      dashboardMessage.classList.remove("is-error");
    } catch (error) {
      console.error("Operator dashboard error:", error);
      dashboardMessage.textContent = error.message;
      dashboardMessage.classList.add("is-error");
      dashboardMessage.classList.remove("is-success");
    }
  }

  revenueChart = setupRevenueChart();
  loadDashboard();
  setInterval(loadDashboard, 30000);
}
