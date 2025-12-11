import axios from "axios";

// Smart API URL detection
const determineApiUrl = (): string => {
  // 1. Check environment variable (build-time)
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace(/\/$/, "");
    console.log("[API Client] Using VITE_API_URL:", url);
    return url;
  }

  // 2. If on localhost, use localhost:5001
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    console.log("[API Client] Detected localhost, using http://localhost:5001");
    return "http://localhost:5001";
  }

  // 3. If "api" resolves (Docker), use it
  if (typeof window !== "undefined" && window.location.hostname.includes("127.0.0.1")) {
    console.log("[API Client] Detected 127.0.0.1, using http://localhost:5001");
    return "http://localhost:5001";
  }

  // 4. Otherwise, use same hostname with :5001 (for network/mobile access)
  if (typeof window !== "undefined") {
    const apiUrl = `http://${window.location.hostname}:5001`;
    console.log("[API Client] Using dynamic hostname:", apiUrl);
    return apiUrl;
  }

  // Fallback
  console.warn("[API Client] Could not determine URL, using localhost");
  return "http://localhost:5001";
};

const base = determineApiUrl();

const client = axios.create({
  baseURL: `${base}/api`,
  // don't throw on 4xx; we'll handle {ok:false} in callers
  validateStatus: () => true,
  withCredentials: false,
  timeout: 15000, // 15 second timeout for slower networks
});

console.log("[API Client] Initialized with base:", base);
console.log("[API Client] Full API URL:", `${base}/api`);

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
