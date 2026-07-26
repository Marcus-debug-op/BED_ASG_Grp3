const token = localStorage.getItem("token");
const role = localStorage.getItem("role");


// Role guard: only logged-in operators can access this dashboard.
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
  if (!token || role !== "operator") return;

  const message = document.getElementById("dashboard-message");

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
    setText("active-agreements", data.rentalMetrics.activeAgreements);
    setText("expiring-leases", data.rentalMetrics.expiringLeases);

    setText(
      "rental-status",
      data.rentalMetrics.rentalDataAvailable
        ? "Rental data is live."
        : "Run migration 011 to enable rental metrics."
    );

    renderHygieneGrades(data.hygieneMetrics.grades);

    message.textContent = "Dashboard updated successfully.";
    message.classList.add("is-success");
  } catch (error) {
    console.error("Operator dashboard error:", error);
    message.textContent = error.message;
    message.classList.add("is-error");
  }
}

function loadOperatorInfo() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setText("operator-email", user.email || "Operator account");
  } catch {
    setText("operator-email", "Operator account");
  }
}

// Sidebar navigation scrolls to the matching dashboard section.
function setupOperatorNavigation() {
  const navButtons = document.querySelectorAll(".nav-item[data-target]");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      const section = document.getElementById(`section-${target}`);

      navButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  localStorage.removeItem("hawkerhub_auth");

  window.location.href = "/operator/SignInOperator.html";
});

setupOperatorNavigation();
loadOperatorInfo();
loadDashboard();
setInterval(loadDashboard, 30000);