import { useState, useEffect, useMemo } from "react";

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
    <div style={{border:"1px dashed #aaa", padding:12, borderRadius:8}}>
      <h3>New Thread</h3>
      {!lockedSymbol && (
        <input
          placeholder="Symbol"
          value={symbol}
          onChange={e=>setSymbol(e.target.value.toUpperCase())}
        />
      )}
      {lockedSymbol && <div><b>{lockedSymbol}</b></div>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <input
          placeholder="Title (max 300 words)"
          value={title}
          onChange={e=>setTitle(e.target.value)}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, color: overLimit ? "#b91c1c" : "#666" }}>
          {titleWords}/300
        </span>
      </div>

      <select value={stance} onChange={e=>setStance(e.target.value as any)} style={{marginTop:8}}>
        <option value="buy">buy</option>
        <option value="sell">sell</option>
        <option value="neutral">neutral</option>
      </select>

      <div style={{marginTop:8}}>
        <textarea
          placeholder="Body (your reasoning)"
          value={body}
          onChange={e=>setBody(e.target.value)}
          rows={3}
          style={{width:"100%"}}
        />
      </div>

      <button
        onClick={submit}
        style={{marginTop:8}}
        disabled={!symbol || !title.trim() || !body.trim() || overLimit}
        title={overLimit ? "Title exceeds 300-word limit" : ""}
      >
        Create
      </button>
      {overLimit && (
        <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 12 }}>
          Title is over 300 words. Please shorten it.
        </div>
      )}
    </div>
  );
}
