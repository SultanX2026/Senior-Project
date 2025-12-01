import { useEffect, useMemo, useState } from "react";
import { updateProfile, setupSecurityQuestion, getSecurityQuestions, User } from "../api/auth";
import { Link, useOutletContext } from "react-router-dom";
import styles from "./Profile.module.css";

type ThemeContextType = { theme: "dark" | "light"; toggleTheme: () => void };

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
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(false);
  const [editingSecurityQ, setEditingSecurityQ] = useState(false);
  const [securityMsg, setSecurityMsg] = useState("");
  const [isSavingSecurityQ, setIsSavingSecurityQ] = useState(false);
  const { theme, toggleTheme } = useOutletContext<ThemeContextType>();

  const readUser = () => {
    try {
      const raw = localStorage.getItem("sl_user");
      if (!raw) {
        setUser(null);
        setUsername("");
        setAvatarColor(randomColor());
        return;
      }
      const parsed = JSON.parse(raw) as User & { avatarColor?: string };
      setUser(parsed);
      setUsername(parsed ? (parsed.username || parsed.email.split("@")[0]) : "");
      setAvatarColor(parsed?.["avatarColor"] || randomColor());
    } catch (err) {
      console.error("Error parsing user from localStorage:", err);
      localStorage.removeItem("sl_user");
      setUser(null);
      setUsername("");
      setAvatarColor(randomColor());
    }
  };

  // Fetch security questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const qs = await getSecurityQuestions();
        setQuestions(qs);
        if (qs.length > 0) {
          setSecurityQuestion(qs[0]);
        }
      } catch (err) {
        console.error("Failed to fetch security questions:", err);
      }
    };
    fetchQuestions();
  }, []);

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
      // Local best-effort so UI stays consistent even if backend hasn't added avatarColor yet
      const updated = { ...user, username, avatarColor };
      localStorage.setItem("sl_user", JSON.stringify(updated));
      setUser(updated);
      setMsg("Saved locally.");
    }
  };

  const saveSecurityQuestion = async () => {
    if (!securityQuestion) {
      setSecurityMsg("Please select a security question");
      return;
    }
    if (!securityAnswer.trim()) {
      setSecurityMsg("Please provide an answer");
      return;
    }
    if (securityAnswer.trim().length < 2) {
      setSecurityMsg("Answer must be at least 2 characters");
      return;
    }

    setIsSavingSecurityQ(true);
    setSecurityMsg(""); // Clear previous message
    try {
      await setupSecurityQuestion(securityQuestion, securityAnswer);
      setSecurityMsg("Security question saved successfully!");
      setHasSecurityQuestion(true);
      setEditingSecurityQ(false);
      setSecurityAnswer("");
      // Clear message after 3 seconds
      setTimeout(() => setSecurityMsg(""), 3000);
    } catch (err: any) {
      console.error("Security question error:", err);
      const error = err?.response?.data?.error || err?.message || "Failed to save security question";
      if (err?.code === "ERR_NETWORK" || err?.message?.includes("Network")) {
        setSecurityMsg("Network error: Check your connection and try again");
      } else {
        setSecurityMsg(`Error: ${error}`);
      }
    } finally {
      setIsSavingSecurityQ(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>👤 Profile</h1>
          <p className={styles.subtitle}>{user.email}</p>
          <button 
            className={styles.themeToggle}
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
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

        {/* Security Question Section */}
        <div className={styles.securityCard}>
          <div className={styles.securityHeader}>
            <h2 className={styles.securityTitle}>🔒 Security Question</h2>
            <p className={styles.securitySubtitle}>Use this to recover your account if you forget your password</p>
          </div>

          {!editingSecurityQ ? (
            <button 
              className={styles.editSecurityBtn}
              onClick={() => setEditingSecurityQ(true)}
            >
              {hasSecurityQuestion ? "Update Security Question" : "Set Up Security Question"}
            </button>
          ) : (
            <div className={styles.securityForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select a Question</label>
                <select
                  className={styles.select}
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  disabled={isSavingSecurityQ}
                >
                  {questions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Your Answer</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Enter your answer"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  disabled={isSavingSecurityQ}
                  autoComplete="off"
                />
              </div>

              <div className={styles.securityButtonGroup}>
                <button 
                  className={styles.saveBtn}
                  onClick={saveSecurityQuestion}
                  disabled={isSavingSecurityQ}
                >
                  {isSavingSecurityQ ? "Saving..." : "Save Question"}
                </button>
                <button 
                  className={styles.cancelBtn}
                  onClick={() => {
                    setEditingSecurityQ(false);
                    setSecurityAnswer("");
                  }}
                  disabled={isSavingSecurityQ}
                >
                  Cancel
                </button>
              </div>

              {securityMsg && (
                <div className={`${styles.message} ${securityMsg.includes("successfully") ? styles.success : styles.error}`}>
                  {securityMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
