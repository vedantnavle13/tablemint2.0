import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from './context/AuthContext';

const C = { bg:"#FDFAF6", border:"#E8E0D0", amber:"#D4883A", text:"#2C2416", textMid:"#6B5B45", textMuted:"#A0907A", red:"#D05A4A" };

export default function RegisterPage() {
    const navigate  = useNavigate();
    const { register } = useAuth();
    const [name, setName]         = useState("");
    const [email, setEmail]       = useState("");
    const [phone, setPhone]       = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm]   = useState("");
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    const inp = {
        width:"100%", padding:"13px 16px", borderRadius:12,
        border:`1.5px solid ${C.border}`, fontSize:14, color:C.text,
        fontFamily:"'DM Sans',sans-serif", outline:"none", background:"#fff",
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            const data = await register({ name, email, phone, password, role: "customer" });
            navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`, { replace: true });
        } catch (err) {
            if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                setError("Server is waking up — this can take up to 60 seconds on first use. Please try again.");
            } else {
                setError(err.response?.data?.message || "Registration failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight:"100vh", background:C.bg, display:"flex", fontFamily:"'DM Sans',sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

            {/* Left form panel */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 40px" }}>
                <div style={{ width:"100%", maxWidth:420 }}>

                    <div onClick={() => navigate('/')} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:48 }}>
                        <span style={{ fontSize:21 }}>🍽️</span>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.text }}>
                            Table<span style={{ color:C.amber }}>Mint</span>
                        </span>
                    </div>

                    <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:C.text, marginBottom:8 }}>
                        Create account
                    </h1>
                    <p style={{ color:C.textMuted, fontSize:14, marginBottom:32 }}>
                        Join TableMint and start booking your favourite restaurants
                    </p>

                    {error && (
                        <div style={{ background:"#FFF5F5", border:`1px solid ${C.red}30`, borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:13, color:C.red }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {[
                            { label:"Full Name",        type:"text",     value:name,     set:setName,     placeholder:"John Doe" },
                            { label:"Email",            type:"email",    value:email,    set:setEmail,    placeholder:"you@example.com" },
                            { label:"Phone (optional)", type:"tel",      value:phone,    set:setPhone,    placeholder:"+91 98765 43210" },
                            { label:"Password",         type:"password", value:password, set:setPassword, placeholder:"Min. 6 characters" },
                            { label:"Confirm Password", type:"password", value:confirm,  set:setConfirm,  placeholder:"Re-enter password" },
                        ].map(({ label, type, value, set, placeholder }) => (
                            <div key={label} style={{ marginBottom:16 }}>
                                <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:7 }}>{label}</label>
                                <input
                                    type={type} value={value} required={label !== "Phone (optional)"}
                                    onChange={e => set(e.target.value)} placeholder={placeholder}
                                    style={inp}
                                    onFocus={e => e.target.style.borderColor = C.amber}
                                    onBlur={e => e.target.style.borderColor = C.border}
                                />
                            </div>
                        ))}

                        <button type="submit" disabled={loading} style={{
                            width:"100%", padding:"14px", marginTop:8,
                            background:loading ? C.border : C.amber,
                            border:"none", borderRadius:12, color:"#fff",
                            fontSize:15, fontWeight:700, cursor:loading ? "not-allowed" : "pointer",
                            boxShadow:`0 4px 16px ${C.amber}40`,
                        }}>
                            {loading ? "Creating account… (may take ~30s on first use)" : "Create Account →"}
                        </button>
                    </form>

                    <p style={{ textAlign:"center", marginTop:24, fontSize:14, color:C.textMuted }}>
                        Already have an account?{" "}
                        <Link to="/login" style={{ color:C.amber, fontWeight:700, textDecoration:"none" }}>Sign in</Link>
                    </p>

                    <div style={{ marginTop:28, paddingTop:24, borderTop:`1px solid ${C.border}`, textAlign:"center" }}>
                        <span style={{ fontSize:13, color:C.textMuted }}>Restaurant owner? </span>
                        <span onClick={() => navigate('/owner/login')} style={{ fontSize:13, color:C.amber, fontWeight:700, cursor:"pointer" }}>
                            Register your restaurant →
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
                        Discover Pune's<br /><span style={{ color:C.amber, fontStyle:"italic" }}>finest tables.</span>
                    </h2>
                    <p style={{ color:"rgba(255,255,255,.7)", fontSize:16, lineHeight:1.7, maxWidth:300 }}>
                        Browse 120+ restaurants, book instantly, and pre-order your favourite dishes.
                    </p>
                    <div style={{ display:"flex", gap:24, justifyContent:"center", marginTop:40 }}>
                        {[{v:"120+",l:"Restaurants"},{v:"4.8★",l:"Rating"},{v:"Free",l:"To Join"}].map(s => (
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
