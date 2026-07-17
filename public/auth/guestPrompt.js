const overlay = document.getElementById("guestPromptOverlay");
const closeBtn = document.getElementById("guestPromptClose");
const guestBtn = document.getElementById("guestPromptGuestBtn");


const SESSION_KEY = "hawkerhub_guest_prompt_hidden_this_session";

function showPrompt(){
  if (!overlay) return;
  overlay.classList.remove("hidden");
}

function hidePromptForSession(){
  if (!overlay) return;
  overlay.classList.add("hidden");
  sessionStorage.setItem(SESSION_KEY, "1");
}

function hiddenThisSession(){
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

// Close / continue as guest => hide for this session only
if (closeBtn) closeBtn.addEventListener("click", hidePromptForSession);
if (guestBtn) guestBtn.addEventListener("click", hidePromptForSession);


if (overlay){
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hidePromptForSession();
  });
}

// Check SQL/JWT login stored after patron signs in
const token = localStorage.getItem("token");
const savedUser = localStorage.getItem("user");

if (token && savedUser) {
  // Logged in through SQL backend, so do not show guest prompt
  if (overlay) overlay.classList.add("hidden");
} else if (!hiddenThisSession()) {
  // No SQL login found, so show guest prompt
  showPrompt();
}