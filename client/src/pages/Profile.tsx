import { useEffect, useMemo, useState } from "react";
import { updateProfile, User } from "../api/auth";
import { Link } from "react-router-dom";

const DEFAULT_COLORS = ["#6E85B7","#A3E635","#22D3EE","#F97316","#F43F5E","#10B981","#818CF8","#F59E0B"];

function randomColor(exclude?: string) {
  const pool = DEFAULT_COLORS.filter(c => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] || "#6E85B7";
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [avatarColor, setAvatarColor] = useState("#6E85B7");
  const [msg, setMsg] = useState("");

  const readUser = () => {
    const raw = localStorage.getItem("sl_user");
    const parsed = raw ? (JSON.parse(raw) as User & { avatarColor?: string }) : null;
    setUser(parsed);
    setUsername(parsed ? (parsed.username || parsed.email.split("@")[0]) : "");
    setAvatarColor(parsed?.["avatarColor"] || randomColor());
  };

  useEffect(() => {
    readUser();
    const onAuth = () => readUser();
    window.addEventListener("sl_auth_change", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("sl_auth_change", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  const initials = useMemo(() => {
    const base = (username || user?.email || "").trim();
    if (!base) return "U";
    return base.slice(0, 1).toUpperCase();
  }, [username, user]);

  if (!user) {
    return (
      <div>
        <h1>Profile</h1>
        <p>You’re not logged in.</p>
        <Link to="/auth">Go to Login</Link>
      </div>
    );
  }

  const save = async () => {
    try {
      // Try to persist both username + avatarColor (backend may ignore avatarColor if not implemented yet)
      const res = await updateProfile({ username, avatarColor } as any);
      const updated = { ...(res?.user || user), username, avatarColor };
      localStorage.setItem("sl_user", JSON.stringify(updated));
      setUser(updated);
      setMsg("Saved.");
    } catch {
      // Local best-effort so UI stays consistent even if backend hasn’t added avatarColor yet
      const updated = { ...user, username, avatarColor };
      localStorage.setItem("sl_user", JSON.stringify(updated));
      setUser(updated);
      setMsg("Saved locally.");
    }
  };

  return (
    <div>
      <h1>Profile</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div
          title="Click to change color"
          onClick={() => setAvatarColor(randomColor(avatarColor))}
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: avatarColor, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 20, cursor: "pointer", userSelect: "none",
            boxShadow: "0 1px 4px rgba(0,0,0,.15)",
          }}
        >
          {initials}
        </div>
        <input
          aria-label="Avatar color"
          type="color"
          value={avatarColor}
          onChange={(e) => setAvatarColor(e.target.value)}
          style={{ width: 40, height: 40, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
        />
      </div>

      <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <label>
          <div>Email</div>
          <input value={user.email} disabled />
        </label>

        <label>
          <div>Username</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DEFAULT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setAvatarColor(c)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: c === avatarColor ? "2px solid #111" : "2px solid #fff",
                outline: "1px solid #ddd",
                background: c, cursor: "pointer"
              }}
              title={c}
            />
          ))}
        </div>

        <div>
          <button onClick={save}>Save</button>
        </div>
      </div>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
