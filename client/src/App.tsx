import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "./api/auth";
import Chatbot from "./components/Chatbot";
import "./App.css";

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
    <div className="app-container">
      <header className="app-header">
        <div className="nav-brand">StockLens</div>
        <nav className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/community">Community</Link>
          <Link to="/profile">Profile</Link>
        </nav>

        <div className="nav-user">
          {!user ? <Link to="/auth" className="nav-login">Login</Link> : <span className="nav-username">{displayName}</span>}
          {user && <button className="nav-logout" onClick={doLogout}>Logout</button>}
        </div>
      </header>
      <Outlet />
      <Chatbot />
    </div>
  );
}
