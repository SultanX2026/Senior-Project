import { useState } from "react";
import { login, register } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  return (
    <div>
      <h1>Login / Register</h1>
      <input placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <button onClick={async ()=>{
        try {
          await login(email, password);
          setMsg("Logged in.");
          nav("/profile"); // jump to profile after login
        } catch {
          setMsg("Login failed");
        }
      }}>Login</button>
      <button onClick={async ()=>{
        try {
          await register(email, password);
          setMsg("Registered and logged in.");
          nav("/profile"); // jump to profile after register
        } catch {
          setMsg("Register failed (email may exist)");
        }
      }}>Register</button>
      {msg && <div style={{marginTop:8}}>{msg}</div>}
    </div>
  );
}
