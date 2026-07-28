document.addEventListener("DOMContentLoaded", () => {

    const agreementsBody = document.getElementById("agreementsBody");
    if (!agreementsBody) return;

    const token = localStorage.getItem("token");

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }

    function formatMoney(n) {
        return `$${(Number(n) || 0).toFixed(2)}`;
    }

    function escapeHtml(str) {
        return String(str ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function loadAgreements() {
        try {
            const response = await fetch("/api/operator/rental-agreements", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load rental agreements.");

            renderAgreements(data);
            renderSummary(data);
        } catch (error) {
            console.error("Error loading rental agreements:", error);
            agreementsBody.innerHTML = `<tr><td colspan="7" class="text-muted-center">Failed to load rental agreements.</td></tr>`;
        }
    }

    function renderSummary(agreements) {
        const today = new Date();
        const in30Days = new Date();
        in30Days.setDate(today.getDate() + 30);

        const activeCount = agreements.filter((a) => a.agreement_status === "Active").length;
        const expiringCount = agreements.filter((a) => {
            if (a.agreement_status !== "Active") return false;
            const end = new Date(a.lease_end_date);
            return end >= today && end < in30Days;
        }).length;

        document.getElementById("active-agreements").textContent = activeCount;
        document.getElementById("expiring-leases").textContent = expiringCount;
    }

    function renderAgreements(agreements) {
        if (agreements.length === 0) {
            agreementsBody.innerHTML = `<tr><td colspan="7" class="text-muted-center">No rental agreements yet.</td></tr>`;
            return;
        }

        agreementsBody.innerHTML = agreements.map((a) => `
            <tr>
                <td>${a.rental_agreement_id}</td>
                <td>${escapeHtml(a.stall_name)}</td>
                <td>${escapeHtml(a.vendor_name)}</td>
                <td>${formatDate(a.lease_start_date)}</td>
                <td>${formatDate(a.lease_end_date)}</td>
                <td>${formatMoney(a.monthly_rent)}</td>
                <td><span class="badge ${a.agreement_status === "Active" ? "badge-success" : "badge-inactive"}">${escapeHtml(a.agreement_status)}</span></td>
            </tr>
        `).join("");
    }

    loadAgreements();
    setInterval(loadAgreements, 30000);
});
