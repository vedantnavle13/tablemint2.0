import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "axios";

const C = {
  bg: "#FDFAF6", bgSoft: "#F5F0E8", bgCard: "#FFFFFF",
  border: "#E8E0D0", amber: "#D4883A", amberSoft: "#FBF0E0",
  text: "#2C2416", textMid: "#6B5B45", textMuted: "#A0907A",
  green: "#4A9B6F", red: "#D05A4A", blue: "#4A7B9D",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');`;

const STATUS_CONFIG = {
  pending: { label: "Pending", color: C.amber, icon: "⏳" },
  confirmed: { label: "Confirmed", color: C.blue, icon: "✅" },
  seated: { label: "Seated", color: C.green, icon: "🪑" },
  completed: { label: "Completed", color: C.green, icon: "✓" },
  cancelled: { label: "Cancelled", color: C.red, icon: "✗" },
  no_show: { label: "No Show", color: C.red, icon: "❌" },
};

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
      background: color + "20", color, border: `1px solid ${color}40`, textTransform: "uppercase", letterSpacing: 0.5
    }}>
      {label}
    </span>
  );
}

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  return (
    <nav style={{
      background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "0 6%",
      height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 100
    }}>
      <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <span style={{ fontSize: 20 }}>🍽️</span>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.text }}>
          Table<span style={{ color: C.amber }}>Mint</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => navigate("/explore")}
          style={{
            background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10,
            padding: "8px 16px", fontSize: 13, fontWeight: 600, color: C.textMid, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
          }}>
          Browse Restaurants
        </button>
        <button onClick={onLogout}
          style={{
            background: "transparent", border: "none", fontSize: 13, fontWeight: 600,
            color: C.red, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
          }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Password change
  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  const saveProfile = async () => {
    setLoading(true); setError(""); setMsg("");
    try {
      await axios.patch("/auth/update-profile", { name, phone });
      setMsg("Profile updated successfully!");
      setEditing(false);
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update profile.");
    } finally { setLoading(false); }
  };

  const savePassword = async () => {
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    if (newPw.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setLoading(true); setPwError(""); setPwMsg("");
    try {
      await axios.patch("/auth/change-password", { currentPassword: currentPw, newPassword: newPw });
      setPwMsg("Password changed successfully!");
      setChangingPw(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwMsg(""), 3000);
    } catch (e) {
      setPwError(e.response?.data?.message || "Failed to change password.");
    } finally { setLoading(false); }
  };

  const inp = {
    width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
    fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Profile Info */}
      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.text }}>Personal Info</h3>
          {!editing && (
            <button onClick={() => setEditing(true)}
              style={{
                padding: "7px 16px", background: C.amberSoft, border: `1px solid ${C.amber}40`,
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.amber, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
              }}>
              Edit
            </button>
          )}
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: C.amber + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: C.amber
          }}>
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{user?.email}</div>
            <Badge label="Customer" color={C.blue} />
          </div>
        </div>

        {msg && <div style={{ padding: "10px 14px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>{msg}</div>}
        {error && <div style={{ padding: "10px 14px", background: C.red + "15", borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {error}</div>}

        {editing ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inp}
                onFocus={e => e.target.style.borderColor = C.amber} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={inp}
                onFocus={e => e.target.style.borderColor = C.amber} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveProfile} disabled={loading}
                style={{
                  flex: 1, padding: "10px", background: C.amber, border: "none", borderRadius: 10,
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                }}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => { setEditing(false); setName(user?.name); setPhone(user?.phone); }}
                style={{
                  padding: "10px 16px", background: "transparent", border: `1.5px solid ${C.border}`,
                  borderRadius: 10, color: C.textMid, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Full Name", value: user?.name },
              { label: "Email", value: user?.email },
              { label: "Phone", value: user?.phone || "Not set" },
              { label: "Member Since", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password */}
      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.text }}>Password</h3>
          {!changingPw && (
            <button onClick={() => setChangingPw(true)}
              style={{
                padding: "7px 16px", background: C.amberSoft, border: `1px solid ${C.amber}40`,
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.amber, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
              }}>
              Change
            </button>
          )}
        </div>

        {pwMsg && <div style={{ padding: "10px 14px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>{pwMsg}</div>}
        {pwError && <div style={{ padding: "10px 14px", background: C.red + "15", borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {pwError}</div>}

        {changingPw ? (
          <div>
            {[
              { label: "Current Password", value: currentPw, set: setCurrentPw },
              { label: "New Password", value: newPw, set: setNewPw },
              { label: "Confirm New Password", value: confirmPw, set: setConfirmPw },
            ].map(({ label, value, set }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                <input type="password" value={value} onChange={e => set(e.target.value)} style={inp}
                  onFocus={e => e.target.style.borderColor = C.amber} onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={savePassword} disabled={loading}
                style={{
                  flex: 1, padding: "10px", background: C.amber, border: "none", borderRadius: 10,
                  color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                }}>
                {loading ? "Saving…" : "Update Password"}
              </button>
              <button onClick={() => { setChangingPw(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwError(""); }}
                style={{
                  padding: "10px 16px", background: "transparent", border: `1.5px solid ${C.border}`,
                  borderRadius: 10, color: C.textMid, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 20, background: C.bgSoft, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>Your password is securely stored.<br />Click Change to update it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────
function BookingsTab() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    axios.get("/reservations/my")
      .then(r => setReservations(r.data.data.reservations || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const cancelReservation = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this reservation?")) return;
    setCancelling(id);
    try {
      await axios.patch(`/reservations/${id}/cancel`, { reason: "Cancelled by customer" });
      setReservations(prev => prev.map(r => r._id === id ? { ...r, status: "cancelled" } : r));
      if (selected?._id === id) setSelected(p => ({ ...p, status: "cancelled" }));
    } catch (e) { }
    finally { setCancelling(null); }
  };

  const filtered = filter === "all" ? reservations :
    filter === "upcoming" ? reservations.filter(r => ["pending", "confirmed"].includes(r.status)) :
      filter === "past" ? reservations.filter(r => ["completed", "cancelled", "no_show"].includes(r.status)) :
        reservations.filter(r => r.status === filter);

  const canCancel = (r) => ["pending", "confirmed"].includes(r.status);

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Loading bookings…</div>;

  return (
    <div>
      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[{ id: "all", label: "All" }, { id: "upcoming", label: "Upcoming" }, { id: "past", label: "Past" }, { id: "cancelled", label: "Cancelled" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
              background: filter === f.id ? C.amber : C.bgSoft, color: filter === f.id ? "#fff" : C.textMid, fontFamily: "'DM Sans',sans-serif"
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: C.text, marginBottom: 8 }}>No bookings yet</h3>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>Explore restaurants and make your first reservation!</p>
          <button onClick={() => navigate("/explore")}
            style={{
              padding: "12px 28px", background: C.amber, border: "none", borderRadius: 12,
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
            }}>
            Browse Restaurants →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20 }}>
          {/* Booking list */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map(r => {
              const cfg = STATUS_CONFIG[r.status] || {};
              const upcoming = canCancel(r);
              const isSelected = selected?._id === r._id;
              return (
                <div key={r._id} onClick={() => setSelected(isSelected ? null : r)}
                  style={{
                    background: C.bgCard, borderRadius: 14, border: `1.5px solid ${isSelected ? C.amber : C.border}`,
                    padding: 20, cursor: "pointer", transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = C.amber + "80"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = C.border; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: C.text }}>
                          {r.restaurant?.name || "Restaurant"}
                        </span>
                        <Badge label={cfg.label || r.status} color={cfg.color || C.textMuted} />
                      </div>
                      <div style={{ display: "flex", gap: 20, fontSize: 13, color: C.textMuted }}>
                        <span>📅 {new Date(r.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>🕐 {new Date(r.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>👥 {r.numberOfGuests} guest{r.numberOfGuests !== 1 ? "s" : ""}</span>
                        <span style={{ fontFamily: "monospace", color: C.amber, fontWeight: 700 }}>
                          #{r._id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      {r.preOrderItems?.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: C.green, fontWeight: 600 }}>
                          🍽️ Pre-order: {r.preOrderItems.length} item{r.preOrderItems.length !== 1 ? "s" : ""} · ₹{r.preOrderTotal}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>₹{r.reservationFee || 0}</div>
                      {upcoming && (
                        <button
                          disabled={cancelling === r._id}
                          onClick={e => { e.stopPropagation(); cancelReservation(r._id); }}
                          style={{
                            padding: "5px 12px", background: C.red + "15", border: `1px solid ${C.red}30`,
                            borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                          }}>
                          {cancelling === r._id ? "Cancelling…" : "Cancel"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{
              width: 300, flexShrink: 0, background: C.bgCard, borderRadius: 16,
              border: `1px solid ${C.border}`, padding: 24, alignSelf: "flex-start"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: C.text }}>Booking Details</h3>
                <button onClick={() => setSelected(null)}
                  style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: C.textMuted }}>×</button>
              </div>

              <div style={{ marginBottom: 16, padding: 14, background: C.bgSoft, borderRadius: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{selected.restaurant?.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {[selected.restaurant?.address?.area, selected.restaurant?.address?.city].filter(Boolean).join(", ")}
                </div>
              </div>

              {[
                { label: "Booking ID", value: `#${selected._id.slice(-8).toUpperCase()}` },
                { label: "Date", value: new Date(selected.scheduledAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" }) },
                { label: "Time", value: new Date(selected.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
                { label: "Guests", value: selected.numberOfGuests },
                { label: "Type", value: selected.type === "instant" ? "Instant Booking" : "Scheduled" },
                { label: "Res Fee", value: `₹${selected.reservationFee || 0}` },
                { label: "Status", value: <Badge label={STATUS_CONFIG[selected.status]?.label} color={STATUS_CONFIG[selected.status]?.color} /> },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: `1px solid ${C.border}`
                }}>
                  <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value}</span>
                </div>
              ))}

              {selected.specialRequests && (
                <div style={{ marginTop: 12, padding: 12, background: C.amberSoft, borderRadius: 8, fontSize: 13, color: C.textMid }}>
                  💬 {selected.specialRequests}
                </div>
              )}

              {selected.preOrderItems?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>🍽️ Your Pre-Order</div>
                  {selected.preOrderItems.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", padding: "7px 0",
                      borderBottom: `1px solid ${C.border}`
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>Qty: {item.quantity} × ₹{item.price}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>₹{item.quantity * item.price}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontWeight: 700 }}>
                    <span style={{ fontSize: 14, color: C.text }}>Pre-Order Total</span>
                    <span style={{ fontSize: 16, color: C.amber }}>₹{selected.preOrderTotal}</span>
                  </div>
                  <div style={{ padding: 10, background: C.green + "15", borderRadius: 8, fontSize: 12, color: C.green, fontWeight: 600, textAlign: "center" }}>
                    💳 Pay pre-order amount at the restaurant
                  </div>
                </div>
              )}

              {canCancel(selected) && (
                <button
                  disabled={cancelling === selected._id}
                  onClick={() => cancelReservation(selected._id)}
                  style={{
                    width: "100%", marginTop: 16, padding: "11px", background: C.red + "15",
                    border: `1.5px solid ${C.red}40`, borderRadius: 10, color: C.red,
                    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                  }}>
                  {cancelling === selected._id ? "Cancelling…" : "Cancel Reservation"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Account Page ────────────────────────────────────────────────────────
export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn, loading } = useAuth();
  const [tab, setTab] = useState("bookings");
  const [reservationCount, setReservationCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn && !loading) { navigate("/login"); return; }
    if (user?.role !== "customer") {
      if (user?.role === "owner") navigate("/owner/dashboard");
      else if (user?.role === "admin") navigate("/admin/dashboard");
      return;
    }
    axios.get("/reservations/my?limit=1")
      .then(r => setReservationCount(r.data.total || 0))
      .catch(() => { });
  }, [isLoggedIn, loading, user, navigate]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: `4px solid ${C.border}`, borderTop: `4px solid ${C.amber}`,
          borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px"
        }} />
        <p style={{ color: C.textMuted, fontSize: 14 }}>Loading…</p>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`${FONTS} *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#D4C4B0;border-radius:3px}`}</style>

      <Navbar user={user} onLogout={handleLogout} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20, marginBottom: 36,
          padding: 28, background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: C.amber + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: C.amber, flexShrink: 0
          }}>
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {user?.name}
            </h1>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 12 }}>{user?.email}</div>

            {/* Customer ID — show prominently */}
            {user?.customerId && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px",
                background: C.amber + "15", border: `1.5px solid ${C.amber}40`, borderRadius: 10, marginBottom: 12
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textMid }}>YOUR CUSTOMER ID</span>
                <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: C.amber, letterSpacing: 3 }}>
                  {user.customerId}
                </span>
                <span style={{ fontSize: 11, color: C.textMuted }}>Share with restaurant staff</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.amber }}>{reservationCount}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Total Bookings</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>
                  {user?.createdAt ? Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) : 0}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Days as Member</div>
              </div>
            </div>
          </div>
          <button onClick={() => navigate("/explore")}
            style={{
              padding: "11px 24px", background: C.amber, border: "none", borderRadius: 12,
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              boxShadow: `0 4px 16px ${C.amber}40`
            }}>
            Book a Table →
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
          {[
            { id: "bookings", label: "My Bookings", icon: "📋" },
            { id: "profile", label: "Profile & Security", icon: "👤" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "12px 24px", background: "transparent", border: "none",
                borderBottom: `3px solid ${tab === t.id ? C.amber : "transparent"}`,
                color: tab === t.id ? C.amber : C.textMuted, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 8
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "bookings" && <BookingsTab />}
        {tab === "profile" && <ProfileTab user={user} />}
      </div>
    </div>
  );
}
