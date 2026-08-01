const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const savedUser = localStorage.getItem("user");

const scheduleList = document.getElementById("schedule-list");
const stallDirectoryBody = document.getElementById("stall-directory-body");
const messageDiv = document.getElementById("message");

const recentInspectionsBody = document.getElementById("recent-inspections-body");
const totalStalls = document.getElementById("total-stalls");
const criticalViolations = document.getElementById("critical-violations");
const avgZoneScore = document.getElementById("avg-zone-score");
const displayOfficerName = document.getElementById("display-officer-name");
const displayBadgeId = document.getElementById("display-badge-id");
const officerEmail = document.getElementById("officer-email");

/*
  This page should only be accessed by officer users.
  The token is needed because the inspection APIs are protected.
*/
if (!token) {
  window.location.href = "/officer/SignInOfficer.html";
} else if (role !== "officer") {
  document.body.innerHTML = "<h2>You do not have permission to access this page.</h2>";
} else {
  setupOfficerInfo();
  setupDatePickers();
  loadStalls();
  loadScheduledInspections();
  loadInspectionRecords();
}

/*
  Show officer information from localStorage.
*/
function setupOfficerInfo() {
  try {
    const user = savedUser ? JSON.parse(savedUser) : null;

    if (displayOfficerName) {
      displayOfficerName.textContent = user?.full_name || "NEA Officer";
    }

    if (displayBadgeId) {
      displayBadgeId.textContent = user?.user_id || "-";
    }

    if (officerEmail) {
      officerEmail.textContent = user?.email || "Officer account";
    }
  } 
  
  catch (error) {
    console.error("Unable to read saved user:", error);
  }
}

/*
  Switch between sidebar pages.
*/
function switchPage(page, clickedItem) {
  document.querySelectorAll(".main-content > div").forEach((section) => {
    section.classList.add("hidden");
  });

  const selectedPage = document.getElementById(`page-${page}`);
  if (selectedPage) {
    selectedPage.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  if (clickedItem) {
    clickedItem.classList.add("active");
  }

  if (page === "schedule") {
    loadScheduledInspections();
  }

  if (page === "stalls") {
    loadStalls();
  }

  if (page === "complaints") {
    initComplaintsTab();
  }
}

/*
  Load all active stalls so the officer can select a stall for inspection scheduling.
*/
async function loadStalls() {
  try {
    const response = await fetch("/api/stalls", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (stallDirectoryBody) {
        stallDirectoryBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-muted-center">
              ${data.message || "Unable to load stalls."}
            </td>
          </tr>
        `;
      }
      return;
    }

    renderStalls(data);

    if (totalStalls) {
      totalStalls.textContent = data.length;
    }
  } catch (error) {
    console.error("Load stalls error:", error);

    if (stallDirectoryBody) {
      stallDirectoryBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-muted-center">
            Unable to connect to server.
          </td>
        </tr>
      `;
    }
  }
}

/*
  Display stalls in the Stall Directory page.
  Each stall has a Schedule button that opens the schedule modal.
*/
function renderStalls(stalls) {
  if (!stallDirectoryBody) return;

  if (!stalls || stalls.length === 0) {
    stallDirectoryBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-muted-center">No stalls found.</td>
      </tr>
    `;
    return;
  }

  stallDirectoryBody.innerHTML = stalls.map((stall) => {
    return `
      <tr>
        <td>${stall.stall_id}</td>
        <td>${stall.stall_name}</td>
        <td>${stall.vendor_name || stall.full_name || "-"}</td>
        <td>${stall.current_hygiene_grade || stall.last_grade || "Not inspected"}</td>
        <td>
          <button 
            class="btn-primary" 
            onclick="openScheduleModal(${stall.stall_id}, '${escapeHtml(stall.stall_name)}')">
            Schedule
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/*
  Open the schedule modal and store selected stall info.
*/
function openScheduleModal(stallId, stallName) {
  document.getElementById("schedule-stall-id").value = stallId;
  document.getElementById("schedule-stall-name").value = stallName;

  const modal = document.getElementById("modal-schedule");
  modal.classList.remove("hidden");

  updateFinalDate();
}

/*
  Close modal by ID.
*/
function closeModal(modalId) {
  const modal = document.getElementById(modalId);

  if (modal) {
    modal.classList.add("hidden");
  }
}

/*
  Setup custom date picker.
*/
function setupDatePickers() {
  const yearSelect = document.getElementById("picker-year");
  const monthSelect = document.getElementById("picker-month");

  if (!yearSelect || !monthSelect) return;

  const currentYear = new Date().getFullYear();

  yearSelect.innerHTML = "";

  for (let year = currentYear; year <= currentYear + 2; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }

  monthSelect.value = new Date().getMonth();

  updateDayOptions();
}

/*
  Update day dropdown based on selected month/year.
*/
function updateDayOptions() {
  const year = Number(document.getElementById("picker-year").value);
  const month = Number(document.getElementById("picker-month").value);
  const daySelect = document.getElementById("picker-day");

  if (!daySelect) return;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  daySelect.innerHTML = "";

  for (let day = 1; day <= daysInMonth; day++) {
    const option = document.createElement("option");
    option.value = String(day).padStart(2, "0");
    option.textContent = day;
    daySelect.appendChild(option);
  }

  updateFinalDate();
}

/*
  Convert selected year/month/day into YYYY-MM-DD.
*/
function updateFinalDate() {
  const year = document.getElementById("picker-year")?.value;
  const month = document.getElementById("picker-month")?.value;
  const day = document.getElementById("picker-day")?.value;
  const inputDate = document.getElementById("input-date");

  if (!year || month === undefined || !day || !inputDate) return;

  const realMonth = String(Number(month) + 1).padStart(2, "0");

  inputDate.value = `${year}-${realMonth}-${day}`;
}

/*
  Optional placeholder because your HTML calls checkAvailability().
*/
function checkAvailability() {
  updateFinalDate();
}

/*
  Schedule inspection.
  This calls POST /api/inspections.

  Create a new scheduled inspection using the selected stall, date, and time.
*/
async function confirmSchedule() {
  const stallId = document.getElementById("schedule-stall-id").value;
  const selectedDate = document.getElementById("input-date").value;
  const selectedTime = document.getElementById("input-time").value;

  if (!stallId) {
    alert("No stall selected.");
    return;
  }

  if (!selectedDate) {
    alert("Please select an inspection date.");
    return;
  }

  const inspectionDate = `${selectedDate}T${selectedTime}:00`;

  try {
    const response = await fetch("/api/inspections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        stall_id: Number(stallId),
        inspection_date: inspectionDate
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to schedule inspection.");
      return;
    }

    alert("Inspection scheduled successfully.");

    closeModal("modal-schedule");
    
    loadScheduledInspections();
    loadInspectionRecords();
    loadStalls();
    switchPage("schedule", document.querySelector(".nav-item:nth-child(3)"));
  } catch (error) {
    console.error("Schedule inspection error:", error);
    alert("Unable to connect to server.");
  }
}

/*
  Load upcoming scheduled inspections.
  This calls GET /api/inspections/scheduled.

  // Load only active Scheduled inspections for the Schedule page.
*/
async function loadScheduledInspections() {
  try {
    const response = await fetch("/api/inspections/scheduled", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      scheduleList.innerHTML = `
        <p class="text-muted-center">
          ${data.message || "Unable to load inspections."}
        </p>
      `;
      return;
    }

    renderScheduledInspections(data);

  } 
  
  catch (error) {
    console.error("Load inspections error:", error);

    scheduleList.innerHTML = `
      <p class="text-muted-center">Unable to connect to server.</p>
    `;
  }
}


function renderScheduledInspections(inspections) {
  if (!scheduleList) return;

  if (!Array.isArray(inspections) || inspections.length === 0) {
    scheduleList.innerHTML = `
      <p class="text-muted-center">No scheduled inspections found.</p>
    `;
    return;
  }

  scheduleList.innerHTML = inspections.map((inspection) => {
    return `
      <div class="card inspection-card">
        <h3>${inspection.stall_name || "-"}</h3>
        <p><strong>Hawker Centre:</strong> ${inspection.centre_name || "-"}</p>
        <p><strong>Date:</strong> ${new Date(inspection.inspection_date).toLocaleString()}</p>
        <p><strong>Status:</strong> ${inspection.inspection_status || "-"}</p>

        <label class="form-label">New Date/Time</label>
        <input 
          type="datetime-local" 
          id="reschedule-${inspection.inspection_id}"
          class="form-input-box"
        />

        <div class="modal-actions">
          <button class="btn-primary" onclick="rescheduleInspection(${inspection.inspection_id})">
            Reschedule
          </button>

          <button class="btn-primary" onclick="openCompleteInspectionModal(${inspection.inspection_id}, ${inspection.stall_id}, '${escapeHtml(inspection.stall_name)}')">
            Complete Inspection
          </button>

          <button class="btn-secondary" onclick="cancelInspection(${inspection.inspection_id})">
            Cancel
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/*
  Display scheduled inspections.
*/
function renderRecentInspections(inspections) {
  if (!recentInspectionsBody) return;

  if (!inspections || inspections.length === 0) {
    recentInspectionsBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-muted-center">
          No inspection activity found.
        </td>
      </tr>
    `;
    return;
  }

  recentInspectionsBody.innerHTML = inspections.slice(0, 8).map((inspection) => {
    return `
      <tr>
        <td>${inspection.stall_name || "-"}</td>
        <td>${new Date(inspection.inspection_date).toLocaleString()}</td>
        <td>${inspection.hygiene_grade || "Pending"}</td>
        <td>${inspection.inspection_status || "-"}</td>
      </tr>
    `;
  }).join("");
}

// Load all inspection records for the dashboard activity table.
async function loadInspectionRecords() {
  try {
    const response = await fetch("/api/inspections", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      recentInspectionsBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-muted-center">
            ${data.message || "Unable to load inspection records."}
          </td>
        </tr>
      `;
      return;
    }

    renderRecentInspections(data);
    updateDashboardStats(data);
  } catch (error) {
    console.error("Load inspection records error:", error);

    recentInspectionsBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-muted-center">
          Unable to connect to server.
        </td>
      </tr>
    `;
  }
}



function updateDashboardStats(inspections) {
  if (!Array.isArray(inspections)) return;

  const completedInspections = inspections.filter((inspection) =>
    inspection.inspection_status === "Completed"
  );

  const criticalCount = completedInspections.filter((inspection) =>
    inspection.hygiene_grade === "C" || inspection.hygiene_grade === "D"
  ).length;

  const scores = completedInspections
    .map((inspection) => Number(inspection.score))
    .filter((score) => !Number.isNaN(score));

  const averageScore =
    scores.length > 0
      ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
      : "0.0";

  if (criticalViolations) {
    criticalViolations.textContent = criticalCount;
  }

  if (avgZoneScore) {
    avgZoneScore.textContent = averageScore;
  }
}

/*
  Reschedule inspection.
  This calls PUT /api/inspections/:inspectionId.

  Send only the new inspection date/time because the inspection already exists.
*/
async function rescheduleInspection(inspectionId) {
  const newDate = document.getElementById(`reschedule-${inspectionId}`).value;

  if (!newDate) {
    alert("Please select a new inspection date.");
    return;
  }

  try {
    const response = await fetch(`/api/inspections/${inspectionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        inspection_date: newDate
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to reschedule inspection.");
      return;
    }

    alert("Inspection rescheduled successfully.");
    loadScheduledInspections();
    loadInspectionRecords();
  } 
  catch (error) {
    console.error("Reschedule inspection error:", error);
    alert("Unable to connect to server.");
  }
}

/*
  Cancel inspection.
  This calls PATCH /api/inspections/:inspectionId/cancel.

  Uses the DELETE endpoint, but the backend performs a soft delete by setting status to Cancelled.
*/
async function cancelInspection(inspectionId) {
  const confirmCancel = confirm("Are you sure you want to cancel this inspection?");

  if (!confirmCancel) {
    return;
  }

  try {
    const response = await fetch(`/api/inspections/${inspectionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to cancel inspection.");
      return;
    }

    alert("Inspection cancelled successfully.");
    loadScheduledInspections();
    loadInspectionRecords();
  } 
  
  catch (error) {
    console.error("Cancel inspection error:", error);
    alert("Unable to connect to server.");
  }
}






/*
  Logout officer.
*/
function logoutOfficer() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");

  window.location.href = "/officer/SignInOfficer.html";
}

/*
  Prevent HTML injection when inserting stall names into onclick.
*/
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "\\'");
}


function openCompleteInspectionModal(inspectionId, stallId, stallName) {
  document.getElementById("inspect-schedule-id").value = inspectionId;
  document.getElementById("inspect-stall-id").value = stallId;
  document.getElementById("inspect-stall-name").value = stallName;
  document.getElementById("display-stall-name").textContent = stallName;

  document.getElementById("input-score").value = "";
  document.getElementById("input-hygiene-grade").value = "";
  document.getElementById("input-result").value = "Pass";
  document.getElementById("input-remarks").value = "";
  document.getElementById("input-strengths").value = "";
  document.getElementById("grade-preview").textContent = "";

  document.getElementById("modal-inspect").classList.remove("hidden");
}

function calculateLiveGrade(scoreValue) {
  const score = Number(scoreValue);
  const gradePreview = document.getElementById("grade-preview");
  const gradeSelect = document.getElementById("input-hygiene-grade");

  if (Number.isNaN(score) || score < 0 || score > 100) {
    gradePreview.textContent = "Enter a score from 0 to 100.";
    return;
  }

  let grade;

  if (score >= 85) {
    grade = "A";
  } else if (score >= 70) {
    grade = "B";
  } else if (score >= 50) {
    grade = "C";
  } else {
    grade = "D";
  }

  gradeSelect.value = grade;
  gradePreview.textContent = `Suggested grade: ${grade}`;
}

// Submit the completed inspection result.
// The backend saves the score/grade and updates the stall's current hygiene grade.
async function submitInspection() {
  const inspectionId = document.getElementById("inspect-schedule-id").value;
  const score = document.getElementById("input-score").value;
  const hygieneGrade = document.getElementById("input-hygiene-grade").value;
  const result = document.getElementById("input-result").value;
  const strengths = document.getElementById("input-strengths").value.trim();
  const remarks = document.getElementById("input-remarks").value.trim();

  if (!inspectionId) {
    alert("No inspection selected.");
    return;
  }

  if (!score) {
    alert("Please enter a hygiene score.");
    return;
  }

  if (!hygieneGrade) {
    alert("Please select a hygiene grade.");
    return;
  }

  const finalRemarks = strengths
    ? `Strengths: ${strengths}\nRemarks: ${remarks}`
    : remarks;

  try {
    const response = await fetch(`/api/inspections/${inspectionId}/result`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        score: Number(score),
        hygiene_grade: hygieneGrade,
        remarks: finalRemarks,
        result
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Unable to submit inspection result.");
      return;
    }

    alert("Inspection result submitted successfully.");

    closeModal("modal-inspect");

    loadScheduledInspections();
    loadInspectionRecords();
    loadStalls();
  } 
  
  catch (error) {
    console.error("Submit inspection error:", error);
    alert("Unable to connect to server.");
  }
}



/*
  // Because this script is type="module", functions used by onclick in HTML
  // must be attached to the window object.
*/
window.switchPage = switchPage;
window.openScheduleModal = openScheduleModal;
window.closeModal = closeModal;
window.updateDayOptions = updateDayOptions;
window.updateFinalDate = updateFinalDate;
window.checkAvailability = checkAvailability;
window.confirmSchedule = confirmSchedule;
window.rescheduleInspection = rescheduleInspection;
window.cancelInspection = cancelInspection;
window.logoutOfficer = logoutOfficer;
window.openCompleteInspectionModal = openCompleteInspectionModal;
window.calculateLiveGrade = calculateLiveGrade;
window.submitInspection = submitInspection;