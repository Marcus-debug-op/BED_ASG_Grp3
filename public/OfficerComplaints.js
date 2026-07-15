import { saveSession, getSession, clearSession, authFetch } from "./authStorage.js";

let currentComplaintId = null;
let currentStatusFilter = "";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const logoutBtn = document.getElementById("logoutBtn");

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("statusFilter").addEventListener("change", handleFilterChange);
  document.getElementById("closeDetailBtn").addEventListener("click", closeDetail);
  document.getElementById("updateForm").addEventListener("submit", handleUpdateSubmit);
  logoutBtn.addEventListener("click", handleLogout);

  const session = getSession();

  if (session?.token && (session.user?.role === "officer" || session.user?.role === "operator")) {
    enterDashboard();
  } else {
    showLogin();
  }
});

function updateQueueLabel() {
  const session = getSession();
  const label = document.getElementById("queueLabel");
  if (!session?.user) return;

  label.textContent =
    session.user.role === "officer"
      ? "Showing Hygiene complaints (your queue)"
      : "Showing Service, Food Quality, Overcharging & Other complaints (your queue)";
}

function showLogin() {
  loginView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function enterDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  updateQueueLabel();
  loadComplaints();
}

async function handleLogin(e) {
  e.preventDefault();

  const role = document.getElementById("roleSelect").value;
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const loginBtn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("loginError");

  errorEl.classList.add("hidden");
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing In...";

  try {
    const response = await fetch(`/api/auth/login/${role}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.message || "Unable to sign in.";
      errorEl.classList.remove("hidden");
      return;
    }

    saveSession({ token: data.token, user: data.user });
    enterDashboard();
  } catch (error) {
    console.error("Login failed:", error);
    errorEl.textContent = "Something went wrong. Please try again.";
    errorEl.classList.remove("hidden");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign In";
  }
}

function handleLogout() {
  clearSession();
  currentComplaintId = null;
  closeDetail();
  showLogin();
}

function handleFilterChange(e) {
  currentStatusFilter = e.target.value;
  loadComplaints();
}

function statusToClass(status) {
  return "status-" + status.toLowerCase().replace(/\s+/g, "-");
}

function formatDate(isoString) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function loadComplaints() {
  const listEl = document.getElementById("complaintsList");
  const loadingEl = document.getElementById("listLoading");
  const emptyEl = document.getElementById("listEmpty");

  listEl.innerHTML = "";
  emptyEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  try {
    const query = currentStatusFilter ? `?status=${encodeURIComponent(currentStatusFilter)}` : "";
    const response = await authFetch(`/api/complaints${query}`);

    if (response.status === 401 || response.status === 403) {
      handleLogout();
      return;
    }

    const complaints = await response.json();
    loadingEl.classList.add("hidden");

    if (!complaints.length) {
      emptyEl.classList.remove("hidden");
      return;
    }

    complaints.forEach((complaint) => {
      listEl.appendChild(renderComplaintCard(complaint));
    });
  } catch (error) {
    console.error("Failed to load complaints:", error);
    loadingEl.textContent = "Something went wrong loading complaints.";
  }
}

function renderComplaintCard(complaint) {
  const card = document.createElement("div");
  card.className = "complaint-card";
  card.dataset.complaintId = complaint.complaint_id;

  if (complaint.complaint_id === currentComplaintId) {
    card.classList.add("active");
  }

  card.innerHTML = `
    <div class="complaint-card-top">
      <h3>${escapeHtml(complaint.complaint_type)}</h3>
      <span class="status-badge ${statusToClass(complaint.complaint_status)}">${escapeHtml(complaint.complaint_status)}</span>
    </div>
    <p class="meta">
      ${escapeHtml(complaint.stall_name || "Unknown stall")} · filed by ${escapeHtml(complaint.patron_name)}
    </p>
    <p class="meta">${formatDate(complaint.created_at)}</p>
  `;

  card.addEventListener("click", () => loadDetail(complaint.complaint_id));

  return card;
}

async function loadDetail(complaintId) {
  currentComplaintId = complaintId;

  document.querySelectorAll(".complaint-card").forEach((card) => {
    card.classList.toggle("active", Number(card.dataset.complaintId) === complaintId);
  });

  try {
    const response = await authFetch(`/api/complaints/${complaintId}`);

    if (response.status === 401 || response.status === 403) {
      handleLogout();
      return;
    }

    if (!response.ok) {
      alert("Unable to load that complaint.");
      return;
    }

    const complaint = await response.json();
    renderDetail(complaint);
  } catch (error) {
    console.error("Failed to load complaint detail:", error);
    alert("Something went wrong loading the complaint.");
  }
}

function renderDetail(complaint) {
  const panel = document.getElementById("detailPanel");
  panel.classList.remove("hidden");

  const badge = document.getElementById("detailStatusBadge");
  badge.textContent = complaint.complaint_status;
  badge.className = `status-badge ${statusToClass(complaint.complaint_status)}`;

  document.getElementById("detailType").textContent = complaint.complaint_type;
  document.getElementById("detailPatron").textContent = complaint.patron_name;
  document.getElementById("detailStall").textContent = complaint.stall_name || "Unknown stall";
  document.getElementById("detailDate").textContent = formatDate(complaint.created_at);
  document.getElementById("detailDescription").textContent = complaint.description;
  document.getElementById("detailOfficer").textContent = complaint.officer_name || "Unassigned";
  document.getElementById("statusSelect").value = complaint.complaint_status;
  document.getElementById("noteInput").value = "";
  document.getElementById("updateError").classList.add("hidden");

  const notesList = document.getElementById("notesList");
  const notesEmpty = document.getElementById("notesEmpty");
  notesList.innerHTML = "";

  if (!complaint.notes || complaint.notes.length === 0) {
    notesEmpty.classList.remove("hidden");
  } else {
    notesEmpty.classList.add("hidden");

    complaint.notes.forEach((note) => {
      const noteEl = document.createElement("div");
      noteEl.className = "note-item";
      noteEl.innerHTML = `
        <div>${escapeHtml(note.note)}</div>
        <div class="note-meta">${escapeHtml(note.officer_name)} · ${formatDate(note.created_at)}</div>
      `;
      notesList.appendChild(noteEl);
    });
  }
}

function closeDetail() {
  currentComplaintId = null;
  document.getElementById("detailPanel").classList.add("hidden");
  document.querySelectorAll(".complaint-card").forEach((card) => card.classList.remove("active"));
}

async function handleUpdateSubmit(e) {
  e.preventDefault();

  if (!currentComplaintId) return;

  const status = document.getElementById("statusSelect").value;
  const note = document.getElementById("noteInput").value.trim();
  const updateBtn = document.getElementById("updateBtn");
  const errorEl = document.getElementById("updateError");

  errorEl.classList.add("hidden");
  updateBtn.disabled = true;
  updateBtn.textContent = "Saving...";

  try {
    const response = await authFetch(`/api/complaints/${currentComplaintId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: note || undefined })
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      handleLogout();
      return;
    }

    if (!response.ok) {
      errorEl.textContent = data.message || "Unable to update complaint.";
      errorEl.classList.remove("hidden");
      return;
    }

    renderDetail(data);
    loadComplaints();
  } catch (error) {
    console.error("Failed to update complaint:", error);
    errorEl.textContent = "Something went wrong. Please try again.";
    errorEl.classList.remove("hidden");
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = "Save Update";
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}
