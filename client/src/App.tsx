import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "./api/auth";
import Chatbot from "./components/Chatbot";
import "./App.css";

type User = { email: string; username?: string };
type Theme = "dark" | "light";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("sl_theme");
    return (saved as Theme) || "dark";
  });

  const readUser = () => {
    try {
      const u = localStorage.getItem("sl_user");
      if (!u) {
        setUser(null);
        return;
      }
      const parsed = JSON.parse(u);
      setUser(parsed && typeof parsed === "object" ? (parsed as User) : null);
    } catch (err) {
      console.error("Error parsing user from localStorage:", err);
      localStorage.removeItem("sl_user");
      setUser(null);
    }
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

  useEffect(() => {
    localStorage.setItem("sl_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const doLogout = () => { logout(); readUser(); };

  const displayName =
    (user?.username ?? "").trim() ||
    (user?.email ? user.email.split("@")[0] : "");

  return (
    <div className="app-container" data-theme={theme}>
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
      <Outlet context={{ theme, toggleTheme }} />
      <Chatbot />
    </div>
  );
}
