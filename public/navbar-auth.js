
function setNavTarget(el, url) {
  if (!el) return;

  if (el.tagName && el.tagName.toLowerCase() === "a") {
    el.setAttribute("href", url);
    el.onclick = null;
    return;
  }

  el.removeAttribute?.("href");
  el.onclick = () => (window.location.href = url);
}


function applyRoleBasedNav(role) {
  document.querySelectorAll("[data-role]").forEach((el) => {
    const allowed = (el.dataset.role || "").toLowerCase(); // all/patron/vendor

    if (!role) {
      el.style.display = allowed === "all" ? "" : "none";
    } else {
      el.style.display = allowed === "all" || allowed === role ? "" : "none";
    }
  });
}

async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(fs, "users", uid));
  return snap.exists() ? snap.data() : null;
}


function initMenuUI() {
  const menuBtn = document.getElementById("menu-btn");
  const dashboard = document.getElementById("dashboard");
  const overlay = document.getElementById("overlay");
  const closeBtn = document.getElementById("close-btn");

  if (menuBtn && dashboard && overlay) {
    menuBtn.addEventListener("click", () => {
      dashboard.classList.remove("hidden");
      overlay.classList.remove("hidden");
      setTimeout(() => dashboard.classList.add("show"), 10);
    });
  }

  function closeMenu() {
    if (!dashboard || !overlay) return;
    dashboard.classList.remove("show");
    overlay.classList.add("hidden");
    setTimeout(() => dashboard.classList.add("hidden"), 300);
  }

  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", closeMenu);
}

export function initNavbarAuth() {
  initMenuUI();

  const signinBtn = document.getElementById("signinBtn");
  const dashboardAuthBtn = document.getElementById("dashboardAuthBtn");

  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  let user = null;

  try {
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error("Unable to read saved user:", error);
  }

  // No SQL/JWT login stored
  if (!token || !user) {
    if (signinBtn) {
      signinBtn.textContent = "Sign in";
      setNavTarget(signinBtn, "signup.html");
    }

    if (dashboardAuthBtn) {
      dashboardAuthBtn.textContent = "Sign in";
      dashboardAuthBtn.onclick = () => {
        window.location.href = "signup.html";
      };
    }

    applyRoleBasedNav(null);
    return;
  }

  const role = String(user.role || "patron").toLowerCase();
  const fullName = user.full_name || "My Profile";

  let targetUrl = "PatronProfile.html";

  if (role === "vendor") {
    targetUrl = "VendorProfile.html";
  }

  if (signinBtn) {
    signinBtn.textContent = fullName;
    setNavTarget(signinBtn, targetUrl);
  }

  if (dashboardAuthBtn) {
    dashboardAuthBtn.textContent = "Sign out";

    dashboardAuthBtn.onclick = () => {
      if (!confirm("Sign out?")) return;

      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");

      window.location.href = "index.html";
    };
  }

  applyRoleBasedNav(role);
}

