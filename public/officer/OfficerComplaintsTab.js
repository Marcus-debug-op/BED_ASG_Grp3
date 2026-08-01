// Complaints tab for the NEA Officer Portal.
// Auth/session is already handled by NEAofficer.js (which redirects to the
// sign-in page if there's no valid officer token), so this file only contains
// the complaint list/detail logic - no login form, no OTP flow.

let currentComplaintId = null;
let currentStatusFilter = "";

function authFetch(url, options = {}) {
  const authToken = localStorage.getItem("token");
  const headers = {
    ...(options.headers || {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };

  return fetch(url, { ...options, headers });
}

// Called by NEAofficer.js's switchPage() when the Complaints tab is opened.
function initComplaintsTab() {
  const statusFilter = document.getElementById("statusFilter");
  const closeDetailBtn = document.getElementById("closeDetailBtn");
  const updateForm = document.getElementById("updateForm");

  // Only wire the listeners up once, even if the tab is opened repeatedly.
  if (!statusFilter.dataset.bound) {
    statusFilter.addEventListener("change", handleFilterChange);
    closeDetailBtn.addEventListener("click", closeDetail);
    updateForm.addEventListener("submit", handleUpdateSubmit);
    statusFilter.dataset.bound = "true";
  }

  updateQueueLabel();
  loadComplaints();
}

function updateQueueLabel() {
  const label = document.getElementById("queueLabel");
  const role = localStorage.getItem("role");
  if (!label) return;

  label.textContent =
    role === "officer"
      ? "Showing Hygiene complaints (your queue)"
      : "Showing Service, Food Quality, Overcharging & Other complaints (your queue)";
}

// A 401/403 here means the session died - hand back to the shared logout.
function handleLogout() {
  if (typeof logoutOfficer === "function") {
    logoutOfficer();
  } else {
    localStorage.clear();
    window.location.href = "/officer/SignInOfficer.html";
  }
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
