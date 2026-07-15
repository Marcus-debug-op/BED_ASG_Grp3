let currentComplaintId = null;
let currentStatusFilter = "";

const stallNameDisplay = document.getElementById("stallNameDisplay");
const complaintsList = document.getElementById("complaints-list");
const vendorName = document.getElementById("vendorName");
const statusFilter = document.getElementById("statusFilter");

const modal = document.getElementById("detailModal");
const closeModal = document.getElementById("closeDetailModal");
const closeBtnSecondary = document.getElementById("closeBtnSecondary");

const acknowledgeBtn = document.getElementById("acknowledgeBtn");
const acknowledgeStatusText = document.getElementById("acknowledgeStatusText");

function getToken() {
  return localStorage.getItem("token");
}

function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
}

function statusToClass(status) {
  return "status-" + status.toLowerCase().replace(/\s+/g, "-");
}

function formatDate(isoString) {
  if (!isoString) return "Unknown Date";
  return new Date(isoString).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

// 1. Check Auth
document.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  const role = localStorage.getItem("role");

  if (!token || role !== "vendor") {
    window.location.href = "SignInVendor.html";
    return;
  }

  vendorName.textContent = localStorage.getItem("full_name") || "Vendor";

  loadStallName();
  loadComplaints();

  statusFilter.addEventListener("change", (e) => {
    currentStatusFilter = e.target.value;
    loadComplaints();
  });

  [closeModal, closeBtnSecondary].forEach((btn) => {
    btn.addEventListener("click", () => modal.classList.remove("flex-show"));
  });

  acknowledgeBtn.addEventListener("click", handleAcknowledge);

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("full_name");
    window.location.href = "SignInVendor.html";
  });
});

// 2. Show which stall this is (first active stall for this vendor)
async function loadStallName() {
  try {
    const response = await authFetch("/api/vendor/my-stalls");
    if (!response.ok) return;

    const stalls = await response.json();
    stallNameDisplay.textContent = stalls.length ? stalls[0].stall_name : "No Stall Linked";
  } catch (error) {
    console.error("Error loading stall name:", error);
  }
}

// 3. Load Complaints (against any of this vendor's stalls)
async function loadComplaints() {
  complaintsList.innerHTML = "<p class='loading-text'>Loading complaints...</p>";

  try {
    const query = currentStatusFilter ? `?status=${encodeURIComponent(currentStatusFilter)}` : "";
    const response = await authFetch(`/api/vendor/complaints${query}`);

    if (response.status === 401 || response.status === 403) {
      window.location.href = "SignInVendor.html";
      return;
    }

    const complaints = await response.json();

    if (!complaints.length) {
      complaintsList.innerHTML = `
        <div class="state-message success-state">
            <h3>No complaints here</h3>
            <p>Good job keeping your customers happy! 🎉</p>
        </div>`;
      return;
    }

    complaintsList.innerHTML = "";

    complaints.forEach((complaint) => {
      const statusClass = statusToClass(complaint.complaint_status);

      const card = document.createElement("div");
      card.className = `complaint-card status-${statusClass}`;

      card.innerHTML = `
        <div class="card-header">
            <div class="user-info">
                <span class="user-badge">${escapeHtml(complaint.patron_name)}</span>
                <span class="status-pill ${statusClass}">${escapeHtml(complaint.complaint_status)}</span>
            </div>
            <span class="date-text">${formatDate(complaint.created_at)}</span>
        </div>
        <p class="reason-text"><strong>${escapeHtml(complaint.complaint_type)}:</strong> ${escapeHtml(complaint.description)}</p>
        <button class="view-details-btn" data-id="${complaint.complaint_id}">View Details</button>
      `;

      card.querySelector(".view-details-btn").addEventListener("click", () => {
        openModal(complaint.complaint_id);
      });

      complaintsList.appendChild(card);
    });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    complaintsList.innerHTML = "<p class='loading-text'>Something went wrong loading complaints.</p>";
  }
}

// 4. Modal Logic - fetches full detail (incl. officer notes) for one complaint
async function openModal(complaintId) {
  currentComplaintId = complaintId;
  acknowledgeStatusText.textContent = "";

  try {
    const response = await authFetch(`/api/vendor/complaints/${complaintId}`);

    if (response.status === 401 || response.status === 403) {
      window.location.href = "SignInVendor.html";
      return;
    }

    if (!response.ok) {
      alert("Unable to load that complaint.");
      return;
    }

    const complaint = await response.json();
    renderModal(complaint);
    modal.classList.add("flex-show");
  } catch (error) {
    console.error("Error loading complaint detail:", error);
    alert("Something went wrong loading the complaint.");
  }
}

function renderModal(complaint) {
  document.getElementById("modalUser").textContent = complaint.patron_name || "Anonymous";
  document.getElementById("modalDate").textContent = formatDate(complaint.created_at);
  document.getElementById("modalType").textContent = complaint.complaint_type;
  document.getElementById("modalComplaint").textContent = complaint.description;
  document.getElementById("modalOfficer").textContent = complaint.officer_name || "Not yet assigned to an officer.";

  const badge = document.getElementById("statusBadge");
  badge.textContent = complaint.complaint_status;
  badge.className = `status-pill ${statusToClass(complaint.complaint_status)}`;

  const notesList = document.getElementById("modalNotes");
  const notesEmpty = document.getElementById("modalNotesEmpty");
  notesList.innerHTML = "";

  if (!complaint.notes || complaint.notes.length === 0) {
    notesEmpty.classList.remove("hidden");
  } else {
    notesEmpty.classList.add("hidden");
    complaint.notes.forEach((note) => {
      const noteEl = document.createElement("div");
      noteEl.className = "note-item";
      noteEl.innerHTML = `<div>${escapeHtml(note.note)}</div><div class="note-meta">${escapeHtml(note.officer_name)} · ${formatDate(note.created_at)}</div>`;
      notesList.appendChild(noteEl);
    });
  }

  // Vendors can only acknowledge while a complaint is still "Open".
  const canAcknowledge = complaint.complaint_status === "Open";
  acknowledgeBtn.disabled = !canAcknowledge;
  acknowledgeBtn.textContent = canAcknowledge ? "Acknowledge Complaint" : "Already Acknowledged";
}

// 5. Acknowledge (the vendor's only write action)
async function handleAcknowledge() {
  if (!currentComplaintId) return;

  acknowledgeBtn.disabled = true;
  acknowledgeBtn.textContent = "Saving...";

  try {
    const response = await authFetch(`/api/vendor/complaints/${currentComplaintId}/acknowledge`, {
      method: "PATCH"
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      window.location.href = "SignInVendor.html";
      return;
    }

    if (!response.ok) {
      acknowledgeStatusText.textContent = data.message || "Unable to acknowledge complaint.";
      acknowledgeBtn.disabled = false;
      acknowledgeBtn.textContent = "Acknowledge Complaint";
      return;
    }

    renderModal(data);
    acknowledgeStatusText.textContent = "Acknowledged!";
    loadComplaints();
  } catch (error) {
    console.error("Error acknowledging complaint:", error);
    acknowledgeStatusText.textContent = "Something went wrong. Please try again.";
    acknowledgeBtn.disabled = false;
    acknowledgeBtn.textContent = "Acknowledge Complaint";
  }
}