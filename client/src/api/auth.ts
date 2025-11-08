import client, { setToken } from "./client";

export type User = { id: string; email: string; username?: string };

const fireAuthEvent = () => {
  // not a storage event; fires in the same tab
  window.dispatchEvent(new Event("sl_auth_change"));
};

export async function register(email: string, password: string) {
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
  return (await client.get("/auth/me")).data as User;
}

export async function updateProfile(p: { username: string }) {
  const res = (await client.patch("/auth/profile", p)).data as { user: User };
  localStorage.setItem("sl_user", JSON.stringify(res.user));
  fireAuthEvent();
  return res;
}

export function logout() {
  setToken(null);
  localStorage.removeItem("sl_user");
  fireAuthEvent();
}
