import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const C = {
  bg:"#0F1117", bgCard:"#1A1D27", border:"rgba(255,255,255,0.08)",
  amber:"#D4883A", text:"#F0EDE8", textMuted:"rgba(240,237,232,0.4)",
  red:"#D05A4A", purple:"#8B5CF6",
};

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const u = await login(email, password);
      if (u.role !== "superadmin") {
        setError("Access denied. This portal is for TableMint super admins only.");
        setLoading(false);
        return;
      }
      navigate("/superadmin", { replace: true });
    } catch(err) {
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally { setLoading(false); }
  };

  const inp = {
    width:"100%", padding:"13px 16px", borderRadius:10,
    border:`1.5px solid ${C.border}`, background:"rgba(255,255,255,0.05)",
    color:C.text, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none",
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <div style={{ width:"100%", maxWidth:400, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔐</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.text }}>
              Table<span style={{ color:C.amber }}>Mint</span>
            </span>
          </div>
          <div style={{ display:"inline-block", padding:"4px 14px", background:"rgba(139,92,246,0.15)",
            border:"1px solid rgba(139,92,246,0.4)", borderRadius:20 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.purple, letterSpacing:1 }}>SUPER ADMIN</span>
          </div>
          <p style={{ color:C.textMuted, fontSize:13, marginTop:12 }}>Internal verification portal</p>
        </div>

        <div style={{ background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}`, padding:32 }}>
          {error && (
            <div style={{ padding:"10px 14px", background:"rgba(208,90,74,0.15)",
              border:"1px solid rgba(208,90,74,0.4)", borderRadius:8,
              fontSize:13, color:C.red, marginBottom:20 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.textMuted,
                display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="superadmin@tablemint.com" required style={inp}
                onFocus={e => e.target.style.borderColor=C.purple}
                onBlur={e => e.target.style.borderColor=C.border} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.textMuted,
                display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inp}
                onFocus={e => e.target.style.borderColor=C.purple}
                onBlur={e => e.target.style.borderColor=C.border} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"13px", background:loading?"rgba(139,92,246,0.4)":C.purple,
                border:"none", borderRadius:10, color:"#fff", fontSize:15, fontWeight:700,
                cursor:loading?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign:"center", marginTop:20, fontSize:12, color:C.textMuted }}>
          This is an internal portal. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
