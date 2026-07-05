document.addEventListener("DOMContentLoaded", async () => {
  const chosenList = document.getElementById("selectedChips");
  const stallSelect = document.getElementById("stallSelect");
  const addBtn = document.getElementById("addStallBtn");
  const clearBtn = document.getElementById("clearBtn");
  const saveBtn = document.getElementById("saveVendorSetupBtn");

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== "vendor") {
    window.location.href = "SignInVendor.html";
    return;
  }

  // Vendor registration already creates a stall,
  // so the old Firebase "claim a stall" buttons are not needed.
  stallSelect.style.display = "none";
  addBtn.style.display = "none";
  clearBtn.style.display = "none";
  saveBtn.style.display = "none";

  try {
    const response = await fetch("/api/vendor/my-stalls", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const stalls = await response.json();

    if (!response.ok) {
      throw new Error(stalls.message || "Unable to load stalls.");
    }

    if (stalls.length === 0) {
      chosenList.innerHTML = `
        <div class="muted">
          No stall is linked to this vendor account yet.
        </div>
      `;
      return;
    }

    chosenList.innerHTML = stalls.map((stall) => `
      <div class="stall-card" data-id="${stall.stall_id}">
        <span class="stall-name">${stall.stall_name}</span>
        <span class="stall-action">
          ${stall.centre_name} · ${stall.unit_number} · Click to manage →
        </span>
      </div>
    `).join("");

    chosenList.addEventListener("click", (event) => {
      const card = event.target.closest(".stall-card");

      if (!card) return;

      const selectedStall = stalls.find(
        (stall) => String(stall.stall_id) === card.dataset.id
      );

      sessionStorage.setItem("selectedStallId", selectedStall.stall_id);
      sessionStorage.setItem("selectedStallName", selectedStall.stall_name);

    });

  } catch (error) {
    console.error("Vendor stall loading error:", error);

    chosenList.innerHTML = `
      <div class="muted">
        Unable to load your stalls.
      </div>
    `;
  }
});