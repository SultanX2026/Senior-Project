import axios from "axios";

const base =
  (import.meta.env.VITE_API_URL?.replace(/\/$/, "") as string) ||
  "http://localhost:5001";

const client = axios.create({
  baseURL: `${base}/api`,
  // don't throw on 4xx; we'll handle {ok:false} in callers
  validateStatus: () => true,
  withCredentials: false,
});

// --- auth token management (used by auth.ts) ---
let authToken: string | null = null;

/** Set (or clear) the bearer token used on API calls. */
export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    // optional persistence:
    try { localStorage.setItem("sl_jwt", token); } catch {}
  } else {
    delete client.defaults.headers.common["Authorization"];
    try { localStorage.removeItem("sl_jwt"); } catch {}
  }
}

/** Read the in-memory token (if needed elsewhere). */
export function getToken(): string | null {
  return authToken;
}

// If a token was persisted earlier, hydrate it on load.
try {
  const existing = localStorage.getItem("sl_jwt");
  if (existing) setToken(existing);
} catch {}

export default client;
