import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from './context/AuthContext';

const C = { bg:"#FDFAF6", border:"#E8E0D0", amber:"#D4883A", text:"#2C2416", textMuted:"#A0907A", red:"#D05A4A" };

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, logout } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const from = location.state?.from?.pathname || "/explore";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);

      // Hard block — non-customers must NOT log in here
      if (user.role === "owner" || user.role === "admin" || user.role === "captain") {
        await logout(); // clear the token immediately
        setError(
            user.role === "owner"
                ? "Restaurant owners must sign in at the Owner Portal, not here."
                : user.role === "captain"
                    ? "Staff members must use the Captain login portal."
                    : "Admins must use the Owner Portal."
        );
        setLoading(false);
        return;
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const inp = { width:"100%", padding:"13px 16px", borderRadius:12, border:`1.5px solid ${C.border}`, fontSize:14, color:C.text, fontFamily:"'DM Sans',sans-serif", outline:"none", background:"#fff" };

  return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", fontFamily:"'DM Sans',sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

        {/* Left panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 40px" }}>
          <div style={{ width:"100%", maxWidth:400 }}>

            <div onClick={() => navigate('/')} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:48 }}>
              <span style={{ fontSize:21 }}>🍽️</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.text }}>Table<span style={{ color:C.amber }}>Mint</span></span>
            </div>

            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:C.text, marginBottom:8 }}>Welcome back</h1>
            <p style={{ color:C.textMuted, fontSize:14, marginBottom:36 }}>Sign in to browse and book restaurants</p>

            {error && (
                <div style={{ background:"#FFF5F5", border:`1px solid ${C.red}30`, borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:C.red, lineHeight:1.6 }}>
                  ⚠️ {error}
                  {error.includes("Owner Portal") && (
                      <div style={{ marginTop:8 }}>
                  <span onClick={() => navigate('/owner/login')} style={{ color:C.amber, fontWeight:700, cursor:"pointer", textDecoration:"underline" }}>
                    Go to Owner Portal →
                  </span>
                      </div>
                  )}
                </div>
            )}

            <form onSubmit={handleSubmit}>
              {[
                { label:"Email",    type:"email",    value:email,    set:setEmail,    placeholder:"you@example.com" },
                { label:"Password", type:"password", value:password, set:setPassword, placeholder:"••••••••" },
              ].map(({ label, type, value, set, placeholder }) => (
                  <div key={label} style={{ marginBottom:18 }}>
                    <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:8 }}>{label}</label>
                    <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder} required style={inp}
                           onFocus={e => e.target.style.borderColor=C.amber}
                           onBlur={e => e.target.style.borderColor=C.border} />
                  </div>
              ))}

              <button type="submit" disabled={loading} style={{ width:"100%", padding:"14px", background:loading?C.border:C.amber, border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", marginTop:8, boxShadow:`0 4px 16px ${C.amber}40` }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div style={{ textAlign: "right", marginTop: 10 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: C.amber, fontWeight: 600, textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>

            <p style={{ textAlign:"center", marginTop:20, fontSize:14, color:C.textMuted }}>
              Don't have an account? <Link to="/register" style={{ color:C.amber, fontWeight:700, textDecoration:"none" }}>Create one</Link>
            </p>

            {/* Permanent link to owner portal */}
            <div style={{ marginTop:28, paddingTop:24, borderTop:`1px solid ${C.border}`, textAlign:"center" }}>
              <span style={{ fontSize:13, color:C.textMuted }}>Restaurant owner? </span>
              <span onClick={() => navigate('/owner/login')} style={{ fontSize:13, color:C.amber, fontWeight:700, cursor:"pointer" }}>
              Sign in to Owner Portal →
            </span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex:1, background:`linear-gradient(135deg, #2C2416, #6B5B45)`, display:"flex", alignItems:"center", justifyContent:"center", padding:60, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:"10%", right:"10%", width:200, height:200, background:C.amber+"20", borderRadius:"50%", filter:"blur(80px)" }} />
          <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
            <div style={{ fontSize:80, marginBottom:24 }}>🍽️</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:900, color:"#fff", marginBottom:16, lineHeight:1.2 }}>
              Your perfect table<br /><span style={{ color:C.amber, fontStyle:"italic" }}>awaits.</span>
            </h2>
            <p style={{ color:"rgba(255,255,255,.7)", fontSize:16, lineHeight:1.7, maxWidth:300 }}>
              Book instantly, pre-order your food, and walk in like you own the place.
            </p>
            <div style={{ display:"flex", gap:24, justifyContent:"center", marginTop:40 }}>
              {[{v:"120+",l:"Restaurants"},{v:"4.8★",l:"Rating"},{v:"<60s",l:"To Book"}].map(s => (
                  <div key={s.l} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.amber }}>{s.v}</div>
                    <div style={{ color:"rgba(255,255,255,.6)", fontSize:12, marginTop:3 }}>{s.l}</div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}