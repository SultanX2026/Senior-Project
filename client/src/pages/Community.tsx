import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listThreads, createThread, summarizeCommunity } from "../api/community";
import ThreadCard from "../components/ThreadCard";
import NewThreadForm from "../components/NewThreadForm";

export default function Community(){
  const [sp] = useSearchParams();
  const locked = (sp.get("symbol") || "").toUpperCase();
  const [symbol, setSymbol] = useState(locked || "");
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(()=>{ if(locked) setSymbol(locked); }, [locked]);

  const load = async () => {
    setError("");
    const res = await listThreads(symbol || undefined);
    setRows(res.threads || []);
  };
  useEffect(()=>{ if(symbol) load(); else setRows([]); }, [symbol]);

  const onCreate = async (sym:string, title:string, stance:any, body:string) => {
    setError("");
    try {
      await createThread(sym, title, stance, body);
      if(!symbol) setSymbol(sym);
      await load();
    } catch {
      setError("You must be logged in to create threads (401). Use the Login page.");
    }
  };

  const onSummarize = async () => {
    if(!symbol){ setError("Pick a symbol first."); return; }
    const s = await summarizeCommunity(symbol);
    setSummary(s.summary || "");
  };

  return (
    <div>
      <h1>Community {symbol ? `— ${symbol}` : ""}</h1>
      <div style={{ display: "flex", gap: 8 }}>
        {!locked && (
          <input
            placeholder="Type a symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        )}
        {locked && <b>{locked}</b>}
        <button onClick={load} disabled={!symbol}>Refresh</button>
        <button onClick={onSummarize} disabled={!symbol}>Summarize</button>
      </div>

      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}

      {summary && (
        <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12 }}>
          {summary}
        </pre>
      )}

      <NewThreadForm onCreate={onCreate} lockedSymbol={locked || undefined} />

      <div style={{ marginTop: 12 }}>
        {rows.map((t: any) => (
          <ThreadCard key={t._id} t={t} />
        ))}
      </div>
    </div>
  );
}
