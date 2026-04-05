import { useState, useEffect } from "react";
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
  pending:   { label:"Pending",   color:C.amber },
  confirmed: { label:"Confirmed", color:C.blue  },
  seated:    { label:"Seated",    color:C.green },
  completed: { label:"Completed", color:C.green },
  cancelled: { label:"Cancelled", color:C.red   },
  no_show:   { label:"No Show",   color:C.red   },
};

function Badge({ label, color }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20,
      background:color+"20", color, border:`1px solid ${color}40`, textTransform:"uppercase", letterSpacing:0.5 }}>
      {label}
    </span>
  );
}

export default function CaptainPage() {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn, loading: authLoading } = useAuth();

  const [customerId, setCustomerId] = useState("");
  const [result, setResult] = useState(null); // { customer, reservation }
  const [menu, setMenu] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Add items state
  const [cart, setCart] = useState({}); // { menuItemId: quantity }
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const [addError, setAddError] = useState("");

  // Status update
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || !['captain','admin'].includes(user?.role))) {
      navigate('/admin/login');
    }
  }, [isLoggedIn, authLoading, user, navigate]);

  // Load restaurant menu on mount
  useEffect(() => {
    if (!isLoggedIn) return;
    axios.get("/captain/restaurant/menu")
      .then(r => setMenu(r.data.data.menu || []))
      .catch(() => {});
  }, [isLoggedIn]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (customerId.length !== 9) { setSearchError("Customer ID must be exactly 9 digits."); return; }
    setSearching(true); setSearchError(""); setResult(null); setCart({}); setAddMsg(""); setAddError("");
    try {
      const res = await axios.get(`/captain/lookup/${customerId}`);
      setResult(res.data.data);
    } catch(err) {
      setSearchError(err.response?.data?.message || "Customer not found.");
    } finally { setSearching(false); }
  };

  const updateCart = (menuItemId, qty) => {
    setCart(p => {
      const next = { ...p };
      if (qty <= 0) delete next[menuItemId];
      else next[menuItemId] = qty;
      return next;
    });
  };

  const handleAddItems = async () => {
    const items = Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (items.length === 0) return;
    setAdding(true); setAddMsg(""); setAddError("");
    try {
      const res = await axios.post(`/captain/reservations/${result.reservation._id}/add-items`, { items });
      setAddMsg(`✅ ${res.data.message}`);
      setCart({});
      // Update reservation in result
      setResult(p => ({ ...p, reservation: { ...p.reservation, ...res.data.data.reservation } }));
    } catch(err) {
      setAddError(err.response?.data?.message || "Failed to add items.");
    } finally { setAdding(false); }
  };

  const updateStatus = async (status) => {
    if (!result?.reservation) return;
    setUpdating(true);
    try {
      await axios.patch(`/reservations/${result.reservation._id}/status`, { status });
      setResult(p => ({ ...p, reservation: { ...p.reservation, status } }));
    } catch(e) {}
    finally { setUpdating(false); }
  };

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menu.find(m => m._id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const nextStatuses = STATUS_CONFIG[result?.reservation?.status]
    ? { pending:["confirmed","cancelled"], confirmed:["seated","cancelled","no_show"], seated:["completed"] }[result?.reservation?.status] || []
    : [];

  if (authLoading) return null;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`${FONTS} *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Nav */}
      <nav style={{ background:C.text, padding:"0 6%", height:60,
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:18 }}>🍽️</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#fff" }}>
            Table<span style={{ color:C.amber }}>Mint</span>
          </span>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontWeight:600, marginLeft:8 }}>Captain Portal</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>{user?.name}</span>
          <button onClick={async () => { await logout(); navigate("/admin/login"); }}
            style={{ padding:"6px 14px", background:"transparent", border:"1px solid rgba(255,255,255,0.2)",
              borderRadius:8, color:"rgba(255,255,255,0.6)", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"40px 24px" }}>

        {/* Search */}
        <div style={{ background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}`, padding:32, marginBottom:28 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:C.text, marginBottom:6 }}>
            Customer Lookup
          </h1>
          <p style={{ color:C.textMuted, fontSize:14, marginBottom:24 }}>
            Ask the customer for their 9-digit TableMint ID and enter it below.
          </p>

          <form onSubmit={handleSearch} style={{ display:"flex", gap:12 }}>
            <input
              value={customerId}
              onChange={e => setCustomerId(e.target.value.replace(/\D/g,'').slice(0,9))}
              placeholder="Enter 9-digit customer ID"
              maxLength={9}
              style={{ flex:1, padding:"14px 18px", borderRadius:12, border:`2px solid ${customerId.length===9?C.amber:C.border}`,
                fontSize:22, fontWeight:700, color:C.text, fontFamily:"monospace", outline:"none",
                letterSpacing:4, textAlign:"center", transition:"border 0.2s" }}
              onFocus={e => e.target.style.borderColor=C.amber}
              onBlur={e => e.target.style.borderColor=customerId.length===9?C.amber:C.border}
            />
            <button type="submit" disabled={searching || customerId.length!==9}
              style={{ padding:"14px 28px", background:customerId.length===9?C.amber:C.bgSoft,
                border:"none", borderRadius:12, color:customerId.length===9?"#fff":C.textMuted,
                fontSize:16, fontWeight:700, cursor:customerId.length===9?"pointer":"not-allowed",
                fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s", whiteSpace:"nowrap" }}>
              {searching ? "Searching…" : "🔍 Look Up"}
            </button>
          </form>

          {searchError && (
            <div style={{ marginTop:14, padding:"12px 16px", background:C.red+"15",
              border:`1px solid ${C.red}30`, borderRadius:10, fontSize:14, color:C.red }}>
              ⚠️ {searchError}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div>
            {/* Customer info */}
            <div style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`, padding:24, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:56, height:56, borderRadius:"50%", background:C.amber+"20",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.amber }}>
                  {result.customer.name[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:20, fontWeight:700, color:C.text, marginBottom:4 }}>{result.customer.name}</div>
                  <div style={{ display:"flex", gap:20, fontSize:13, color:C.textMuted }}>
                    <span>📱 {result.customer.phone || "No phone"}</span>
                    <span>✉️ {result.customer.email}</span>
                    <span style={{ fontFamily:"monospace", color:C.amber, fontWeight:700 }}>ID: {result.customer.customerId}</span>
                  </div>
                </div>
                <button onClick={() => { setResult(null); setCustomerId(""); setCart({}); }}
                  style={{ padding:"8px 16px", background:"transparent", border:`1.5px solid ${C.border}`,
                    borderRadius:8, color:C.textMid, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  Clear
                </button>
              </div>
            </div>

            {/* No reservation */}
            {!result.reservation ? (
              <div style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`,
                padding:40, textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, marginBottom:8 }}>
                  No Active Reservation
                </h3>
                <p style={{ color:C.textMuted, fontSize:14 }}>
                  This customer has no pending, confirmed, or seated reservation at your restaurant right now.
                </p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

                {/* Reservation details */}
                <div style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`, padding:24 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                    <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text }}>Reservation</h3>
                    <Badge label={STATUS_CONFIG[result.reservation.status]?.label||result.reservation.status}
                      color={STATUS_CONFIG[result.reservation.status]?.color||C.textMuted} />
                  </div>

                  {[
                    { label:"Booking ID",  value:`#${result.reservation._id?.slice(-8).toUpperCase()}` },
                    { label:"Scheduled",   value:new Date(result.reservation.scheduledAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) },
                    { label:"Guests",      value:`👥 ${result.reservation.numberOfGuests}` },
                    { label:"Type",        value:result.reservation.type==="instant"?"Instant":"Scheduled" },
                    { label:"Res Fee",     value:`₹${result.reservation.reservationFee||0} (paid)` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between",
                      padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:12, color:C.textMuted, fontWeight:600 }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{value}</span>
                    </div>
                  ))}

                  {result.reservation.specialRequests && (
                    <div style={{ marginTop:14, padding:12, background:C.amberSoft, borderRadius:8, fontSize:13, color:C.textMid }}>
                      💬 {result.reservation.specialRequests}
                    </div>
                  )}

                  {/* Status actions */}
                  {nextStatuses.length > 0 && (
                    <div style={{ marginTop:20 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:"uppercase",
                        letterSpacing:0.5, marginBottom:10 }}>Update Status</div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {nextStatuses.map(s => (
                          <button key={s} onClick={() => updateStatus(s)} disabled={updating}
                            style={{ flex:1, padding:"10px", background:STATUS_CONFIG[s]?.color,
                              border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700,
                              cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                            {s.charAt(0).toUpperCase()+s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pre-order + Add items */}
                <div style={{ background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`, padding:24 }}>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, marginBottom:16 }}>
                    Order
                  </h3>

                  {/* Existing pre-order items */}
                  {result.reservation.preOrderItems?.length > 0 ? (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:"uppercase",
                        letterSpacing:0.5, marginBottom:10 }}>Pre-Ordered</div>
                      {result.reservation.preOrderItems.map((item, i) => (
                        <div key={i} style={{ display:"flex", justifyContent:"space-between",
                          padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                          <div>
                            <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{item.name}</span>
                            <span style={{ fontSize:12, color:C.textMuted, marginLeft:8 }}>×{item.quantity}</span>
                          </div>
                          <span style={{ fontSize:13, fontWeight:700, color:C.amber }}>₹{item.price*item.quantity}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontWeight:700 }}>
                        <span style={{ color:C.text }}>Pre-Order Total</span>
                        <span style={{ color:C.amber, fontSize:16 }}>₹{result.reservation.preOrderTotal}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:"16px", background:C.bgSoft, borderRadius:8, fontSize:13, color:C.textMuted, marginBottom:16, textAlign:"center" }}>
                      No pre-order items yet
                    </div>
                  )}

                  {/* Add items from menu */}
                  {!['completed','cancelled','no_show'].includes(result.reservation.status) && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:"uppercase",
                        letterSpacing:0.5, marginBottom:10 }}>Add More Items</div>

                      <div style={{ maxHeight:220, overflowY:"auto", marginBottom:12 }}>
                        {menu.filter(m => m.isAvailable).map(item => (
                          <div key={item._id} style={{ display:"flex", justifyContent:"space-between",
                            alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{item.name}</div>
                              <div style={{ fontSize:11, color:C.textMuted }}>
                                {item.isVeg ? "🟢" : "🔴"} {item.category} · ₹{item.price}
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <button onClick={() => updateCart(item._id, (cart[item._id]||0)-1)}
                                style={{ width:28, height:28, borderRadius:"50%", border:`1.5px solid ${C.border}`,
                                  background:"transparent", cursor:"pointer", fontSize:16, color:C.textMid,
                                  display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                              <span style={{ fontSize:14, fontWeight:700, color:C.text, minWidth:20, textAlign:"center" }}>
                                {cart[item._id] || 0}
                              </span>
                              <button onClick={() => updateCart(item._id, (cart[item._id]||0)+1)}
                                style={{ width:28, height:28, borderRadius:"50%", background:C.amber,
                                  border:"none", cursor:"pointer", fontSize:16, color:"#fff",
                                  display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {Object.keys(cart).length > 0 && (
                        <div style={{ padding:"12px 16px", background:C.amberSoft,
                          borderRadius:10, marginBottom:12, display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>
                            {Object.values(cart).reduce((a,b)=>a+b,0)} item(s) to add
                          </span>
                          <span style={{ fontSize:13, fontWeight:700, color:C.amber }}>+₹{cartTotal}</span>
                        </div>
                      )}

                      {addMsg && <div style={{ padding:"10px 14px", background:C.green+"15", borderRadius:8, fontSize:13, color:C.green, marginBottom:10 }}>{addMsg}</div>}
                      {addError && <div style={{ padding:"10px 14px", background:C.red+"15", borderRadius:8, fontSize:13, color:C.red, marginBottom:10 }}>⚠️ {addError}</div>}

                      <button onClick={handleAddItems}
                        disabled={adding || Object.keys(cart).length===0}
                        style={{ width:"100%", padding:"12px", background:Object.keys(cart).length>0?C.green:C.bgSoft,
                          border:"none", borderRadius:10, color:Object.keys(cart).length>0?"#fff":C.textMuted,
                          fontSize:14, fontWeight:700, cursor:Object.keys(cart).length>0?"pointer":"not-allowed",
                          fontFamily:"'DM Sans',sans-serif" }}>
                        {adding ? "Adding…" : `Add to Order${Object.keys(cart).length>0?` · ₹${cartTotal}`:""}` }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
