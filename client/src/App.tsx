import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "./api/auth";

type User = { email: string; username?: string };

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const readUser = () => {
    const u = localStorage.getItem("sl_user");
    setUser(u ? (JSON.parse(u) as User) : null);
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

  const doLogout = () => { logout(); readUser(); };

  const displayName =
    (user?.username ?? "").trim() ||
    (user?.email ? user.email.split("@")[0] : "");

  return (
    <div style={{ fontFamily: "ui-sans-serif", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <Link to="/">Dashboard</Link>
        <Link to="/community">Community</Link>
        <Link to="/profile">Profile</Link>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          {!user ? <Link to="/auth">Login</Link> : <span>{displayName}</span>}
          {user && <button onClick={doLogout}>Logout</button>}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
