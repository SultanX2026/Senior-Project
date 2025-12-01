// client/src/pages/Community.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listThreads,
  createThread,
  Thread,
} from "../api/community";
import ThreadCard from "../components/ThreadCard";
import NewThreadForm from "../components/NewThreadForm";
import styles from "./Community.module.css";

export default function Community() {
  const [sp] = useSearchParams();
  const locked = (sp.get("symbol") || "").toUpperCase();
  const [symbol, setSymbol] = useState(locked || "");
  const [rows, setRows] = useState<Thread[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (locked) setSymbol(locked);
  }, [locked]);

  const load = async () => {
    setError("");
    const res = await listThreads(symbol || undefined);
    setRows(res.threads ?? []);
  };

  useEffect(() => {
    if (symbol) load();
    else setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const onCreate = async (sym: string, title: string, stance: any, body: string) => {
    setError("");
    try {
      await createThread(sym, title, stance, body);
      if (!symbol) setSymbol(sym);
      await load();
    } catch {
      setError("You must be logged in to create threads (401). Use the Login page.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>💬 Community {symbol ? `— ${symbol}` : ""}</h1>
        <p className={styles.subtitle}>Share your thoughts and insights with the community</p>
      </div>

      <div className={styles.controls}>
        {!locked && (
          <input
            className={styles.symbolInput}
            placeholder="Type a symbol to filter (e.g., AAPL)..."
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        )}
        {locked && <div className={styles.lockedSymbol}>{locked}</div>}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <NewThreadForm onCreate={onCreate} lockedSymbol={locked || undefined} />

      <div className={styles.threadsContainer}>
        {rows.length === 0 ? (
          <div className={styles.empty}>
            <p>No threads yet. Be the first to create one!</p>
          </div>
        ) : (
          rows.map((t) => (
            <ThreadCard key={t._id} t={t} />
          ))
        )}
      </div>
    </div>
  );
}
