import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const C = {
  bg: "#FDFAF6", border: "#E8E0D0", amber: "#D4883A",
  text: "#2C2416", textMuted: "#A0907A", green: "#4A9B6F", red: "#D05A4A",
};

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  // If no token in URL, redirect
  useEffect(() => {
    if (!token) navigate("/forgot-password", { replace: true });
  }, [token, navigate]);

  const isStrongPassword = (pwd) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) {
      setError("Password must be at least 8 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 number.");
      return;
    }
    if (password !== confirm)  { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await axios.patch(`/auth/reset-password/${token}`, { password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%", padding: "13px 16px", borderRadius: 12,
    border: `1.5px solid ${C.border}`, fontSize: 14,
    color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px", animation: "fadeIn 0.35s ease" }}>

        {/* Logo */}
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40 }}>
          <span style={{ fontSize: 22 }}>🍽️</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.text }}>
            Table<span style={{ color: C.amber }}>Mint</span>
          </span>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: `1px solid ${C.border}` }}>

          {done ? (
            /* ── Success state ── */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 18 }}>🎉</div>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                Password Reset!
              </h1>
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, marginBottom: 28 }}>
                Your password has been reset successfully. You're now signed in!
              </p>
              <button
                onClick={() => navigate("/")}
                style={{ width: "100%", padding: "13px", background: C.amber, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
                Go to Home →
              </button>
              <button
                onClick={() => navigate("/login")}
                style={{ width: "100%", padding: "13px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                  Set New Password
                </h1>
                <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
                  Choose a strong password — at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.
                </p>
              </div>

              {error && (
                <div style={{ background: "#FFF5F5", border: `1px solid ${C.red}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red, lineHeight: 1.5 }}>
                  ⚠️ {error}
                  {error.includes("expired") && (
                    <div style={{ marginTop: 8 }}>
                      <Link to="/forgot-password" style={{ color: C.amber, fontWeight: 700, fontSize: 13 }}>
                        Request a new link →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* New Password */}
                <div style={{ marginBottom: 16, position: "relative" }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    New Password
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    style={inp}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{
                    position: "absolute", right: 14, top: 40,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 16, color: C.textMuted, padding: 0,
                  }}>
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Confirm Password
                  </label>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" required
                    style={{
                      ...inp,
                      borderColor: confirm && confirm !== password ? C.red : confirm && confirm === password ? C.green : C.border,
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? C.red : confirm && confirm === password ? C.green : C.border}
                  />
                  {confirm && confirm !== password && (
                    <p style={{ fontSize: 12, color: C.red, marginTop: 4 }}>Passwords do not match</p>
                  )}
                  {confirm && confirm === password && (
                    <p style={{ fontSize: 12, color: C.green, marginTop: 4 }}>✓ Passwords match</p>
                  )}
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
                      Resetting…
                    </>
                  ) : "Reset Password →"}
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: "center" }}>
                <Link to="/forgot-password" style={{ fontSize: 13, color: C.textMuted, textDecoration: "none" }}>
                  ← Back to Forgot Password
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
