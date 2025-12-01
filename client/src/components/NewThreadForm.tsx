import { useState, useEffect, useMemo } from "react";
import styles from "./NewThreadForm.module.css";

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export default function NewThreadForm({
  onCreate,
  lockedSymbol
}:{
  onCreate:(symbol:string,title:string,stance:"buy"|"sell"|"neutral", body:string)=>Promise<any>,
  lockedSymbol?: string
}){
  const [symbol, setSymbol] = useState(lockedSymbol || "");
  const [title, setTitle] = useState("");
  const [stance, setStance] = useState<"buy"|"sell"|"neutral">("neutral");
  const [body, setBody] = useState("");

  useEffect(()=>{ if(lockedSymbol){ setSymbol(lockedSymbol); } }, [lockedSymbol]);

  const titleWords = useMemo(() => wordCount(title), [title]);
  const overLimit = titleWords > 300;

  const submit = () => {
    if (!symbol || !title || !body || overLimit) return;
    onCreate(symbol, title.trim(), stance, body.trim()).then(()=>{
      setTitle(""); setBody("");
    });
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>✍️ New Thread</h3>
      
      {!lockedSymbol && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Symbol</label>
          <input
            className={`${styles.input} ${styles.symbolInput}`}
            placeholder="Enter stock symbol (e.g., AAPL)"
            value={symbol}
            onChange={e=>setSymbol(e.target.value.toUpperCase())}
          />
        </div>
      )}
      
      {lockedSymbol && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Symbol</label>
          <div className={styles.symbolDisplay}>{lockedSymbol}</div>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>Title (max 300 words)</label>
        <div className={styles.titleGroup}>
          <input
            className={`${styles.input} ${styles.titleInput}`}
            placeholder="What's your insight?"
            value={title}
            onChange={e=>setTitle(e.target.value)}
          />
          <span className={`${styles.wordCount} ${overLimit ? styles.over : ""}`}>
            {titleWords}/300
          </span>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Stance</label>
        <select 
          className={styles.select}
          value={stance} 
          onChange={e=>setStance(e.target.value as any)}
        >
          <option value="buy">🟢 Buy</option>
          <option value="sell">🔴 Sell</option>
          <option value="neutral">⚪ Neutral</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Your Reasoning</label>
        <textarea
          className={styles.textarea}
          placeholder="Explain your perspective and reasoning..."
          value={body}
          onChange={e=>setBody(e.target.value)}
        />
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.submitButton}
          onClick={submit}
          disabled={!symbol || !title.trim() || !body.trim() || overLimit}
          title={overLimit ? "Title exceeds 300-word limit" : ""}
        >
          Create Thread
        </button>
      </div>

      {overLimit && (
        <div className={styles.errorMessage}>
          ⚠️ Title is over 300 words. Please shorten it.
        </div>
      )}
    </div>
  );
}
