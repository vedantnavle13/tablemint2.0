import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';
import { apiCall } from './services/api';
import AdminInsights from './components/AdminInsights';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#FDFAF6", bgSoft: "#F5F0E8", bgCard: "#FFFFFF",
  border: "#E8E0D0", amber: "#D4883A", amberSoft: "#FBF0E0",
  text: "#2C2416", textMid: "#6B5B45", textMuted: "#A0907A",
  green: "#4A9B6F", red: "#D05A4A", blue: "#4A7B9D",
};

const TABS = ["Dashboard", "Reservations", "Menu", "Tables", "Analytics", "Reviews"];

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmtTime = d => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const statusColor = s => ({ pending: C.amber, confirmed: C.green, seated: C.blue, completed: "#888", cancelled: C.red, no_show: C.red })[s] || C.textMuted;
const statusLabel = s => ({ pending: "Pending", confirmed: "✅ Confirmed", seated: "🪑 Seated", completed: "✓ Completed", cancelled: "✗ Cancelled", no_show: "❌ No-Show" })[s] || s;

// ── UI atoms ──────────────────────────────────────────────────────────────────
const Spinner = ({ text = "Loading…" }) => (
  <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>
    <div style={{ width: 40, height: 40, borderRadius: "50%", border: `4px solid ${C.border}`, borderTopColor: C.amber, animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
    <p style={{ fontSize: 14 }}>{text}</p>
  </div>
);
const Empty = ({ icon = "📭", title = "Nothing here yet.", sub = "" }) => (
  <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>
    <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
    <h3 style={{ fontSize: 18, fontWeight: 600, color: C.textMid, marginBottom: 6 }}>{title}</h3>
    {sub && <p style={{ fontSize: 13 }}>{sub}</p>}
  </div>
);
const Btn = ({ children, onClick, color = C.amber, outline = false, style = {}, disabled = false, size = "md" }) => {
  const pad = size === "sm" ? "6px 14px" : "10px 20px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: pad, borderRadius: 10, border: `1.5px solid ${outline ? color : "transparent"}`,
      background: outline ? "transparent" : color, color: outline ? color : "#fff",
      fontWeight: 600, fontSize: fs, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", ...style,
    }}>{children}</button>
  );
};
const Tag = ({ label, color }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color, background: color + "18", textTransform: "capitalize" }}>{label}</span>
);

function Modal({ title, subtitle, onClose, children, width = 520 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, borderRadius: 20, maxWidth: width, width: "100%", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 13, color: C.textMuted }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 18, color: C.textMuted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.text, fontFamily: "'DM Sans', sans-serif", outline: "none", ...style }}
    onFocus={e => e.target.style.borderColor = C.amber} onBlur={e => e.target.style.borderColor = C.border}
  />
);
const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.text, fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff" }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, change, trend }) {
  const up = change > 0;
  const tc = trend === "good" ? C.green : trend === "bad" ? C.red : C.textMuted;
  return (
    <div style={{ background: C.bgCard, padding: 24, borderRadius: 16, border: `1px solid ${C.border}`, transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        {change !== null && change !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: up ? C.green + "18" : C.red + "18", color: up ? C.green : C.red }}>
            {up ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: C.text }}>{value}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── DASHBOARD TAB ─────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function DashboardTab({ user, onTabChange }) {
  const [stats, setStats]     = useState(null);
  const [reservations, setRes] = useState([]);
  const [restaurant, setRest]  = useState(null);
  const [loadingStats, setLS]  = useState(true);
  const [loadingRes, setLR]    = useState(true);
  const [detailRes, setDetail] = useState(null);

  useEffect(() => {
    apiCall("/admin/analytics").then(r => setStats(r.data)).catch(() => {}).finally(() => setLS(false));
    apiCall("/admin/my-restaurant").then(r => setRest(r.data.restaurant)).catch(() => {});
    apiCall("/admin/reservations").then(r => {
      const upcoming = (r.data.reservations || [])
        .filter(rv => new Date(rv.scheduledAt) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .slice(0, 5);
      setRes(upcoming);
    }).catch(() => {}).finally(() => setLR(false));
  }, []);

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"; };

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          {greeting()}, {restaurant?.name || user?.name || "Admin"}! 👋
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted }}>📅 {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {loadingStats ? <Spinner text="Loading stats…" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 40 }}>
          <StatCard icon="📊" label="Today's Reservations" value={stats?.todayReservations ?? "—"} change={stats?.changes?.reservations} trend="good" />
          <StatCard icon="💰" label="Revenue (Res Fees)" value={`₹${(stats?.todayRevenue || 0).toLocaleString()}`} change={stats?.changes?.revenue} trend="good" />
          <StatCard icon="👥" label="Avg Party Size" value={stats?.avgPartySize || "—"} change={null} />
          <StatCard icon="❌" label="No-Shows" value={stats?.noShows ?? 0} change={stats?.changes?.noShows !== null ? -(stats?.changes?.noShows ?? 0) : null} trend="good" />
        </div>
      )}

      {/* Upcoming */}
      <div style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 40 }}>
        <div style={{ padding: "24px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>🔥 Upcoming Reservations</h2>
            <p style={{ fontSize: 14, color: C.textMuted }}>Today's bookings</p>
          </div>
          <Btn onClick={() => onTabChange("Reservations")}>View All →</Btn>
        </div>
        {loadingRes ? <Spinner /> : reservations.length === 0 ? <Empty icon="📋" title="No upcoming reservations today." /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr style={{ background: C.bgSoft, borderBottom: `2px solid ${C.border}` }}>
                {["TIME", "CUSTOMER ID", "GUESTS", "PRE-ORDER", "STATUS"].map(h => (
                  <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {reservations.map(r => (
                  <tr key={r._id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px", fontSize: 15, fontWeight: 700, color: C.text }}>{fmtTime(r.scheduledAt)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.amber, background: C.amberSoft, padding: "4px 10px", borderRadius: 8, fontFamily: "monospace" }}>
                        {r.customer?.customerId || r.customer?.name || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 14, textAlign: "center", color: C.text }}>👥 {r.numberOfGuests}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {r.preOrderItems?.length > 0 ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>₹{r.preOrderTotal}</div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>{r.preOrderItems.length} item(s)</div>
                          <button onClick={() => setDetail(r)} style={{ fontSize: 12, color: C.amber, background: "transparent", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", padding: 0 }}>View →</button>
                        </div>
                      ) : <span style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic" }}>No pre-order</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Tag label={statusLabel(r.status)} color={statusColor(r.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 20 }}>Quick Actions</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        {[
          { icon: "📋", title: "Reservations", desc: "View & manage bookings", tab: "Reservations" },
          { icon: "🍽️", title: "Menu", desc: "Add / edit / delete items", tab: "Menu" },
          { icon: "🪑", title: "Tables", desc: "Manage table layout", tab: "Tables" },
          { icon: "📊", title: "Analytics", desc: "Restaurant stats", tab: "Analytics" },
          { icon: "⭐", title: "Reviews & AI", desc: "ML sentiment insights", tab: "Reviews" },
        ].map(a => (
          <div key={a.title} onClick={() => onTabChange(a.tab)}
            style={{ background: C.bgCard, padding: 24, borderRadius: 16, border: `1.5px solid ${C.border}`, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.boxShadow = `0 8px 24px ${C.amber}15`; e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{a.icon}</div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{a.title}</h4>
            <p style={{ fontSize: 12, color: C.textMuted }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {detailRes && <PreOrderModal reservation={detailRes} onClose={() => setDetail(null)} />}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── RESERVATIONS TAB ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function PreOrderModal({ reservation, onClose }) {
  const items = reservation.preOrderItems || [];
  return (
    <Modal title="Pre-Order Details" subtitle={`${reservation.customer?.customerId || reservation.customer?.name || "Customer"} · ${fmtDate(reservation.scheduledAt)}`} onClose={onClose}>
      {items.length > 0 ? (
        <>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>Qty: {item.quantity} × ₹{item.price}</div>
              </div>
              <div style={{ fontWeight: 700, color: C.amber }}>₹{item.quantity * item.price}</div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderTop: `2px solid ${C.border}`, marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Total</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.amber }}>₹{reservation.preOrderTotal || 0}</span>
          </div>
        </>
      ) : <p style={{ textAlign: "center", padding: "32px 0", color: C.textMuted }}>No pre-order items.</p>}
    </Modal>
  );
}

function NotifyModal({ reservation, onClose }) {
  const [msg, setMsg]         = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState("");
  const [err, setErr]         = useState("");

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true); setDone(""); setErr("");
    try {
      const res = await apiCall(`/admin/reservations/${reservation._id}/notify`, "POST", { message: msg });
      setDone(res.message || "Email sent!");
      setMsg("");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to send.");
    } finally { setSending(false); }
  };

  return (
    <Modal title="Notify Customer" subtitle={`Booking #${reservation._id.slice(-8).toUpperCase()} · ${reservation.customer?.name || "—"}`} onClose={onClose}>
      <FormRow label="Message to customer">
        <textarea
          value={msg} onChange={e => setMsg(e.target.value)}
          placeholder="Type your message here…"
          rows={5}
          style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none", color: C.text }}
          onFocus={e => e.target.style.borderColor = C.amber}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </FormRow>
      {done && <div style={{ padding: "10px 14px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 12 }}>✅ {done}</div>}
      {err  && <div style={{ padding: "10px 14px", background: C.red  + "15", borderRadius: 8, fontSize: 13, color: C.red,   marginBottom: 12 }}>⚠️ {err}</div>}
      <Btn onClick={send} disabled={sending || !msg.trim()} style={{ width: "100%" }}>
        {sending ? "Sending…" : "📧 Send Email Notification"}
      </Btn>
    </Modal>
  );
}

function ReservationsTab() {
  const [reservations, setRes] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [search, setSearch]    = useState("");
  const [statusF, setStatusF]  = useState("all");
  const [detailR, setDetailR]  = useState(null);
  const [notifyR, setNotifyR]  = useState(null);
  const [updating, setUpdating] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiCall("/admin/reservations").then(r => setRes(r.data.reservations || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (r, status) => {
    setUpdating(r._id);
    try {
      await apiCall(`/admin/reservations/${r._id}/status`, "PATCH", { status });
      setRes(prev => prev.map(rv => rv._id === r._id ? { ...rv, status } : rv));
    } catch (e) { alert(e.response?.data?.message || "Failed to update status."); }
    finally { setUpdating(null); }
  };

  const NEXT_STATUSES = { pending: ["confirmed", "cancelled"], confirmed: ["seated", "cancelled", "no_show"], seated: ["completed"] };
  const STATUS_OPTS = ["all", "pending", "confirmed", "seated", "completed", "cancelled", "no_show"];

  const filtered = reservations.filter(r => {
    const q = search.toLowerCase();
    const mQ = !q || r.customer?.name?.toLowerCase().includes(q) || r.customer?.customerId?.toLowerCase().includes(q) || r.status?.includes(q);
    const mS = statusF === "all" || r.status === statusF;
    return mQ && mS;
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 4 }}>📋 Reservations</h2>
          <p style={{ color: C.textMuted, fontSize: 13 }}>{reservations.length} total for your restaurant</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, ID…"
          style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", minWidth: 240, fontFamily: "'DM Sans', sans-serif", color: C.text }}
          onFocus={e => e.target.style.borderColor = C.amber} onBlur={e => e.target.style.borderColor = C.border} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {STATUS_OPTS.map(s => (
          <button key={s} onClick={() => setStatusF(s)} style={{
            padding: "5px 14px", borderRadius: 100, border: `1.5px solid ${statusF === s ? C.amber : C.border}`,
            background: statusF === s ? C.amber : "#fff", color: statusF === s ? "#fff" : C.textMid,
            fontWeight: statusF === s ? 700 : 500, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize", transition: "all 0.2s",
          }}>{s === "all" ? "All" : s.replace("_", " ")}</button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="📋" title="No reservations found." /> : (
        <div style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr style={{ background: C.bgSoft, borderBottom: `2px solid ${C.border}` }}>
              {["DATE & TIME", "CUSTOMER", "GUESTS", "PRE-ORDER", "STATUS", "ACTIONS"].map(h => (
                <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id} style={{ borderBottom: `1px solid ${C.border}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{fmtTime(r.scheduledAt)}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{fmtDate(r.scheduledAt)}</div>
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{r.customer?.name || "Guest"}</div>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: C.amber, background: C.amberSoft, padding: "2px 8px", borderRadius: 6 }}>
                      {r.customer?.customerId || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "13px 14px", textAlign: "center", fontSize: 14, color: C.text }}>👥 {r.numberOfGuests}</td>
                  <td style={{ padding: "13px 14px" }}>
                    {r.preOrderItems?.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>₹{r.preOrderTotal}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{r.preOrderItems.length} item(s)</div>
                        <button onClick={() => setDetailR(r)} style={{ fontSize: 11, color: C.amber, background: "transparent", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", padding: 0 }}>View →</button>
                      </div>
                    ) : <span style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>None</span>}
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ marginBottom: 8 }}><Tag label={statusLabel(r.status)} color={statusColor(r.status)} /></div>
                    {(NEXT_STATUSES[r.status] || []).map(ns => (
                      <button key={ns} disabled={updating === r._id} onClick={() => updateStatus(r, ns)}
                        style={{ display: "block", width: "100%", marginBottom: 4, padding: "4px 0", fontSize: 11, fontWeight: 700, borderRadius: 6, border: `1px solid ${statusColor(ns)}40`, background: statusColor(ns) + "15", color: statusColor(ns), cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize" }}>
                        → {ns.replace("_", " ")}
                      </button>
                    ))}
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    {/* Notify — only for active (non-terminal) statuses */}
                    {!["completed", "cancelled", "no_show"].includes(r.status) && (
                      <Btn size="sm" outline color={C.blue} onClick={() => setNotifyR(r)} style={{ marginBottom: 6, display: "block" }}>📧 Notify</Btn>
                    )}
                    {/* View Bill — only for completed with bill */}
                    {r.status === "completed" && r.billGeneratedAt && (
                      <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 4 }}>
                        🧾 Bill: ₹{(r.billTotal || 0).toFixed(2)}
                        <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>
                          ({r.paymentStatus || "unpaid"})
                        </span>
                      </div>
                    )}
                    {/* Customer Message badge */}
                    {r.customerMessage && (
                      <div style={{ fontSize: 11, color: C.blue, fontWeight: 600, marginTop: 4 }} title={r.customerMessage}>
                        💬 Special Request
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detailR && <PreOrderModal reservation={detailR} onClose={() => setDetailR(null)} />}
      {notifyR && <NotifyModal reservation={notifyR} onClose={() => setNotifyR(null)} />}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── MENU TAB ──────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const EMPTY_ITEM = { name: "", description: "", price: "", category: "main", isVeg: false, isAvailable: true };

function MenuItemForm({ initial = EMPTY_ITEM, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY_ITEM, ...initial });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div>
      <FormRow label="Name"><Input value={form.name} onChange={v => upd("name", v)} placeholder="e.g. Butter Chicken" /></FormRow>
      <FormRow label="Description"><Input value={form.description} onChange={v => upd("description", v)} placeholder="Short description" /></FormRow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <FormRow label="Price (₹)"><Input type="number" value={form.price} onChange={v => upd("price", v)} placeholder="0" /></FormRow>
        <FormRow label="Category"><Select value={form.category} onChange={v => upd("category", v)}
          options={[{ value: "starter", label: "Starter" }, { value: "main", label: "Main" }, { value: "dessert", label: "Dessert" }, { value: "beverage", label: "Beverage" }, { value: "special", label: "Special" }]} /></FormRow>
      </div>
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMid, cursor: "pointer" }}>
          <input type="checkbox" checked={form.isVeg} onChange={e => upd("isVeg", e.target.checked)} /> 🟢 Vegetarian
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMid, cursor: "pointer" }}>
          <input type="checkbox" checked={form.isAvailable} onChange={e => upd("isAvailable", e.target.checked)} /> ✅ Available
        </label>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => onSave(form)} disabled={saving || !form.name || !form.price}>{saving ? "Saving…" : "Save Item"}</Btn>
        <Btn outline color={C.textMuted} onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function MenuTab() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [catF, setCatF]         = useState("all");
  const [adding, setAdding]     = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiCall("/admin/menu").then(r => setItems(r.data.menuItems || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      const res = await apiCall("/admin/menu", "POST", { ...form, price: Number(form.price) });
      setItems(prev => [...prev, { ...res.data.menuItem, restaurantName: prev[0]?.restaurantName }]);
      setAdding(false);
    } catch (e) { alert(e.response?.data?.message || "Failed to add."); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await apiCall(`/admin/menu/${editItem._id}`, "PATCH", { ...form, price: Number(form.price) });
      setItems(prev => prev.map(i => i._id === editItem._id ? { ...i, ...form, price: Number(form.price) } : i));
      setEditItem(null);
    } catch (e) { alert(e.response?.data?.message || "Failed to update."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this menu item?")) return;
    setDeleting(itemId);
    try {
      await apiCall(`/admin/menu/${itemId}`, "DELETE");
      setItems(prev => prev.filter(i => i._id !== itemId));
    } catch (e) { alert("Failed to delete."); }
    finally { setDeleting(null); }
  };

  const CATS = ["all", "starter", "main", "dessert", "beverage", "special"];
  const catColor = c => ({ starter: "#8B5CF6", main: C.amber, dessert: C.red, beverage: C.blue, special: C.green })[c] || C.textMuted;

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.name?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q)) &&
      (catF === "all" || i.category === catF);
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 4 }}>🍽️ Menu Items</h2>
          <p style={{ color: C.textMuted, fontSize: 13 }}>{items.length} items in your restaurant</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
            style={{ padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", minWidth: 200, fontFamily: "'DM Sans', sans-serif", color: C.text }}
            onFocus={e => e.target.style.borderColor = C.amber} onBlur={e => e.target.style.borderColor = C.border} />
          <Btn onClick={() => { setAdding(true); setEditItem(null); }}>+ Add Item</Btn>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.amber}40`, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>➕ New Menu Item</h3>
          <MenuItemForm onSave={handleAdd} onCancel={() => setAdding(false)} saving={saving} />
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCatF(c)} style={{
            padding: "5px 14px", borderRadius: 100, border: `1.5px solid ${catF === c ? (c === "all" ? C.amber : catColor(c)) : C.border}`,
            background: catF === c ? (c === "all" ? C.amber : catColor(c)) : "#fff",
            color: catF === c ? "#fff" : C.textMid, fontWeight: catF === c ? 700 : 500, fontSize: 12,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize", transition: "all 0.2s",
          }}>{c === "all" ? "All" : c}</button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="🍽️" title="No menu items found." sub='Click "+ Add Item" to get started.' /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map(item => (
            <div key={item._id} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.07)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              {editItem?._id === item._id ? (
                <MenuItemForm initial={item} onSave={handleEdit} onCancel={() => setEditItem(null)} saving={saving} />
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3 }}>{item.name}</div>
                      {item.description && <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{item.description}</div>}
                    </div>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.amber, marginLeft: 12 }}>₹{item.price}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    <Tag label={item.category} color={catColor(item.category)} />
                    <Tag label={item.isVeg ? "🟢 Veg" : "🔴 Non-Veg"} color={item.isVeg ? C.green : C.red} />
                    <Tag label={item.isAvailable ? "Available" : "Unavailable"} color={item.isAvailable ? C.green : C.red} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn size="sm" outline color={C.blue} onClick={() => { setEditItem(item); setAdding(false); }}>✏️ Edit</Btn>
                    <Btn size="sm" outline color={C.red} onClick={() => handleDelete(item._id)} disabled={deleting === item._id}>
                      {deleting === item._id ? "…" : "🗑️ Delete"}
                    </Btn>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── TABLES TAB ────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const EMPTY_TABLE = { tableNumber: "", capacity: "", location: "indoor", isAvailable: true };

function TablesTab() {
  const [tables, setTables]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [editTable, setEditT]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY_TABLE);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiCall("/admin/tables").then(r => setTables(r.data.tables || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_TABLE); setAdding(true); setEditT(null); };
  const openEdit = (t) => { setForm({ tableNumber: t.tableNumber, capacity: t.capacity, location: t.location, isAvailable: t.isAvailable }); setEditT(t); setAdding(false); };

  const handleSave = async () => {
    if (!form.tableNumber || !form.capacity) return;
    setSaving(true);
    try {
      if (editTable) {
        await apiCall(`/admin/tables/${editTable._id}`, "PATCH", { ...form, capacity: Number(form.capacity) });
        setTables(prev => prev.map(t => t._id === editTable._id ? { ...t, ...form, capacity: Number(form.capacity) } : t));
        setEditT(null);
      } else {
        const res = await apiCall("/admin/tables", "POST", { ...form, capacity: Number(form.capacity) });
        setTables(prev => [...prev, res.data.table]);
        setAdding(false);
      }
    } catch (e) { alert(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this table?")) return;
    setDeleting(id);
    try {
      await apiCall(`/admin/tables/${id}`, "DELETE");
      setTables(prev => prev.filter(t => t._id !== id));
    } catch (e) { alert("Failed to delete."); }
    finally { setDeleting(null); }
  };

  const locColor = l => ({ indoor: C.blue, outdoor: C.green, rooftop: "#8B5CF6", private: C.amber })[l] || C.textMuted;

  const TableForm = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <FormRow label="Table Number"><Input value={form.tableNumber} onChange={v => setForm(p => ({ ...p, tableNumber: v }))} placeholder="e.g. T01" /></FormRow>
      <FormRow label="Capacity (seats)"><Input type="number" value={form.capacity} onChange={v => setForm(p => ({ ...p, capacity: v }))} placeholder="e.g. 4" /></FormRow>
      <FormRow label="Location"><Select value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))}
        options={[{ value: "indoor", label: "Indoor" }, { value: "outdoor", label: "Outdoor" }, { value: "rooftop", label: "Rooftop" }, { value: "private", label: "Private" }]} /></FormRow>
      <FormRow label="Status"><Select value={form.isAvailable ? "yes" : "no"} onChange={v => setForm(p => ({ ...p, isAvailable: v === "yes" }))}
        options={[{ value: "yes", label: "Available" }, { value: "no", label: "Unavailable" }]} /></FormRow>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 4 }}>🪑 Tables</h2>
          <p style={{ color: C.textMuted, fontSize: 13 }}>{tables.length} tables configured</p>
        </div>
        <Btn onClick={openAdd}>+ Add Table</Btn>
      </div>

      {(adding || editTable) && (
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.amber}40`, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            {editTable ? "✏️ Edit Table" : "➕ New Table"}
          </h3>
          <TableForm />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn onClick={handleSave} disabled={saving || !form.tableNumber || !form.capacity}>{saving ? "Saving…" : "Save Table"}</Btn>
            <Btn outline color={C.textMuted} onClick={() => { setAdding(false); setEditT(null); }}>Cancel</Btn>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : tables.length === 0 ? <Empty icon="🪑" title="No tables configured." sub='Click "+ Add Table" to add your first table.' /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {tables.map(t => (
            <div key={t._id} style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, textAlign: "center", transition: "all 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.07)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🪑</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t.tableNumber}</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>👥 {t.capacity} seats</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <Tag label={t.location} color={locColor(t.location)} />
                <Tag label={t.isAvailable ? "Available" : "Unavailable"} color={t.isAvailable ? C.green : C.red} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Btn size="sm" outline color={C.blue} onClick={() => openEdit(t)}>✏️ Edit</Btn>
                <Btn size="sm" outline color={C.red} onClick={() => handleDelete(t._id)} disabled={deleting === t._id}>
                  {deleting === t._id ? "…" : "🗑️"}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── REVIEWS TAB (ML Insights) ─────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function ReviewsTab() {
  const [restaurantId, setRestaurantId]   = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    apiCall('/admin/my-restaurant')
      .then(res => {
        const r = res.data?.restaurant || res.data;
        setRestaurantId(r?._id || null);
        setRestaurantName(r?.name || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner text="Loading restaurant…" />;

  if (!restaurantId) {
    return <Empty icon="🏚️" title="No restaurant assigned." sub="Contact a super-admin to assign a restaurant to your account." />;
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          ⭐ Reviews &amp; AI Insights
        </h2>
        <p style={{ color: C.textMuted, fontSize: 13 }}>
          ML-powered sentiment analysis from customer reviews for · <strong>{restaurantName}</strong>.
        </p>
      </div>
      <AdminInsights restaurantId={restaurantId} restaurantName={restaurantName} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── ANALYTICS TAB ─────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall("/admin/analytics").then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner text="Crunching numbers…" />;
  if (!data)   return <Empty icon="📊" title="Analytics unavailable." />;

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6 }}>📊 Analytics — {data.restaurantName}</h2>
        <p style={{ color: C.textMuted, fontSize: 13 }}>
          ⭐ {data.avgRating || "No rating"} · {data.totalReviews || 0} reviews · {data.totalReservations} total bookings · % vs yesterday
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 36 }}>
        <StatCard icon="📊" label="Today's Reservations" value={data.todayReservations} change={data.changes?.reservations} trend="good" />
        <StatCard icon="💰" label="Today's Revenue" value={`₹${(data.todayRevenue || 0).toLocaleString()}`} change={data.changes?.revenue} trend="good" />
        <StatCard icon="👥" label="Avg Party Size" value={data.avgPartySize || "—"} change={null} />
        <StatCard icon="❌" label="No-Shows Today" value={data.noShows} change={data.changes?.noShows !== null ? -(data.changes?.noShows ?? 0) : null} trend="good" />
      </div>

      <div style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: "24px 28px" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 18 }}>Overall Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          {[
            { icon: "📋", label: "Total Bookings (All Time)", value: data.totalReservations },
            { icon: "⭐", label: "Avg Rating", value: data.avgRating || "—" },
            { icon: "💬", label: "Total Reviews", value: data.totalReviews || 0 },
            { icon: "💰", label: "Today Revenue", value: `₹${(data.todayRevenue || 0).toLocaleString()}` },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ textAlign: "center", padding: 18, background: C.bgSoft, borderRadius: 12 }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, padding: "12px 16px", background: C.green + "12", borderRadius: 10, border: `1px solid ${C.green}25`, fontSize: 13, color: C.green }}>
          💡 Analytics are scoped to your restaurant only and refresh on each page visit.
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate            = useNavigate();
  const { user, logout }    = useAuth();
  const [activeTab, setTab] = useState("Dashboard");

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/for-restaurants");
  }, [logout, navigate]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 7px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #D4C4B0; border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* NAV */}
      <nav style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "0 5%", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 5px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍽️</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text }}>Table<span style={{ color: C.amber }}>Mint</span></span>
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6, fontWeight: 500 }}>Admin Panel</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setTab(tab)} style={{
              padding: "7px 16px", borderRadius: 100, border: "none", cursor: "pointer",
              background: activeTab === tab ? C.amber : "transparent",
              color: activeTab === tab ? "#fff" : C.textMuted,
              fontWeight: activeTab === tab ? 700 : 500, fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
            }}
              onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = C.amber; }}
              onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = C.textMuted; }}
            >{tab}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.amberSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: C.amber }}>
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <button onClick={handleLogout} style={{ padding: "7px 16px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ padding: "36px 5%", maxWidth: 1400, margin: "0 auto" }}>
        {activeTab === "Dashboard"    && <DashboardTab user={user} onTabChange={setTab} />}
        {activeTab === "Reservations" && <ReservationsTab />}
        {activeTab === "Menu"         && <MenuTab />}
        {activeTab === "Tables"       && <TablesTab />}
        {activeTab === "Analytics"    && <AnalyticsTab />}
        {activeTab === "Reviews"      && <ReviewsTab />}
      </div>
    </div>
  );
}
