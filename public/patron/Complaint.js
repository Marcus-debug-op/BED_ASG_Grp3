// --- Setup ---
const urlParams = new URLSearchParams(window.location.search);
const stallId = Number(urlParams.get("id"));
const token = localStorage.getItem("token");

const titleDisplay = document.getElementById("stall-name-display");
const submitBtn = document.getElementById("submit-btn");
const complaintTypeSelect = document.getElementById("complaint-type");
const complaintInput = document.getElementById("complaint-text");
const improvementInput = document.getElementById("improvement-text");

// 1. Load stall name for the page header, via the public stall/menu endpoint
// (there's no dedicated single-stall endpoint, but this one includes stall_name).
async function loadStallInfo() {
    if (!stallId || Number.isNaN(stallId)) {
        titleDisplay.innerText = "Error: No Stall Selected";
        submitBtn.disabled = true;
        return;
    }

    try {
        const response = await fetch(`/api/stalls/${stallId}/menu`);
        const data = await response.json();

        if (!response.ok) {
            titleDisplay.innerText = "Stall not found";
            return;
        }

        titleDisplay.innerText = `For: ${data.stall.stall_name}`;
    } catch (error) {
        console.error(error);
        titleDisplay.innerText = "Error loading stall info";
    }
}
loadStallInfo();

// 2. Handle Submit
submitBtn.addEventListener("click", async () => {
    if (!token) {
        alert("Please sign in to submit a complaint.");
        return;
    }

    const complaintText = complaintInput.value.trim();
    const improvementText = improvementInput.value.trim();

    if (!complaintText) {
        alert("Please enter a complaint.");
        return;
    }

    // The backend has a single `description` field, so the optional
    // "suggested improvements" text is folded into it rather than dropped.
    const description = improvementText
        ? `${complaintText}\n\nSuggested improvement: ${improvementText}`
        : complaintText;

    if (description.length < 10) {
        alert("Please provide a bit more detail (at least 10 characters).");
        return;
    }

    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("/api/complaints", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                stall_id: stallId,
                complaint_type: complaintTypeSelect.value,
                description
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const details = Array.isArray(data.errors) ? ` (${data.errors.join(", ")})` : "";
            throw new Error((data.message || "Failed to submit complaint.") + details);
        }

        alert(`Complaint submitted successfully! Your tracking ID is ${data.tracking_id}.`);
        window.history.back();
    } catch (error) {
        console.error(error);
        alert(error.message || "Failed to submit. Please try again.");
        submitBtn.innerText = "Submit";
        submitBtn.disabled = false;
    }
});