import { useState } from "react";
import { login } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Auth.module.css";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async () => {
    // Validation
    if (!email.trim()) {
      setMsg("Please enter an email address");
      return;
    }
    if (!email.includes("@")) {
      setMsg("Please enter a valid email address");
      return;
    }
    if (!password) {
      setMsg("Please enter a password");
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      setMsg("Logged in successfully!");
      setTimeout(() => nav("/profile"), 500);
    } catch (err: any) {
      const error = err?.response?.data?.error || err?.message || "Login failed";
      if (error === "bad creds") {
        setMsg("Invalid email or password");
      } else {
        setMsg(`Login failed: ${error}`);
      }
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>🔐 Stock Lens</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            className={styles.button}
            onClick={handleLogin}
            disabled={isLoading}
            style={{ marginTop: "20px" }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          {msg && (
            <div className={`${styles.message} ${msg.includes("failed") ? styles.error : styles.success}`}>
              {msg}
            </div>
          )}

          <p className={styles.footerText}>
            Don't have an account? <Link to="/register" className={styles.link}>Create one here</Link>
          </p>
          <p className={styles.footerText}>
            Forgot your password? <Link to="/forgot-password" className={styles.link}>Reset here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
