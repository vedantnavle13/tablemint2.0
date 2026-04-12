import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "axios";

const C = {
  bg:"#0F1117", bgCard:"#1A1D27", bgSoft:"#22263A",
  border:"rgba(255,255,255,0.08)", amber:"#D4883A", amberSoft:"rgba(212,136,58,0.15)",
  text:"#F0EDE8", textMid:"rgba(240,237,232,0.7)", textMuted:"rgba(240,237,232,0.4)",
  green:"#4A9B6F", greenSoft:"rgba(74,155,111,0.15)",
  red:"#D05A4A", redSoft:"rgba(208,90,74,0.15)",
  blue:"#4A7B9D", blueSoft:"rgba(74,123,157,0.15)",
  purple:"#8B5CF6", purpleSoft:"rgba(139,92,246,0.15)",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');`;

const STATUS = {
  pending:  { label:"Pending",  color:C.amber,  bg:C.amberSoft  },
  verified: { label:"Live",     color:C.green,  bg:C.greenSoft  },
  rejected: { label:"Rejected", color:C.red,    bg:C.redSoft    },
};

function Badge({ status }) {
  const s = STATUS[status] || { label:status, color:C.textMuted, bg:"transparent" };
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20,
      background:s.bg, color:s.color, border:`1px solid ${s.color}40`,
      textTransform:"uppercase", letterSpacing:0.5 }}>
      {s.label}
    </span>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`,
      padding:"20px 24px", flex:1 }}>
      <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:color||C.amber }}>{value}</div>
    </div>
  );
}

// ── Verify Modal ──────────────────────────────────────────────────────────────
function VerifyModal({ restaurant, onClose, onVerified, onRejected }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) { setError("OTP must be 6 digits."); return; }
    setLoading(true); setError("");
    try {
      const res = await axios.post(`/superadmin/restaurants/${restaurant._id}/verify`, { otp });
      onVerified(restaurant._id, res.data.message);
    } catch(e) {
      setError(e.response?.data?.message || "Verification failed.");
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!window.confirm(`Reject "${restaurant.name}"? This will mark it as rejected.`)) return;
    setRejecting(true);
    try {
      await axios.post(`/superadmin/restaurants/${restaurant._id}/reject`);
      onRejected(restaurant._id);
    } catch(e) {
      setError(e.response?.data?.message || "Rejection failed.");
    } finally { setRejecting(false); }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.bgCard, borderRadius:20,
        border:`1px solid ${C.border}`, padding:32, maxWidth:480, width:"100%",
        boxShadow:"0 24px 60px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700,
              color:C.text, marginBottom:4 }}>Verify Restaurant</h2>
            <p style={{ fontSize:13, color:C.textMuted }}>{restaurant.name}</p>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            fontSize:22, color:C.textMuted, cursor:"pointer" }}>×</button>
        </div>

        {/* Restaurant info */}
        <div style={{ background:C.bgSoft, borderRadius:12, padding:16, marginBottom:24 }}>
          {[
            ["Owner", restaurant.owner?.name],
            ["Email", restaurant.owner?.email],
            ["Phone", restaurant.owner?.phone || "—"],
            ["Address", [restaurant.address?.area, restaurant.address?.city].filter(Boolean).join(", ") || "—"],
            ["Cuisine", restaurant.cuisine?.join(", ") || "—"],
            ["Res Fee", `₹${restaurant.reservationFee || 0}`],
          ].map(([label, value]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between",
              padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.textMuted, fontWeight:600 }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{value}</span>
            </div>
          ))}
        </div>

        {/* OTP entry */}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, fontWeight:700, color:C.textMuted,
            display:"block", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>
            Enter OTP (shared by restaurant owner)
          </label>
          <input
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="6-digit OTP"
            maxLength={6}
            style={{ width:"100%", padding:"14px 18px", borderRadius:12,
              border:`2px solid ${otp.length===6?C.green:C.border}`,
              background:C.bgSoft, color:C.text,
              fontSize:24, fontFamily:"monospace", fontWeight:700,
              outline:"none", letterSpacing:6, textAlign:"center",
              transition:"border 0.2s" }}
          />
        </div>

        {error && (
          <div style={{ padding:"10px 14px", background:C.redSoft, border:`1px solid ${C.red}40`,
            borderRadius:8, fontSize:13, color:C.red, marginBottom:16 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={handleVerify} disabled={loading || otp.length!==6}
            style={{ flex:2, padding:"13px", background:otp.length===6?C.green:"rgba(255,255,255,0.05)",
              border:"none", borderRadius:12, color:otp.length===6?"#fff":C.textMuted,
              fontSize:15, fontWeight:700, cursor:otp.length===6?"pointer":"not-allowed",
              fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}>
            {loading ? "Verifying…" : "✓ Verify & Make Live"}
          </button>
          <button onClick={handleReject} disabled={rejecting}
            style={{ flex:1, padding:"13px", background:C.redSoft,
              border:`1px solid ${C.red}40`, borderRadius:12, color:C.red,
              fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            {rejecting ? "…" : "✗ Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main SuperAdmin Portal ────────────────────────────────────────────────────
export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn, loading: authLoading } = useAuth();

  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || user?.role !== "superadmin")) {
      navigate("/superadmin/login");
    }
  }, [isLoggedIn, authLoading, user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, restRes] = await Promise.all([
        axios.get("/superadmin/stats"),
        axios.get(`/superadmin/restaurants${filter !== "all" ? `?status=${filter}` : ""}`),
      ]);
      setStats(statsRes.data.data);
      setRestaurants(restRes.data.data.restaurants || []);
    } catch(e) {}
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { if (isLoggedIn && user?.role === "superadmin") fetchData(); }, [fetchData, isLoggedIn, user]);

  const handleVerified = (id, msg) => {
    setRestaurants(p => p.map(r => r._id===id ? {...r, verificationStatus:"verified", isActive:true} : r));
    setSelected(null);
    setSuccessMsg(msg);
    fetchData(); // refresh stats
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleRejected = (id) => {
    setRestaurants(p => p.map(r => r._id===id ? {...r, verificationStatus:"rejected", isActive:false} : r));
    setSelected(null);
    fetchData();
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (authLoading) return null;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text }}>
      <style>{`${FONTS} *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}`}</style>

      {/* Nav */}
      <nav style={{ background:C.bgCard, borderBottom:`1px solid ${C.border}`,
        padding:"0 5%", height:64, display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>🍽️</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:C.text }}>
            Table<span style={{ color:C.amber }}>Mint</span>
          </span>
          <div style={{ marginLeft:8, padding:"4px 12px", background:C.purpleSoft,
            border:`1px solid ${C.purple}40`, borderRadius:20 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.purple, letterSpacing:0.5 }}>
              SUPER ADMIN
            </span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:13, color:C.textMuted }}>{user?.name}</span>
          <button onClick={handleLogout}
            style={{ padding:"7px 16px", background:"transparent", border:`1px solid ${C.border}`,
              borderRadius:8, color:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"36px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700,
            color:C.text, marginBottom:4 }}>Restaurant Verification Portal</h1>
          <p style={{ color:C.textMuted, fontSize:14 }}>
            Review and verify restaurants submitted by owners. Enter the OTP shared during the site visit to activate a restaurant.
          </p>
        </div>

        {/* Success message */}
        {successMsg && (
          <div style={{ padding:"14px 20px", background:C.greenSoft, border:`1px solid ${C.green}40`,
            borderRadius:12, fontSize:14, color:C.green, fontWeight:600, marginBottom:24 }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display:"flex", gap:16, marginBottom:32 }}>
            <StatCard icon="🏢" label="Total Restaurants" value={stats.restaurants.total} />
            <StatCard icon="⏳" label="Pending Verification" value={stats.restaurants.pending} color={C.amber} />
            <StatCard icon="✅" label="Live on TableMint" value={stats.restaurants.verified} color={C.green} />
            <StatCard icon="❌" label="Rejected" value={stats.restaurants.rejected} color={C.red} />
            <StatCard icon="👥" label="Total Owners" value={stats.users.owners} color={C.blue} />
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {[
            { id:"all", label:"All" },
            { id:"pending", label:"⏳ Pending" },
            { id:"verified", label:"✅ Live" },
            { id:"rejected", label:"❌ Rejected" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding:"8px 18px", borderRadius:20, fontSize:13, fontWeight:600,
                cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
                background:filter===f.id ? C.amber : C.bgSoft,
                color:filter===f.id ? "#fff" : C.textMuted,
                transition:"all 0.15s" }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Restaurants list */}
        {loading ? (
          <div style={{ padding:60, textAlign:"center", color:C.textMuted }}>Loading restaurants…</div>
        ) : restaurants.length === 0 ? (
          <div style={{ padding:60, textAlign:"center", background:C.bgCard,
            borderRadius:16, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏢</div>
            <p style={{ color:C.textMuted, fontSize:14 }}>No restaurants found for this filter.</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {restaurants.map(r => (
              <div key={r._id}
                style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`,
                  padding:"20px 24px", display:"flex", alignItems:"center", gap:20,
                  transition:"all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="rgba(212,136,58,0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor=C.border}>

                {/* Status bar */}
                <div style={{ width:4, height:60, borderRadius:4, flexShrink:0,
                  background:STATUS[r.verificationStatus]?.color || C.textMuted }} />

                {/* Info */}
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18,
                      fontWeight:700, color:C.text }}>{r.name}</h3>
                    <Badge status={r.verificationStatus} />
                  </div>
                  <div style={{ display:"flex", gap:20, fontSize:13, color:C.textMuted, flexWrap:"wrap" }}>
                    <span>👤 {r.owner?.name} ({r.owner?.email})</span>
                    <span>📍 {[r.address?.area, r.address?.city].filter(Boolean).join(", ") || "—"}</span>
                    <span>🍛 {r.cuisine?.slice(0,3).join(", ") || "—"}</span>
                    <span>💰 ₹{r.reservationFee || 0} reservation fee</span>
                    <span>📅 {new Date(r.createdAt).toLocaleDateString("en-IN", {day:"numeric", month:"short", year:"numeric"})}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", gap:10, flexShrink:0 }}>
                  {r.verificationStatus === "pending" && (
                    <button onClick={() => setSelected(r)}
                      style={{ padding:"10px 20px", background:C.amber, border:"none",
                        borderRadius:10, color:"#fff", fontSize:13, fontWeight:700,
                        cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      Verify →
                    </button>
                  )}
                  {r.verificationStatus === "verified" && (
                    <span style={{ padding:"10px 16px", fontSize:13, fontWeight:700,
                      color:C.green }}>✓ Live</span>
                  )}
                  {r.verificationStatus === "rejected" && (
                    <button onClick={() => setSelected(r)}
                      style={{ padding:"10px 20px", background:C.bgSoft, border:`1px solid ${C.border}`,
                        borderRadius:10, color:C.textMuted, fontSize:13, fontWeight:600,
                        cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {selected && (
        <VerifyModal
          restaurant={selected}
          onClose={() => setSelected(null)}
          onVerified={handleVerified}
          onRejected={handleRejected}
        />
      )}
    </div>
  );
}
