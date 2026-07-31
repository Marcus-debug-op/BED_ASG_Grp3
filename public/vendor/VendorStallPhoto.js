// BED-147: Vendor uploads/replaces a stall's profile picture.
document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");

    const stallSelect = document.getElementById("stallSelect");
    const uploadBox = document.getElementById("uploadBox");
    const stallImageInput = document.getElementById("stallImageInput");
    const stallImagePreview = document.getElementById("stallImagePreview");
    const cameraIcon = document.getElementById("cameraIcon");
    const uploadHint = document.getElementById("uploadHint");
    const saveBtn = document.getElementById("saveStallImageBtn");
    const msgEl = document.getElementById("stallPhotoMsg");

    if (!stallSelect) return;

    let selectedFile = null;
    let myStalls = [];

    function authHeaders(extra = {}) {
        return { Authorization: `Bearer ${token}`, ...extra };
    }

    function showMsg(text, isError = false) {
        msgEl.textContent = text || "";
        // Colours live in VendorStallPhoto.css (.is-success / .is-error)
        // rather than being set inline here.
        msgEl.classList.remove("is-success", "is-error");
        if (text) msgEl.classList.add(isError ? "is-error" : "is-success");
    }

    // Toggles the preview via a CSS class (.is-visible, defined in
    // VendorStallPhoto.css) instead of writing inline styles, so all the
    // visual rules for this page stay in the stylesheet.
    function showPreview(visible) {
        stallImagePreview.classList.toggle("is-visible", visible);
        cameraIcon.hidden = visible;
        uploadHint.hidden = visible;
    }

    // Same normalisation the patron pages use - the DB stores paths like
    // "uploads/stalls/xxx.jpg" or "img/xxx.jpg" with no leading slash, which
    // would otherwise resolve relative to /vendor/ and 404.
    function normalizeImageUrl(imageUrl) {
        if (!imageUrl) return "";
        const cleaned = String(imageUrl).trim();
        if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned;
        if (cleaned.startsWith("/img/") || cleaned.startsWith("/uploads/")) return cleaned;
        if (cleaned.startsWith("img/") || cleaned.startsWith("uploads/")) return `/${cleaned}`;
        return `/img/${cleaned}`;
    }

    // Shows whichever photo the selected stall currently has, so the vendor
    // can see what patrons see before deciding to replace it. The ?t=
    // cache-buster matters after an upload: the browser would otherwise keep
    // showing the previously cached image for the same URL.
    function showCurrentPhoto(stallId) {
        const stall = myStalls.find((s) => String(s.stall_id) === String(stallId));
        const url = normalizeImageUrl(stall?.image_url);

        selectedFile = null;
        saveBtn.disabled = true;

        if (url) {
            stallImagePreview.src = `${url}?t=${Date.now()}`;
            showPreview(true);
        } else {
            showPreview(false);
        }
    }

    async function loadMyStalls() {
        try {
            const response = await fetch("/api/vendor/my-stalls", { headers: authHeaders() });
            const stalls = await response.json();
            if (!response.ok) throw new Error(stalls.message || "Unable to load your stalls.");

            if (stalls.length === 0) {
                stallSelect.innerHTML = `<option value="">No stalls found</option>`;
                return;
            }

            myStalls = stalls;

            stallSelect.innerHTML = stalls.map((s) =>
                `<option value="${s.stall_id}">${s.stall_name}</option>`
            ).join("");

            showCurrentPhoto(stallSelect.value);
        } catch (error) {
            console.error("Error loading vendor stalls:", error);
            stallSelect.innerHTML = `<option value="">Failed to load stalls</option>`;
        }
    }

    // Switching stalls swaps the preview to that stall's own current photo.
    stallSelect.addEventListener("change", () => {
        showMsg("");
        showCurrentPhoto(stallSelect.value);
    });

    uploadBox.addEventListener("click", () => stallImageInput.click());

    stallImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        selectedFile = file;
        saveBtn.disabled = false;
        showMsg("");

        const reader = new FileReader();
        reader.onload = (ev) => {
            stallImagePreview.src = ev.target.result;
            showPreview(true);
        };
        reader.readAsDataURL(file);
    });

    saveBtn.addEventListener("click", async () => {
        const stallId = stallSelect.value;

        if (!stallId) {
            return showMsg("Please select a stall first.", true);
        }
        if (!selectedFile) {
            return showMsg("Please select a photo first.", true);
        }

        const formData = new FormData();
        formData.append("stallImage", selectedFile);

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        showMsg("");

        try {
            const response = await fetch(`/api/vendor/stalls/${stallId}/profile-picture`, {
                method: "PATCH",
                headers: authHeaders(), // no Content-Type - browser sets the multipart boundary itself
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update stall photo.");
            }

            showMsg("Stall photo updated successfully! Patrons will see it on the browse and stall pages.");
            selectedFile = null;

            // Keep the local cache in sync so switching stalls and back shows
            // the new photo, and re-render with a fresh cache-buster.
            const stall = myStalls.find((s) => String(s.stall_id) === String(stallId));
            if (stall) stall.image_url = data.image_url;
            showCurrentPhoto(stallId);
        } catch (error) {
            console.error("Error uploading stall photo:", error);
            showMsg(error.message || "Unable to update stall photo.", true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Photo";
        }
    });

    loadMyStalls();
});