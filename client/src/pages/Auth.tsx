import { useState } from "react";
import { login, register } from "../api/auth";
import { useNavigate } from "react-router-dom";
import styles from "./Auth.module.css";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login(email, password);
      setMsg("Logged in successfully!");
      setTimeout(() => nav("/profile"), 500);
    } catch {
      setMsg("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await register(email, password);
      setMsg("Registered and logged in!");
      setTimeout(() => nav("/profile"), 500);
    } catch {
      setMsg("Registration failed. Email may already exist.");
    } finally {
      setIsLoading(false);
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <div className={styles.buttonGroup}>
            <button
              className={styles.button}
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Login"}
            </button>
            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Register"}
            </button>
          </div>

          {msg && (
            <div className={`${styles.message} ${msg.includes("failed") ? styles.error : styles.success}`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
