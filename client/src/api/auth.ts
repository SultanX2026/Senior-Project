import client, { setToken } from "./client";

export type User = {
  id: string;
  email: string;
  // new fields
  displayName: string;
  avatarColor: string;
  // keep for backwards compatibility (older code may still read username)
  username?: string;
};

const fireAuthEvent = () => {
  // not a storage event; fires in the same tab
  window.dispatchEvent(new Event("sl_auth_change"));
};

export async function register(email: string, password: string) {
  // client is already /api-prefixed, so this hits /api/auth/register
  const res = (await client.post("/auth/register", { email, password })).data as {
    token: string;
    user: User;
  };
  setToken(res.token);
  localStorage.setItem("sl_user", JSON.stringify(res.user));
  fireAuthEvent();
  return res;
}

export async function login(email: string, password: string) {
  const res = (await client.post("/auth/login", { email, password })).data as {
    token: string;
    user: User;
  };
  setToken(res.token);
  localStorage.setItem("sl_user", JSON.stringify(res.user));
  fireAuthEvent();
  return res;
}

export async function me() {
  // GET /api/auth/me
  return (await client.get("/auth/me")).data as User;
}

/**
 * Update profile fields. Your server now supports PATCH /api/auth/me
 * with { displayName?, avatarColor? }.
 */
export async function updateProfile(p: Partial<Pick<User, "displayName" | "avatarColor">>) {
  // Allow either {user: ...} or direct user object, depending on backend response
  const raw = (await client.patch("/auth/me", p)).data as User | { user: User };
  const user: User = (raw as any).user ?? (raw as User);
  localStorage.setItem("sl_user", JSON.stringify(user));
  fireAuthEvent();
  return { user };
}

export function logout() {
  setToken(null);
  localStorage.removeItem("sl_user");
  fireAuthEvent();
}
