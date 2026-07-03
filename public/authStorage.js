// Shared helper for storing/reading the logged-in (or guest) session in the browser.
// Used by SignInPatron.js, SignInVendor.js, and the guest prompt.

const STORAGE_KEY = "hawkerhub_auth";

// Persists the auth token + user info returned by the backend login/guest endpoints.
export function saveSession({ token, user }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token, user })
  );
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to read stored session:", error);
    return null;
  }
}

export function getToken() {
  return getSession()?.token || null;
}

export function isGuest() {
  const session = getSession();
  return !!session && (session.user?.role === "guest" || session.user?.isGuest === true);
}

export function isLoggedIn() {
  const session = getSession();
  return !!session && !isGuest();
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// Convenience helper for calling protected endpoints with the stored token attached.
export function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  return fetch(url, { ...options, headers });
}
