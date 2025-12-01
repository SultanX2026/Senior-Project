import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  getSecurityQuestions,
  verifySecurityQuestion,
  resetPassword,
} from "../api/auth";
import styles from "./Auth.module.css";

type Step = "email" | "question" | "password" | "success";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const q = await getSecurityQuestions();
      setQuestions(q);
    } catch (err: any) {
      setMsg("Failed to load security questions");
      console.error(err);
    }
  };

  const handleVerifyEmail = async () => {
    if (!email) {
      setMsg("Please enter your email");
      return;
    }
    setIsLoading(true);
    try {
      // We just move to the next step - the actual verification happens with the answer
      setStep("question");
      setMsg("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyQuestion = async () => {
    if (!selectedQuestion || !answer) {
      setMsg("Please select a question and provide an answer");
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifySecurityQuestion(email, answer);
      setResetToken(result.resetToken);
      setStep("password");
      setMsg("");
    } catch (err: any) {
      setMsg(err.message || "Answer verification failed");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setMsg("Please enter and confirm your new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setStep("success");
      setMsg("");
      setTimeout(() => nav("/auth"), 2000);
    } catch (err: any) {
      setMsg(err.message || "Password reset failed");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>🔑 Reset Password</h1>
          <p className={styles.subtitle}>Recover your account</p>
        </div>

        <div className={styles.form}>
          {step === "email" && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                className={styles.button}
                onClick={handleVerifyEmail}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Continue"}
              </button>
            </>
          )}

          {step === "question" && (
            <>
              <p className={styles.stepInfo}>
                Answer your security question to verify your identity
              </p>
              <div className={styles.formGroup}>
                <label className={styles.label}>Security Question</label>
                <select
                  className={styles.input}
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select a question</option>
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
                  placeholder="Your answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                className={styles.button}
                onClick={handleVerifyQuestion}
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify"}
              </button>

              <button
                className={`${styles.button} ${styles.secondary}`}
                onClick={() => {
                  setStep("email");
                  setSelectedQuestion("");
                  setAnswer("");
                }}
                disabled={isLoading}
              >
                Back
              </button>
            </>
          )}

          {step === "password" && (
            <>
              <p className={styles.stepInfo}>Create your new password</p>
              <div className={styles.formGroup}>
                <label className={styles.label}>New Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Confirm Password</label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <button
                className={styles.button}
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                className={`${styles.button} ${styles.secondary}`}
                onClick={() => {
                  setStep("question");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={isLoading}
              >
                Back
              </button>
            </>
          )}

          {step === "success" && (
            <>
              <div className={`${styles.message} ${styles.success}`}>
                ✓ Password reset successfully! Redirecting to login...
              </div>
            </>
          )}

          {msg && (
            <div className={`${styles.message} ${msg.includes("failed") || msg.includes("not") ? styles.error : styles.success}`}>
              {msg}
            </div>
          )}

          {step === "email" && (
            <p className={styles.footerText}>
              Remember your password? <Link to="/auth" className={styles.link}>Login here</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
