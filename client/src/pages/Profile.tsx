import { useEffect, useMemo, useState } from "react";
import { updateProfile, User } from "../api/auth";
import { Link } from "react-router-dom";
import styles from "./Profile.module.css";

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
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.notLoggedIn}>You're not logged in.</p>
          <Link to="/auth" className={styles.link}>Go to Login →</Link>
        </div>
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
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>👤 Profile</h1>
          <p className={styles.subtitle}>{user.email}</p>
        </div>

        <div className={styles.avatarSection}>
          <div
            className={styles.avatar}
            title="Click to change color"
            onClick={() => setAvatarColor(randomColor(avatarColor))}
            style={{ background: avatarColor }}
          >
            {initials}
          </div>
          <input
            aria-label="Avatar color"
            type="color"
            value={avatarColor}
            onChange={(e) => setAvatarColor(e.target.value)}
            className={styles.colorPicker}
          />
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} value={user.email} disabled />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>

          <div className={styles.colorGrid}>
            <div className={styles.colorLabel}>Choose Avatar Color</div>
            <div className={styles.colors}>
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`${styles.colorBtn} ${c === avatarColor ? styles.active : ""}`}
                  style={{ background: c }}
                  onClick={() => setAvatarColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          <button className={styles.saveBtn} onClick={save}>
            Save Changes
          </button>
        </div>

        {msg && (
          <div className={`${styles.message} ${msg.includes("Saved") ? styles.success : styles.error}`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
