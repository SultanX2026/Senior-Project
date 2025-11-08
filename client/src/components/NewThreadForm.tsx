import { useState, useEffect } from "react";

export default function NewThreadForm({
  onCreate,
  lockedSymbol
}:{ onCreate:(symbol:string,title:string,stance:"buy"|"sell"|"neutral", body:string)=>Promise<any>, lockedSymbol?: string }){
  const [symbol, setSymbol] = useState(lockedSymbol || "");
  const [title, setTitle] = useState("");
  const [stance, setStance] = useState<"buy"|"sell"|"neutral">("neutral");
  const [body, setBody] = useState("");

  useEffect(()=>{ if(lockedSymbol){ setSymbol(lockedSymbol); } }, [lockedSymbol]);

  const submit = () => {
    if(!symbol || !title || !body) return;
    onCreate(symbol, title, stance, body).then(()=>{ setTitle(""); setBody(""); });
  };

  return (
    <div style={{border:"1px dashed #aaa", padding:12, borderRadius:8}}>
      <h3>New Thread</h3>
      {!lockedSymbol && (
        <input placeholder="Symbol" value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} />
      )}
      {lockedSymbol && <div><b>{lockedSymbol}</b></div>}
      <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} style={{marginLeft:lockedSymbol?0:8}} />
      <select value={stance} onChange={e=>setStance(e.target.value as any)} style={{marginLeft:8}}>
        <option value="buy">buy</option>
        <option value="sell">sell</option>
        <option value="neutral">neutral</option>
      </select>
      <div style={{marginTop:8}}>
        <textarea placeholder="Body (your reasoning)" value={body} onChange={e=>setBody(e.target.value)} rows={3} style={{width:"100%"}} />
      </div>
      <button onClick={submit} style={{marginTop:8}}>Create</button>
    </div>
  );
}
