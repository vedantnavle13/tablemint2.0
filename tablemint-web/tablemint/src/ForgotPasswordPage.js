import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const C = {
  bg: "#FDFAF6", border: "#E8E0D0", amber: "#D4883A",
  text: "#2C2416", textMuted: "#A0907A", green: "#4A9B6F", red: "#D05A4A",
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true); setError("");
    try {
      await axios.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px", animation: "fadeIn 0.35s ease" }}>

        {/* Logo */}
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40 }}>
          <span style={{ fontSize: 22 }}>🍽️</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.text }}>
            Table<span style={{ color: C.amber }}>Mint</span>
          </span>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: `1px solid ${C.border}` }}>

          {sent ? (
            /* ── Success state ── */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 18 }}>📬</div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                Check your inbox
              </h1>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, marginBottom: 28 }}>
                If an account with <strong style={{ color: C.text }}>{email}</strong> exists, we've sent a password reset link. It expires in 10 minutes.
              </p>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 24 }}>
                Didn't receive it? Check your spam folder, or{" "}
                <span onClick={() => setSent(false)} style={{ color: C.amber, fontWeight: 700, cursor: "pointer" }}>
                  try again
                </span>
                .
              </p>
              <button
                onClick={() => navigate("/login")}
                style={{ width: "100%", padding: "13px", background: C.amber, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Back to Sign In →
              </button>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🔑</div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                  Forgot Password?
                </h1>
                <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
                  Enter your email and we'll send a reset link — works for customers, owners, and admins.
                </p>
              </div>

              {error && (
                <div style={{ background: "#FFF5F5", border: `1px solid ${C.red}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Email Address
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 12,
                      border: `1.5px solid ${C.border}`, fontSize: 14,
                      color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff",
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "14px", background: loading ? C.border : C.amber,
                  border: "none", borderRadius: 12, color: "#fff",
                  fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : `0 4px 16px ${C.amber}40`,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {loading ? (
                    <>
                      <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Sending link…
                    </>
                  ) : "Send Reset Link →"}
                </button>
              </form>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <Link to="/login" style={{ fontSize: 13, color: C.textMuted, textDecoration: "none", fontWeight: 600 }}>
                  ← Customer Login
                </Link>
                <Link to="/owner/login" style={{ fontSize: 13, color: C.textMuted, textDecoration: "none", fontWeight: 600 }}>
                  Owner / Admin Login →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
