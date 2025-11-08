import { useEffect, useState } from "react";
import { updateProfile, User } from "../api/auth";
import { Link } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [msg, setMsg] = useState("");

  const readUser = () => {
    const u = localStorage.getItem("sl_user");
    const parsed = u ? (JSON.parse(u) as User) : null;
    setUser(parsed);
    setUsername(parsed ? (parsed.username || parsed.email.split("@")[0]) : "");
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

  if (!user) {
    return (
      <div>
        <h1>Profile</h1>
        <p>You’re not logged in.</p>
        <Link to="/auth">Go to Login</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Profile</h1>
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

        <div>
          <button
            onClick={async () => {
              try {
                const r = await updateProfile({ username });
                setUser(r.user);
                setMsg("Saved.");
              } catch {
                setMsg("Save failed");
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
