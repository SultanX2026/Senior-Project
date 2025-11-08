import { useEffect, useState } from "react";
import { addComment, listComments, vote } from "../api/community";

export default function ThreadCard({ t }:{ t:any }){
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [counts, setCounts] = useState({up: t.up||0, down: t.down||0});

  const load = async ()=>{
    const res = await listComments(t._id);
    setRows(res.comments || []);
  };
  useEffect(()=>{ if(open) load(); }, [open]);

  const net = (counts.up - counts.down);

  const onVote = async (upvote:boolean)=>{
    const updated = await vote("thread", t._id, upvote);
    setCounts({up: updated.up||0, down: updated.down||0});
  };
  const onAdd = async ()=>{
    if(!body.trim()) return;
    const c = await addComment(t._id, body.trim());
    setBody("");
    setRows([...rows, c]);
  };

  return (
    <div style={{border:"1px solid #ddd", borderRadius:8, padding:12, marginBottom:8}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:'center'}}>
        <strong>{t.title}</strong>
        <span style={{whiteSpace:'nowrap'}}>stance: {t.stance} · RS: {Number(t.reliabilityScore||0).toFixed(2)}</span>
      </div>
      {t.body && <div style={{marginTop:8, color:"#333"}}>{t.body}</div>}
      <div style={{display:"flex", alignItems:"center", gap:8, marginTop:8}}>
        <button onClick={()=>onVote(true)}>▲ {counts.up}</button>
        <span style={{minWidth:24, textAlign:"center"}}>{net}</span>
        <button onClick={()=>onVote(false)}>▼ {counts.down}</button>
        <button onClick={()=>setOpen(v=>!v)} style={{marginLeft:'auto'}}>{open? 'Hide' : 'Comments'}</button>
      </div>
      {open && (
        <div style={{marginTop:8}}>
          <div style={{display:'flex', gap:8}}>
            <input placeholder="Write a comment..." value={body} onChange={e=>setBody(e.target.value)} style={{flex:1}} />
            <button onClick={onAdd}>Post</button>
          </div>
          <div style={{marginTop:8}}>
            {rows.map((c:any)=> (
              <div key={c._id} style={{padding:'8px 0', borderTop:'1px solid #eee'}}>{c.body}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
