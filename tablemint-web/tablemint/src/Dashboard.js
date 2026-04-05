import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "axios";

const C = {
  bg:"#FDFAF6", bgSoft:"#F5F0E8", bgCard:"#FFFFFF",
  border:"#E8E0D0", amber:"#D4883A", amberSoft:"#FBF0E0",
  text:"#2C2416", textMid:"#6B5B45", textMuted:"#A0907A",
  green:"#4A9B6F", red:"#D05A4A", blue:"#4A7B9D",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');`;

const STATUS_CONFIG = {
  pending:   { label:"Pending",   color:C.amber, next:["confirmed","cancelled"] },
  confirmed: { label:"Confirmed", color:C.blue,  next:["seated","cancelled","no_show"] },
  seated:    { label:"Seated",    color:C.green, next:["completed"] },
  completed: { label:"Completed", color:C.green, next:[] },
  cancelled: { label:"Cancelled", color:C.red,   next:[] },
  no_show:   { label:"No Show",   color:C.red,   next:[] },
};

function Badge({ label, color, small }) {
  return (
    <span style={{ fontSize:small?10:11, fontWeight:700, padding:small?"2px 8px":"4px 10px", borderRadius:20,
      background:color+"20", color, border:`1px solid ${color}40`, textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function SideNav({ active, setActive, restaurantName, onLogout }) {
  const items = [
    { id:"dashboard",     icon:"📊", label:"Dashboard" },
    { id:"reservations",  icon:"📋", label:"Reservations" },
    { id:"preorders",     icon:"🍽️", label:"Pre-Orders" },
  ];
  return (
    <div style={{ width:220, background:C.text, minHeight:"100vh", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"28px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <span style={{ fontSize:20 }}>🍽️</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#fff" }}>
            Table<span style={{ color:C.amber }}>Mint</span>
          </span>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:0.5, textTransform:"uppercase" }}>Admin Portal</div>
        {restaurantName && (
          <div style={{ marginTop:8, fontSize:13, fontWeight:700, color:C.amber, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {restaurantName}
          </div>
        )}
      </div>
      <div style={{ flex:1, padding:"16px 12px" }}>
        {items.map(item => (
          <div key={item.id} onClick={() => setActive(item.id)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px",
              borderRadius:10, marginBottom:4, cursor:"pointer",
              background:active===item.id?C.amber+"25":"transparent", transition:"all 0.15s" }}
            onMouseEnter={e => { if(active!==item.id) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { if(active!==item.id) e.currentTarget.style.background="transparent"; }}>
            <span style={{ fontSize:16 }}>{item.icon}</span>
            <span style={{ fontSize:13, fontWeight:600, color:active===item.id?C.amber:"rgba(255,255,255,0.75)" }}>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"16px 12px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        <div onClick={onLogout}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px", borderRadius:10, cursor:"pointer" }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
          <span style={{ fontSize:16 }}>🚪</span>
          <span style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.5)" }}>Sign Out</span>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard overview ───────────────────────────────────────────────────────

function DashboardView({ restaurantId, restaurant }) {
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    Promise.all([
      axios.get(`/reservations/restaurant/${restaurantId}?limit=5`),
    ]).then(([resRes]) => {
      const all = resRes.data.data.reservations || [];
      setReservations(all);
      // Compute local stats from reservations
      const today = new Date(); today.setHours(0,0,0,0);
      const todayRes = all.filter(r => new Date(r.scheduledAt) >= today);
      const revenue = all.reduce((s,r) => s+(r.reservationFee||0), 0);
      const preOrderRevenue = all.reduce((s,r) => s+(r.preOrderTotal||0), 0);
      setStats({
        todayCount: todayRes.length,
        totalToday: all.filter(r => new Date(r.scheduledAt)>=today).length,
        totalRevenue: revenue,
        preOrderRevenue,
        confirmed: all.filter(r=>r.status==="confirmed").length,
        pending: all.filter(r=>r.status==="pending").length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) return <div style={{ padding:60, textAlign:"center", color:C.textMuted }}>Loading dashboard…</div>;

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:C.text, marginBottom:4 }}>
          Dashboard
        </h1>
        <p style={{ color:C.textMuted, fontSize:14 }}>
          {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </p>
      </div>

      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:32 }}>
          {[
            { icon:"📅", label:"Today's Bookings", value:stats.todayCount, color:C.blue },
            { icon:"⏳", label:"Pending Confirm", value:stats.pending, color:C.amber },
            { icon:"✅", label:"Confirmed", value:stats.confirmed, color:C.green },
            { icon:"💰", label:"Reservation Fees", value:`₹${stats.totalRevenue}`, color:C.green },
          ].map(s => (
            <div key={s.label} style={{ background:C.bgCard, padding:20, borderRadius:14, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 }}>{s.label}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.border}` }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.text }}>Recent Reservations</h2>
        </div>
        {reservations.length===0 ? (
          <div style={{ padding:40, textAlign:"center", color:C.textMuted, fontSize:14 }}>No reservations yet.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:C.bgSoft }}>
                {["Customer","Guests","Scheduled At","Fee","Status"].map(h => (
                  <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:0.5, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r._id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{r.customer?.name||"—"}</div>
                    <div style={{ fontSize:12, color:C.textMuted }}>{r.customer?.phone||r.customer?.email||""}</div>
                  </td>
                  <td style={{ padding:"14px 16px", fontSize:14, color:C.text }}>👥 {r.numberOfGuests}</td>
                  <td style={{ padding:"14px 16px", fontSize:13, color:C.textMid }}>
                    {new Date(r.scheduledAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </td>
                  <td style={{ padding:"14px 16px", fontSize:14, fontWeight:700, color:C.amber }}>₹{r.reservationFee||0}</td>
                  <td style={{ padding:"14px 16px" }}>
                    <Badge label={STATUS_CONFIG[r.status]?.label||r.status} color={STATUS_CONFIG[r.status]?.color||C.textMuted} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Reservations View ────────────────────────────────────────────────────────

function ReservationsView({ restaurantId }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(null);

  const fetchReservations = useCallback(() => {
    if (!restaurantId) return;
    setLoading(true);
    const params = filter!=="all" ? `?status=${filter}` : "";
    axios.get(`/reservations/restaurant/${restaurantId}${params}`)
      .then(r => setReservations(r.data.data.reservations||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [restaurantId, filter]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await axios.patch(`/reservations/${id}/status`, { status });
      setReservations(prev => prev.map(r => r._id===id ? {...r, status} : r));
      if (selected?._id===id) setSelected(p => ({...p, status}));
    } catch(e) {}
    finally { setUpdating(null); }
  };

  const filtered = filter==="all" ? reservations : reservations.filter(r=>r.status===filter);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:C.text, marginBottom:8 }}>Reservations</h1>
        {/* Filter tabs */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["all","pending","confirmed","seated","completed","cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:"7px 16px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none",
                background:filter===f ? C.amber : C.bgSoft,
                color:filter===f ? "#fff" : C.textMid, fontFamily:"'DM Sans',sans-serif" }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:"center", color:C.textMuted }}>Loading reservations…</div>
      ) : filtered.length===0 ? (
        <div style={{ padding:60, textAlign:"center", color:C.textMuted, background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}` }}>
          No {filter!=="all"?filter+" ":""} reservations found.
        </div>
      ) : (
        <div style={{ display:"flex", gap:20 }}>
          {/* List */}
          <div style={{ flex:1, background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.bgSoft }}>
                  {["Customer","When","Guests","Pre-Order","Status","Actions"].map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:0.5, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cfg = STATUS_CONFIG[r.status]||{};
                  return (
                    <tr key={r._id}
                      onClick={() => setSelected(r)}
                      style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:selected?._id===r._id?C.amberSoft:"transparent", transition:"background 0.1s" }}
                      onMouseEnter={e => { if(selected?._id!==r._id) e.currentTarget.style.background=C.bgSoft; }}
                      onMouseLeave={e => { if(selected?._id!==r._id) e.currentTarget.style.background="transparent"; }}>
                      <td style={{ padding:"14px 16px" }}>
                        <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{r.customer?.name||"—"}</div>
                        <div style={{ fontSize:12, color:C.textMuted }}>{r.customer?.phone||"—"}</div>
                      </td>
                      <td style={{ padding:"14px 16px", fontSize:13, color:C.textMid }}>
                        {new Date(r.scheduledAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                      </td>
                      <td style={{ padding:"14px 16px", fontSize:14, textAlign:"center" }}>👥 {r.numberOfGuests}</td>
                      <td style={{ padding:"14px 16px", fontSize:13, color:r.preOrderItems?.length?C.green:C.textMuted }}>
                        {r.preOrderItems?.length ? `${r.preOrderItems.length} items · ₹${r.preOrderTotal}` : "None"}
                      </td>
                      <td style={{ padding:"14px 16px" }}>
                        <Badge label={cfg.label||r.status} color={cfg.color||C.textMuted} />
                      </td>
                      <td style={{ padding:"14px 16px" }}>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {(cfg.next||[]).map(nextStatus => (
                            <button key={nextStatus}
                              disabled={updating===r._id}
                              onClick={e => { e.stopPropagation(); updateStatus(r._id, nextStatus); }}
                              style={{ padding:"5px 10px", fontSize:11, fontWeight:700, borderRadius:8, border:"none",
                                background:STATUS_CONFIG[nextStatus]?.color+"20",
                                color:STATUS_CONFIG[nextStatus]?.color, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                              {nextStatus.charAt(0).toUpperCase()+nextStatus.slice(1)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ width:300, background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`, padding:20, alignSelf:"flex-start", flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:C.text }}>Details</h3>
                <button onClick={() => setSelected(null)}
                  style={{ background:"transparent", border:"none", fontSize:18, cursor:"pointer", color:C.textMuted }}>×</button>
              </div>

              <div style={{ marginBottom:16, padding:16, background:C.bgSoft, borderRadius:10 }}>
                <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:4 }}>{selected.customer?.name||"—"}</div>
                <div style={{ fontSize:13, color:C.textMuted }}>{selected.customer?.email||"—"}</div>
                <div style={{ fontSize:13, color:C.textMuted }}>{selected.customer?.phone||"—"}</div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                {[
                  { label:"Booking ID", value:`#${selected._id.slice(-8).toUpperCase()}` },
                  { label:"Guests", value:selected.numberOfGuests },
                  { label:"Type", value:selected.type },
                  { label:"Scheduled", value:new Date(selected.scheduledAt).toLocaleString("en-IN") },
                  { label:"Res Fee", value:`₹${selected.reservationFee||0}` },
                  { label:"Status", value:<Badge label={STATUS_CONFIG[selected.status]?.label} color={STATUS_CONFIG[selected.status]?.color} /> },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:C.textMuted, fontWeight:600 }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{value}</span>
                  </div>
                ))}
              </div>

              {selected.specialRequests && (
                <div style={{ marginBottom:16, padding:12, background:C.amberSoft, borderRadius:8, fontSize:13, color:C.textMid }}>
                  💬 {selected.specialRequests}
                </div>
              )}

              {selected.preOrderItems?.length > 0 && (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8 }}>🍽️ Pre-Order</div>
                  {selected.preOrderItems.map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{item.name}</div>
                        <div style={{ fontSize:11, color:C.textMuted }}>Qty: {item.quantity} × ₹{item.price}</div>
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.amber }}>₹{item.quantity*item.price}</div>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontWeight:700 }}>
                    <span style={{ fontSize:14, color:C.text }}>Pre-Order Total</span>
                    <span style={{ fontSize:16, color:C.amber }}>₹{selected.preOrderTotal}</span>
                  </div>
                  <div style={{ padding:10, background:C.green+"15", borderRadius:8, fontSize:12, color:C.green, fontWeight:600, textAlign:"center" }}>
                    💳 Pre-order paid at restaurant
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
                {(STATUS_CONFIG[selected.status]?.next||[]).map(nextStatus => (
                  <button key={nextStatus}
                    disabled={updating===selected._id}
                    onClick={() => updateStatus(selected._id, nextStatus)}
                    style={{ padding:"11px", fontSize:13, fontWeight:700, borderRadius:10, border:"none",
                      background:STATUS_CONFIG[nextStatus]?.color, color:"#fff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    Mark as {nextStatus.charAt(0).toUpperCase()+nextStatus.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pre-Orders View ──────────────────────────────────────────────────────────

function PreOrdersView({ restaurantId }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    axios.get(`/reservations/restaurant/${restaurantId}?status=pending,confirmed,seated`)
      .then(r => {
        const withOrders = (r.data.data.reservations||[]).filter(x => x.preOrderItems?.length > 0);
        setReservations(withOrders);
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [restaurantId]);

  if (loading) return <div style={{ padding:60, textAlign:"center", color:C.textMuted }}>Loading pre-orders…</div>;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:C.text, marginBottom:4 }}>Pre-Orders</h1>
        <p style={{ color:C.textMuted, fontSize:14 }}>{reservations.length} upcoming reservation{reservations.length!==1?"s":""} with pre-orders</p>
      </div>

      {reservations.length===0 ? (
        <div style={{ padding:60, textAlign:"center", color:C.textMuted, background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}` }}>
          No upcoming pre-orders right now.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
          {reservations.map(r => (
            <div key={r._id} style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
              <div style={{ height:4, background:STATUS_CONFIG[r.status]?.color||C.amber }} />
              <div style={{ padding:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{r.customer?.name||"—"}</div>
                    <div style={{ fontSize:12, color:C.textMuted }}>
                      {new Date(r.scheduledAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · 👥 {r.numberOfGuests}
                    </div>
                  </div>
                  <Badge label={STATUS_CONFIG[r.status]?.label||r.status} color={STATUS_CONFIG[r.status]?.color||C.amber} />
                </div>

                <div style={{ marginBottom:12 }}>
                  {r.preOrderItems.map((item, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0",
                      borderBottom:i<r.preOrderItems.length-1?`1px solid ${C.border}`:"none" }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{item.name}</span>
                        <span style={{ fontSize:12, color:C.textMuted, marginLeft:8 }}>×{item.quantity}</span>
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, color:C.amber }}>₹{item.quantity*item.price}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  paddingTop:12, borderTop:`2px solid ${C.border}` }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Total</span>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:C.amber }}>₹{r.preOrderTotal}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the admin's assigned restaurant
    axios.get("/auth/me")
      .then(r => {
        const u = r.data.data.user;
        if (u.assignedRestaurant) {
          const rId = typeof u.assignedRestaurant === "object" ? u.assignedRestaurant._id : u.assignedRestaurant;
          return axios.get(`/restaurants/${rId}`);
        }
      })
      .then(r => { if (r) setRestaurant(r.data.data.restaurant); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); navigate("/for-restaurants"); };

  const renderContent = () => {
    if (loading) return <div style={{ padding:80, textAlign:"center", color:C.textMuted }}>Loading…</div>;

    if (!restaurant) {
      return (
        <div style={{ padding:80, textAlign:"center" }}>
          <div style={{ fontSize:60, marginBottom:16 }}>🏢</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, color:C.text, marginBottom:8 }}>No Restaurant Assigned</h2>
          <p style={{ color:C.textMuted, fontSize:14, lineHeight:1.7 }}>
            Your admin account hasn't been assigned to a restaurant yet.<br/>
            Please contact the restaurant owner.
          </p>
        </div>
      );
    }

    const rId = restaurant._id;
    switch(active) {
      case "dashboard":    return <DashboardView restaurantId={rId} restaurant={restaurant} />;
      case "reservations": return <ReservationsView restaurantId={rId} />;
      case "preorders":    return <PreOrdersView restaurantId={rId} />;
      default:             return null;
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`${FONTS} *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#D4C4B0;border-radius:3px} table{border-collapse:collapse;width:100%}`}</style>
      <SideNav active={active} setActive={setActive} restaurantName={restaurant?.name} onLogout={handleLogout} />
      <div style={{ flex:1, background:C.bg, overflowY:"auto" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"40px 40px" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
