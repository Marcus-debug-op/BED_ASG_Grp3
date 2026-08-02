// ============================================================================
// BED-145 (Ryan Tan): Vendor Assignment page logic.
//
// Talks to the BED-145 backend at /api/operator/stall-assignments and to two
// existing read endpoints (/api/operator/stalls and .../stalls/vendors) to fill
// the dropdowns. operator.js on the same page already handles the auth guard
// and logout, so this file only drives the assignment UI.
//
// Follows the same conventions as OperatorStalls.js (BED-28): token from
// localStorage, an authHeaders() helper, escapeHtml() on all injected values.
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  const assignmentsBody = document.getElementById("assignmentsBody");
  if (!assignmentsBody) return; // not on this page - bail quietly

  const pageMsg      = document.getElementById("assignmentMessage");
  const assignBtn    = document.getElementById("assignBtn");

  // Assign/reassign modal elements
  const assignModal      = document.getElementById("assignModal");
  const assignModalTitle = document.getElementById("assignModalTitle");
  const assignForm       = document.getElementById("assignForm");
  const assignFormMsg    = document.getElementById("assignFormMsg");
  const stallSelect      = document.getElementById("assignStallId");
  const vendorSelect     = document.getElementById("assignVendorId");
  const reassignNotice   = document.getElementById("reassignNotice");
  const reassignCheckbox = document.getElementById("reassignCheckbox");
  const closeAssignBtn   = document.getElementById("closeAssignModalBtn");
  const cancelAssignBtn  = document.getElementById("cancelAssignBtn");

  // History panel elements
  const historyCard    = document.getElementById("historyCard");
  const historyTitle   = document.getElementById("historyTitle");
  const historyBody    = document.getElementById("historyBody");
  const closeHistoryBtn = document.getElementById("closeHistoryBtn");

  // Confirm-vacate modal elements
  const vacateModal        = document.getElementById("vacateModal");
  const vacateModalText    = document.getElementById("vacateModalText");
  const closeVacateBtn     = document.getElementById("closeVacateModalBtn");
  const cancelVacateBtn    = document.getElementById("cancelVacateBtn");
  const confirmVacateBtn   = document.getElementById("confirmVacateBtn");
  let   stallIdPendingVacate = null; // remembers which stall the box is asking about

  const token = localStorage.getItem("token");

  // In-memory caches so the dropdowns and the "is this stall occupied?" check
  // don't need a round-trip every time.
  let currentAssignments = []; // [{ stall_id, stall_name, vendor_id, vendor_name, assigned_date }]
  let allStalls = [];          // [{ stall_id, stall_name, ... }]
  let vendorOptions = [];       // [{ user_id, full_name, email }]

  // Same helpers as OperatorStalls.js -------------------------------------------------
  function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${token}`, ...extra };
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  // Shows a friendly message and, on 401, sends the operator back to log in
  // (same expired-token handling pattern we use elsewhere).
  function handleAuthError(response) {
    if (response.status === 401 || response.status === 403) {
      pageMsg.textContent = "Your session expired. Please log in again.";
      window.location.href = "SignInOperator.html";
      return true;
    }
    return false;
  }

    function formatDate(value) {
    if (!value) return "—";
    // The DB stores local (Singapore) time with no timezone marker. If we let
    // `new Date(value)` parse it raw, the browser assumes UTC and shifts it by
    // +8h. Instead we read the date/time parts directly from the raw string so
    // what we show matches exactly what's in the database — no timezone shift.
    const m = String(value).match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return new Date(value).toLocaleString(); // fallback for odd formats
    const [, y, mo, d, hh, mi] = m;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mi));
    return dt.toLocaleString("en-SG", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
    });
    }
  // Data loading --------------------------------------------------------------------

  // Current occupant of every stall (BED-145 GET /).
  async function loadCurrentAssignments() {
    const response = await fetch("/api/operator/stall-assignments", { headers: authHeaders(), cache: "no-store" });
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error("Failed to load assignments");
    currentAssignments = await response.json();
  }

  // All stalls, to populate the stall dropdown (reuses BED-28's read endpoint).
  async function loadStalls() {
    const response = await fetch("/api/operator/stalls", { headers: authHeaders(), cache: "no-store" });
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error("Failed to load stalls");
    allStalls = await response.json();
  }

  // Vendor list for the vendor dropdown (reuses BED-28's vendors endpoint).
  async function loadVendors() {
    const response = await fetch("/api/operator/stalls/vendors", { headers: authHeaders() });
    if (handleAuthError(response)) return;
    if (!response.ok) throw new Error("Failed to load vendors");
    vendorOptions = await response.json();
  }

  // Rendering -----------------------------------------------------------------------

  function renderAssignments() {
    // Build a quick lookup of stall_id -> current assignment.
    const byStall = new Map(currentAssignments.map((a) => [a.stall_id, a]));

    // One row per stall so operators can see occupied AND empty stalls.
    assignmentsBody.innerHTML = allStalls.map((stall) => {
      const current = byStall.get(stall.stall_id);
      const vendorCell = current
        ? `${escapeHtml(current.vendor_name)} (#${current.vendor_id})`
        : `<span class="muted">Unoccupied</span>`;
      const sinceCell = current ? formatDate(current.assigned_date) : "—";

      // Vacate only makes sense when the stall actually has an occupant.
      const vacateBtn = current
        ? `<button class="btn-danger btn-sm" data-action="vacate" data-stall="${stall.stall_id}" data-name="${escapeHtml(stall.stall_name)} (#${stall.stall_id})">Vacate</button>`
        : "";

      return `
        <tr>
          <td>${escapeHtml(stall.stall_name)} (#${stall.stall_id})</td>
          <td>${vendorCell}</td>
          <td>${sinceCell}</td>
          <td>
            <button class="btn-secondary btn-sm" data-action="history" data-stall="${stall.stall_id}" data-name="${escapeHtml(stall.stall_name)}">History</button>
            ${vacateBtn}
          </td>
        </tr>`;
    }).join("");
  }

  function populateDropdowns() {
    stallSelect.innerHTML = allStalls
      .map((s) => `<option value="${s.stall_id}">${escapeHtml(s.stall_name)} (#${s.stall_id})</option>`)
      .join("");
    vendorSelect.innerHTML = vendorOptions
      .map((v) => `<option value="${v.user_id}">${escapeHtml(v.full_name)} (#${v.user_id})</option>`)
      .join("");
    updateReassignNotice();
  }

  // If the chosen stall is already occupied, reveal the reassign checkbox so the
  // operator has to consciously opt in (mirrors the API's occupied-stall rule).
  function updateReassignNotice() {
    const stallId = Number(stallSelect.value);
    const occupied = currentAssignments.some((a) => a.stall_id === stallId);
    reassignNotice.style.display = occupied ? "block" : "none";
    if (!occupied) reassignCheckbox.checked = false;
  }

  // Actions -------------------------------------------------------------------------

  function openAssignModal() {
    assignFormMsg.textContent = "";
    populateDropdowns();
    assignModalTitle.textContent = "Assign vendor to stall";
    assignModal.hidden = false;
  }

  function closeAssignModal() {
    assignModal.hidden = true;
  }

  // Submit the assign/reassign request (BED-145 POST /).
  async function submitAssignment(event) {
    event.preventDefault();
    assignFormMsg.textContent = "Saving...";

    const body = {
      stall_id:  Number(stallSelect.value),
      vendor_id: Number(vendorSelect.value),
      reassign:  reassignCheckbox.checked
    };

    try {
      const response = await fetch("/api/operator/stall-assignments", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body)
      });
      if (handleAuthError(response)) return;

      const data = await response.json().catch(() => ({}));

      // 400 = stall already occupied. Show the notice and let them tick reassign.
      if (response.status === 400 && data.message && data.message.toLowerCase().includes("occupied")) {
        reassignNotice.style.display = "block";
        assignFormMsg.textContent = data.message || "This stall is already occupied.";
        return;
      }
      if (!response.ok) {
        // Joi validation errors come back as an array; join them for display.
        assignFormMsg.textContent = (data.errors && data.errors.join(" ")) || data.message || "Could not save.";
        return;
      }

      closeAssignModal();
      // Immediately re-pull fresh data and re-render so the new occupant shows
      // without a manual page refresh. Wrapped so any refresh hiccup is visible
      // in the console rather than silently leaving a stale table.
      try {
        await refresh();
      } catch (refreshError) {
        console.error("Assign saved but refresh failed:", refreshError);
        pageMsg.textContent = "Saved. Refreshing the list...";
        await refresh(); // one retry
      }
    } catch (error) {
      console.error("Error saving assignment:", error);
      assignFormMsg.textContent = "Something went wrong. Please try again.";
    }
  }

  // Vacate the current vendor from a stall (BED-145 DELETE /:stallId).
  // Step 1: clicking "Vacate" on a row opens the confirmation box (no delete yet).
  function openVacateModal(stallId, stallName) {
    stallIdPendingVacate = stallId;
    vacateModalText.textContent = `Vacate the current vendor from ${stallName}?`;
    vacateModal.hidden = false;
  }

  function closeVacateModal() {
    vacateModal.hidden = true;
    stallIdPendingVacate = null;
  }

  // Step 2: the box's "Vacate" button actually performs the delete (BED-145
  // DELETE /:stallId). Only runs after the operator confirms in the box.
  async function performVacate() {
    const stallId = stallIdPendingVacate;
    if (!stallId) return;
    closeVacateModal();
    try {
      const response = await fetch(`/api/operator/stall-assignments/${stallId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (handleAuthError(response)) return;
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        pageMsg.textContent = data.message || "Could not vacate stall.";
        return;
      }
      await refresh();
    } catch (error) {
      console.error("Error vacating stall:", error);
      pageMsg.textContent = "Something went wrong vacating the stall.";
    }
  }

  // Show the full assignment history for one stall (BED-145 GET /:stallId/history).
  async function showHistory(stallId, stallName) {
    try {
      const response = await fetch(`/api/operator/stall-assignments/${stallId}/history`, {
        headers: authHeaders()
      });
      if (handleAuthError(response)) return;
      if (!response.ok) throw new Error("Failed to load history");

      const history = await response.json();
      historyTitle.textContent = `Assignment history — ${stallName} (#${stallId})`;
      historyBody.innerHTML = history.length
        ? history.map((h) => `
            <tr>
              <td>${escapeHtml(h.vendor_name)} (#${h.vendor_id})</td>
              <td>${formatDate(h.assigned_date)}</td>
              <td>${h.vacated_date ? formatDate(h.vacated_date) : '<span class="muted">Current</span>'}</td>
            </tr>`).join("")
        : `<tr><td colspan="3" class="muted">No history for this stall.</td></tr>`;

      historyCard.hidden = false;
      historyCard.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error loading history:", error);
      pageMsg.textContent = "Could not load assignment history.";
    }
  }

  // Load everything and re-render.
  async function refresh() {
    pageMsg.textContent = "Loading assignments...";
    await Promise.all([loadCurrentAssignments(), loadStalls(), loadVendors()]);
    renderAssignments();
    pageMsg.textContent = "";
  }

  // Event wiring --------------------------------------------------------------------
  assignBtn.addEventListener("click", openAssignModal);
  closeAssignBtn.addEventListener("click", closeAssignModal);
  cancelAssignBtn.addEventListener("click", closeAssignModal);
  // Clicking the dark overlay (outside the card) closes the modal, same as the
  // Stall Management page.
  assignModal.addEventListener("click", (event) => {
    if (event.target === assignModal) closeAssignModal();
  });
  assignForm.addEventListener("submit", submitAssignment);
  stallSelect.addEventListener("change", updateReassignNotice);
  closeHistoryBtn.addEventListener("click", () => { historyCard.hidden = true; });

  // Vacate confirmation box wiring
  confirmVacateBtn.addEventListener("click", performVacate);
  closeVacateBtn.addEventListener("click", closeVacateModal);
  cancelVacateBtn.addEventListener("click", closeVacateModal);
  vacateModal.addEventListener("click", (event) => {
    if (event.target === vacateModal) closeVacateModal();
  });

  // Table uses event delegation: one listener handles History + Vacate on every row.
  assignmentsBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const stallId = Number(button.dataset.stall);
    if (button.dataset.action === "vacate") openVacateModal(stallId, button.dataset.name);
    if (button.dataset.action === "history") showHistory(stallId, button.dataset.name);
  });

  // Kick things off.
  refresh().catch((error) => {
    console.error("Error initialising page:", error);
    pageMsg.textContent = "Could not load the page. Please refresh.";
  });
});