import { useState, useEffect } from "react";
import { register, getSecurityQuestions } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Auth.module.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  // Fetch security questions on component mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const qs = await getSecurityQuestions();
        setQuestions(qs);
        if (qs.length > 0) {
          setSecurityQuestion(qs[0]); // Set first question as default
        }
      } catch (err) {
        console.error("Failed to fetch security questions:", err);
      }
    };
    fetchQuestions();
  }, []);

  const validateForm = () => {
    // Email validation
    if (!email.trim()) {
      setMsg("Please enter an email address");
      return false;
    }
    if (!email.includes("@")) {
      setMsg("Please enter a valid email address");
      return false;
    }

    // Username validation
    if (!username.trim()) {
      setMsg("Please enter a username");
      return false;
    }
    if (username.length < 2) {
      setMsg("Username must be at least 2 characters");
      return false;
    }
    if (username.length > 24) {
      setMsg("Username must be less than 24 characters");
      return false;
    }
    // Check for valid username characters
    if (!/^[A-Za-z0-9_\-\.]+$/.test(username)) {
      setMsg("Username can only contain letters, numbers, dots, dashes, and underscores");
      return false;
    }

    // Password validation
    if (!password) {
      setMsg("Please enter a password");
      return false;
    }
    if (password.length < 6) {
      setMsg("Password must be at least 6 characters");
      return false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      setMsg("Please confirm your password");
      return false;
    }
    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      return false;
    }

    // Security question validation (optional during registration)
    if (securityQuestion && !securityAnswer.trim()) {
      setMsg("Please provide an answer to the security question");
      return false;
    }
    if (securityAnswer && securityAnswer.trim().length < 2) {
      setMsg("Security answer must be at least 2 characters");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, username, securityQuestion, securityAnswer);
      setMsg("Registration successful! Redirecting to profile...");
      setTimeout(() => nav("/profile"), 1000);
    } catch (err: any) {
      const error = err?.response?.data?.error || err?.message || "Registration failed";
      if (error === "exists") {
        setMsg("Email already exists. Please use a different email.");
      } else if (error.includes("username")) {
        setMsg(`${error}`);
      } else if (error.includes("password")) {
        setMsg(`${error}`);
      } else {
        setMsg(`Registration failed: ${error}`);
      }
      console.error("Register error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRegister();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>🔐 Create Account</h1>
          <p className={styles.subtitle}>Join Stock Lens today</p>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
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
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              type="text"
              placeholder="john_doe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              autoComplete="username"
            />
            <div style={{ fontSize: "12px", color: "#a0a0c0", marginTop: "4px" }}>
              2-24 characters: letters, numbers, dots, dashes, underscores
            </div>
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
              autoComplete="new-password"
            />
            <div style={{ fontSize: "12px", color: "#a0a0c0", marginTop: "4px" }}>
              Minimum 6 characters
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.divider} style={{ margin: "24px 0", height: "1px", background: "#2d2d44" }}></div>

          <div style={{ fontSize: "14px", color: "#a0a0c0", marginBottom: "16px", fontWeight: "600" }}>
            🔒 Security Question <span style={{ fontSize: "12px", color: "#888" }}>(Optional - Set up later in profile)</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Select a Security Question</label>
            <select
              className={styles.select}
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Skip for now</option>
              {questions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          {securityQuestion && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Your Answer</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Enter your answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                autoComplete="off"
              />
              <div style={{ fontSize: "12px", color: "#a0a0c0", marginTop: "4px" }}>
                This will help you recover your account if you forget your password
              </div>
            </div>
          )}

          <button
            className={styles.button}
            onClick={handleRegister}
            disabled={isLoading}
            style={{ marginTop: "20px" }}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>

          {msg && (
            <div
              className={`${styles.message} ${
                msg.includes("failed") || msg.includes("do not match") || msg.includes("already")
                  ? styles.error
                  : msg.includes("successful")
                  ? styles.success
                  : styles.error
              }`}
            >
              {msg}
            </div>
          )}

          <p className={styles.footerText}>
            Already have an account? <Link to="/auth" className={styles.link}>Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
