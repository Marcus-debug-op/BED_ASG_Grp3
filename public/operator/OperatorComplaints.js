// Runs alongside operator.js and OperatorStalls.js on the same page.
// Covers the Complaints card only - reuses the .modal-overlay/.card/.data-table
// styling already loaded via operator.css + OperatorStalls.css.
document.addEventListener("DOMContentLoaded", () => {

    const complaintsBody = document.getElementById("complaintsBody");
    if (!complaintsBody) return;

    const token = localStorage.getItem("token");

    const modal = document.getElementById("complaintModal");
    const closeModalBtn = document.getElementById("closeComplaintModalBtn");
    const cancelBtn = document.getElementById("cancelComplaintBtn");
    const form = document.getElementById("complaintForm");
    const formMsg = document.getElementById("complaintFormMsg");

    const complaintIdField = document.getElementById("complaintId");
    const descriptionField = document.getElementById("complaintDescription");
    const statusField = document.getElementById("complaintStatus");
    const noteField = document.getElementById("complaintNote");

    let currentComplaints = [];

    function authHeaders(extra = {}) {
        return { Authorization: `Bearer ${token}`, ...extra };
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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

    function showFormMsg(text) {
        formMsg.textContent = text || "";
    }

    function statusBadgeClass(status) {
        if (status === "Resolved" || status === "Closed") return "badge badge-success";
        if (status === "Open") return "badge-inactive";
        return "badge badge-success"; // Acknowledged / In Progress - reuse the same accent, no separate "in-progress" style exists yet
    }

    function renderComplaints() {
        if (currentComplaints.length === 0) {
            complaintsBody.innerHTML = `<tr><td colspan="6" class="text-muted-center">No complaints filed against your stalls right now.</td></tr>`;
            return;
        }

        complaintsBody.innerHTML = currentComplaints.map((c) => `
            <tr data-id="${c.complaint_id}">
                <td>${c.complaint_id}</td>
                <td>${escapeHtml(c.complaint_type)}</td>
                <td>${escapeHtml(c.stall_name || "-")}</td>
                <td>${escapeHtml(c.patron_name)}</td>
                <td><span class="${statusBadgeClass(c.complaint_status)}">${escapeHtml(c.complaint_status)}</span></td>
                <td>
                    <div class="row-actions">
                        <button type="button" class="btn-edit-row" data-action="update">Update</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    async function loadComplaints() {
        complaintsBody.innerHTML = `<tr><td colspan="6" class="text-muted-center">Loading complaints...</td></tr>`;

        try {
            const response = await fetch("/api/complaints", { headers: authHeaders() });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load complaints.");

            currentComplaints = data;
            renderComplaints();
        } catch (error) {
            console.error("Error loading complaints:", error);
            complaintsBody.innerHTML = `<tr><td colspan="6" class="text-muted-center">Failed to load complaints.</td></tr>`;
        }
    }

    function renderNotes(notes) {
        const notesList = document.getElementById("complaintNotesList");
        const notesEmpty = document.getElementById("complaintNotesEmpty");

        notesList.innerHTML = "";

        if (!notes || notes.length === 0) {
            notesEmpty.hidden = false;
            return;
        }

        notesEmpty.hidden = true;

        notes.forEach(function (note) {
            const item = document.createElement("div");
            item.className = "note-item";
            item.innerHTML =
                "<div>" + escapeHtml(note.note) + "</div>" +
                "<div class='note-meta'>" + escapeHtml(note.officer_name) +
                " &middot; " + formatDate(note.created_at) + "</div>";
            notesList.appendChild(item);
        });
    }

    // The list endpoint doesn't include notes - only GET /api/complaints/:id
    // does - so fetch the full record when the modal is opened.
    async function loadNotes(complaintId) {
        const notesList = document.getElementById("complaintNotesList");
        const notesEmpty = document.getElementById("complaintNotesEmpty");

        notesList.innerHTML = "";
        notesEmpty.hidden = true;

        try {
            const response = await fetch(`/api/complaints/${complaintId}`, {
                headers: authHeaders()
            });

            if (!response.ok) {
                notesEmpty.textContent = "Unable to load notes.";
                notesEmpty.hidden = false;
                return;
            }

            const complaint = await response.json();
            notesEmpty.textContent = "No notes yet.";
            renderNotes(complaint.notes);
        } catch (error) {
            console.error("Failed to load complaint notes:", error);
            notesEmpty.textContent = "Unable to load notes.";
            notesEmpty.hidden = false;
        }
    }

    function openModal(complaint) {
        form.reset();
        showFormMsg("");
        complaintIdField.value = complaint.complaint_id;
        descriptionField.value = complaint.description;

        // The dropdown only offers the statuses an operator actually owns
        // (In Progress -> Resolved/Closed). If the complaint is still Open or
        // Acknowledged, show that as a disabled placeholder so the current
        // state stays visible and the operator has to consciously pick a
        // forward action - otherwise the select would silently display
        // "In Progress" for a complaint that isn't in progress yet.
        const assignableStatuses = ["In Progress", "Resolved", "Closed"];

        statusField.querySelectorAll("option[data-current-status]").forEach(function (opt) {
            opt.remove();
        });

        if (assignableStatuses.includes(complaint.complaint_status)) {
            statusField.value = complaint.complaint_status;
        } else {
            const placeholder = document.createElement("option");
            placeholder.textContent = complaint.complaint_status + " (current)";
            placeholder.value = complaint.complaint_status;
            placeholder.disabled = true;
            placeholder.dataset.currentStatus = "true";
            statusField.prepend(placeholder);
            statusField.value = complaint.complaint_status;
        }

        noteField.value = "";
        modal.hidden = false;

        loadNotes(complaint.complaint_id);
    }

    function closeModal() {
        modal.hidden = true;
    }

    complaintsBody.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action='update']");
        if (!btn) return;

        const row = btn.closest("tr");
        const complaint = currentComplaints.find((c) => String(c.complaint_id) === row.dataset.id);
        if (complaint) openModal(complaint);
    });

    closeModalBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        showFormMsg("");

        const complaintId = complaintIdField.value;
        const payload = {
            status: statusField.value,
            note: noteField.value.trim()
        };

        try {
            const response = await fetch(`/api/complaints/${complaintId}`, {
                method: "PATCH",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                const details = Array.isArray(data.errors) ? ` (${data.errors.join(", ")})` : "";
                throw new Error((data.message || "Unable to update complaint.") + details);
            }

            closeModal();
            await loadComplaints();
        } catch (error) {
            console.error("Error updating complaint:", error);
            showFormMsg(error.message || "Unable to update complaint.");
        }
    });

    loadComplaints();
    setInterval(loadComplaints, 30000);
});