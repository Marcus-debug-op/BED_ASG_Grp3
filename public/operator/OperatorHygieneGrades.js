document.addEventListener("DOMContentLoaded", () => {

    const body = document.getElementById("hygiene-grades");
    if (!body) return;

    const token = localStorage.getItem("token");

    // No dedicated hygiene-grades endpoint exists - the grade breakdown is
    // already part of GET /api/operator/dashboard/metrics, so this page
    // just reuses that same call instead of duplicating a query the
    // backend already runs.
    async function loadGrades() {
        try {
            const response = await fetch("/api/operator/dashboard/metrics", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Unable to load hygiene grades.");

            renderGrades(data.hygieneMetrics.grades);
        } catch (error) {
            console.error("Error loading hygiene grades:", error);
            body.innerHTML = `<tr><td colspan="2" class="text-muted-center">Failed to load hygiene grades.</td></tr>`;
        }
    }

    function renderGrades(grades) {
        if (!grades.length) {
            body.innerHTML = `<tr><td colspan="2" class="text-muted-center">No completed inspections yet.</td></tr>`;
            return;
        }

        body.innerHTML = grades.map(({ grade, stallCount }) => `
            <tr>
                <td><span class="badge badge-success">Grade ${grade}</span></td>
                <td>${stallCount}</td>
            </tr>
        `).join("");
    }

    loadGrades();
    setInterval(loadGrades, 30000);
});
