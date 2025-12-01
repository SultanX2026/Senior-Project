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

export async function register(email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string) {
  // client is already /api-prefixed, so this hits /api/auth/register
  const response = await client.post("/auth/register", { 
    email, 
    password,
    username: username || email.split("@")[0], // Fallback to email prefix if not provided
    securityQuestion: securityQuestion || "",
    securityAnswer: securityAnswer || "",
  });
  
  if (response.status >= 400) {
    throw new Error(response.data?.error || "Registration failed");
  }
  
  const res = response.data as {
    token: string;
    user: User;
  };
  
  if (!res.token || !res.user) {
    throw new Error("Invalid response from server");
  }
  
  setToken(res.token);
  localStorage.setItem("sl_user", JSON.stringify(res.user));
  fireAuthEvent();
  return res;
}

export async function login(email: string, password: string) {
  const response = await client.post("/auth/login", { email, password });
  
  if (response.status >= 400) {
    throw new Error(response.data?.error || "Login failed");
  }
  
  const res = response.data as {
    token: string;
    user: User;
  };
  
  if (!res.token || !res.user) {
    throw new Error("Invalid response from server");
  }
  
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

// ===== Forgot Password Flow =====

export async function getSecurityQuestions(): Promise<string[]> {
  const response = await client.get("/auth/forgot-password/questions");
  if (response.status >= 400) {
    throw new Error("Failed to fetch security questions");
  }
  return response.data?.questions || [];
}

export async function verifySecurityQuestion(
  email: string,
  answer: string
): Promise<{ resetToken: string }> {
  const response = await client.post("/auth/forgot-password/verify", {
    email,
    answer,
  });
  if (response.status >= 400) {
    throw new Error(response.data?.error || "Verification failed");
  }
  return response.data;
}

export async function resetPassword(
  resetToken: string,
  newPassword: string
): Promise<void> {
  const response = await client.post("/auth/forgot-password/reset", {
    resetToken,
    newPassword,
  });
  if (response.status >= 400) {
    throw new Error(response.data?.error || "Password reset failed");
  }
}

export async function setupSecurityQuestion(
  question: string,
  answer: string
): Promise<{ success: boolean; message: string }> {
  const response = await client.post("/auth/forgot-password/setup", {
    securityQuestion: question,
    securityAnswer: answer,
  });
  if (response.status >= 400) {
    throw new Error(response.data?.error || "Failed to set up security question");
  }
  return response.data || { success: true, message: "Security question set" };
}
