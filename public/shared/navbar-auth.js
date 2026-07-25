
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
    const allowedRoles = (el.dataset.role || "")
      .toLowerCase()
      .split(",")
      .map(role => role.trim());

    if (!role) {
      el.style.display =
        allowedRoles.includes("guest") || allowedRoles.includes("all")
          ? ""
          : "none";
      return;
    }

    el.style.display =
      allowedRoles.includes("all") || allowedRoles.includes(role)
        ? ""
        : "none";
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
  const logoLink = document.getElementById("logoLink");

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

    if (logoLink) {
      logoLink.href = "/index.html";
    }
    
    if (signinBtn) {
      signinBtn.textContent = "Sign in";
      setNavTarget(signinBtn, "/auth/signup.html");
    }

    if (dashboardAuthBtn) {
      dashboardAuthBtn.textContent = "Sign in";
      dashboardAuthBtn.onclick = () => {
        window.location.href = "/auth/signup.html";
      };
    }

    applyRoleBasedNav(null);
    return;
  }

  const role = String(user.role || "patron").toLowerCase();
  const fullName = user.full_name || "My Profile";

  let targetUrl = "/profile/PatronProfile.html";



  if (role === "vendor") {
    targetUrl = "/profile/VendorProfile.html";
  }

  if (logoLink) {
  logoLink.href = role === "vendor" ? "/vendor/VendorDashboard.html" : "/index.html";
}

  if (signinBtn) {
    signinBtn.textContent = fullName;
    setNavTarget(signinBtn, targetUrl);
  }

  if (dashboardAuthBtn) {
    dashboardAuthBtn.textContent = "Sign out";

    dashboardAuthBtn.onclick = () => {
      showLogoutModal();
    };
  }

    applyRoleBasedNav(role);
  }

function showLogoutModal() {
  const logoutModal = document.getElementById("logoutModal");
  const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");
  const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

  if (!logoutModal || !cancelLogoutBtn || !confirmLogoutBtn) {
    localStorage.clear();
    window.location.href = "/index.html";
    return;
  }

  logoutModal.classList.remove("hidden");

  cancelLogoutBtn.onclick = () => {
    logoutModal.classList.add("hidden");
  };

  confirmLogoutBtn.onclick = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("hawkerhub_auth");
    localStorage.removeItem("cart");

    window.location.href = "/index.html";
  };

  logoutModal.onclick = (event) => {
    if (event.target === logoutModal) {
      logoutModal.classList.add("hidden");
    }
  };
}

window.showLogoutModal = showLogoutModal;