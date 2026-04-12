import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "axios";
import ReviewModal from "./components/ReviewModal";
import BillModal from "./components/BillModal";
import SpecialRequestForm from "./components/SpecialRequestForm";

const C = {
  bg: "#FDFAF6", bgSoft: "#F5F0E8", bgCard: "#FFFFFF",
  border: "#E8E0D0", amber: "#D4883A", amberSoft: "#FBF0E0",
  text: "#2C2416", textMid: "#6B5B45", textMuted: "#A0907A",
  green: "#4A9B6F", red: "#D05A4A", blue: "#4A7B9D",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');`;

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: C.amber,   icon: "⏳" },
  confirmed: { label: "Confirmed", color: C.blue,    icon: "✅" },
  seated:    { label: "Seated",    color: C.green,   icon: "🪑" },
  completed: { label: "Completed", color: C.green,   icon: "✓"  },
  cancelled: { label: "Cancelled", color: C.red,     icon: "✗"  },
  no_show:   { label: "No Show",   color: C.red,     icon: "❌" },
};

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
      background: color + "20", color, border: `1px solid ${color}40`,
      textTransform: "uppercase", letterSpacing: 0.5,
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
      position: "sticky", top: 0, zIndex: 100,
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
            padding: "8px 16px", fontSize: 13, fontWeight: 600, color: C.textMid,
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          }}>
          Browse Restaurants
        </button>
        <button onClick={onLogout}
          style={{
            background: "transparent", border: "none", fontSize: 13, fontWeight: 600,
            color: C.red, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user }) {
  const [editing, setEditing]     = useState(false);
  const [name, setName]           = useState(user?.name || "");
  const [phone, setPhone]         = useState(user?.phone || "");
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState("");
  const [error, setError]         = useState("");
  const [changingPw, setChangingPw]   = useState(false);
  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [pwMsg, setPwMsg]             = useState("");
  const [pwError, setPwError]         = useState("");

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
    if (newPw.length < 6)   { setPwError("Password must be at least 6 characters."); return; }
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
    fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff",
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
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.amber, cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}>
              Edit
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: C.amber + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: C.amber,
          }}>
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{user?.email}</div>
            <Badge label="Customer" color={C.blue} />
          </div>
        </div>

        {msg   && <div style={{ padding: "10px 14px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>{msg}</div>}
        {error && <div style={{ padding: "10px 14px", background: C.red + "15", borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {error}</div>}

        {editing ? (
          <div>
            {[
              { label: "Full Name", value: name, set: setName, type: "text" },
              { label: "Phone",     value: phone, set: setPhone, type: "tel" },
            ].map(({ label, value, set, type }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                <input type={type} value={value} onChange={e => set(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = C.amber)} onBlur={e => (e.target.style.borderColor = C.border)} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveProfile} disabled={loading}
                style={{ flex: 1, padding: "10px", background: C.amber, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => { setEditing(false); setName(user?.name); setPhone(user?.phone); }}
                style={{ padding: "10px 16px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textMid, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Full Name",    value: user?.name },
              { label: "Email",        value: user?.email },
              { label: "Phone",        value: user?.phone || "Not set" },
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
              style={{ padding: "7px 16px", background: C.amberSoft, border: `1px solid ${C.amber}40`, borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.amber, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Change
            </button>
          )}
        </div>

        {pwMsg   && <div style={{ padding: "10px 14px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>{pwMsg}</div>}
        {pwError && <div style={{ padding: "10px 14px", background: C.red + "15", borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {pwError}</div>}

        {changingPw ? (
          <div>
            {[
              { label: "Current Password", value: currentPw, set: setCurrentPw },
              { label: "New Password",     value: newPw,     set: setNewPw },
              { label: "Confirm New",      value: confirmPw, set: setConfirmPw },
            ].map(({ label, value, set }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                <input type="password" value={value} onChange={e => set(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = C.amber)} onBlur={e => (e.target.style.borderColor = C.border)} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={savePassword} disabled={loading}
                style={{ flex: 1, padding: "10px", background: C.amber, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {loading ? "Saving…" : "Update Password"}
              </button>
              <button onClick={() => { setChangingPw(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwError(""); }}
                style={{ padding: "10px 16px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textMid, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
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

// ─── Preferences Tab ──────────────────────────────────────────────────────────
function PreferencesTab({ user }) {
  const { setUser } = useAuth(); // to refresh user state after updating
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");
  const [error, setError]     = useState("");

  const [city, setCity] = useState(user?.city || "");
  const [priceRange, setPriceRange] = useState(user?.preferredPriceRange || "");
  const [cuisines, setCuisines] = useState(user?.preferredCuisines || []);
  const [dietary, setDietary] = useState(user?.dietaryPreferences || []);

  const ALL_CUISINES = ["North Indian", "South Indian", "Chinese", "Italian", "Mexican", "Continental", "Japanese", "Healthy", "Desserts"];
  const ALL_DIETARY = ["Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "Eggetarian", "Halal"];
  const PRICE_RANGES = ["Up to ₹1000", "₹1000 - ₹2000", "₹2000 - ₹3000", "₹3000+"];

  const toggleArray = (arr, setter, val) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const savePreferences = async () => {
    setLoading(true); setError(""); setMsg("");
    try {
      const res = await axios.patch("/auth/update-preferences", {
        city,
        preferredPriceRange: priceRange,
        preferredCuisines: cuisines,
        dietaryPreferences: dietary,
      });
      const updatedUser = res.data.data.user;
      if (setUser) {
         setUser(updatedUser);
         localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      setMsg("Preferences saved! Your recommendations will be updated.");
      setEditing(false);
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update preferences.");
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
    fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff",
  };

  const Pct = user?.profileCompletedPercentage || 0;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Progress Card */}
      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: "24px 28px", display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke={C.border} strokeWidth="8" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={C.amber} strokeWidth="8" 
              strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * Pct) / 100} 
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-in-out" }} />
          </svg>
          <div style={{ position: "absolute", fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Playfair Display',serif" }}>
            {Pct}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Profile Completion</h3>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
            {Pct === 100 
              ? "Your profile is fully complete! You'll receive the best personalized recommendations." 
              : "Complete your dining preferences to get better restaurant recommendations tailored just for you."}
          </p>
        </div>
      </div>

      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.text }}>Dining Preferences</h3>
          {!editing && (
            <button onClick={() => setEditing(true)}
              style={{
                padding: "7px 16px", background: C.amberSoft, border: `1px solid ${C.amber}40`,
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.amber, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              }}>
              Edit
            </button>
          )}
        </div>

        {msg   && <div style={{ padding: "10px 14px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>{msg}</div>}
        {error && <div style={{ padding: "10px 14px", background: C.red + "15", borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {error}</div>}

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* City */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Your City</label>
              <input type="text" placeholder="e.g. Pune, Mumbai" value={city} onChange={e => setCity(e.target.value)} style={inp}
                onFocus={e => (e.target.style.borderColor = C.amber)} onBlur={e => (e.target.style.borderColor = C.border)} />
            </div>

            {/* Price Range */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Preferred Price Range</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRICE_RANGES.map(pr => (
                  <button key={pr} onClick={() => setPriceRange(pr)}
                    style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      border: priceRange === pr ? `1.5px solid ${C.amber}` : `1.5px solid ${C.border}`,
                      background: priceRange === pr ? C.amberSoft : "transparent",
                      color: priceRange === pr ? C.amber : C.textMuted,
                      transition: "all 0.2s"
                    }}>
                    {pr}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Dietary Preferences</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALL_DIETARY.map(item => {
                  const active = dietary.includes(item);
                  return (
                    <button key={item} onClick={() => toggleArray(dietary, setDietary, item)}
                      style={{
                        padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                        background: active ? C.green + "15" : "transparent",
                        color: active ? C.green : C.textMid, transition: "all 0.15s"
                      }}>
                      {active ? "✓ " : ""}{item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cuisines */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Favorite Cuisines</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALL_CUISINES.map(item => {
                  const active = cuisines.includes(item);
                  return (
                    <button key={item} onClick={() => toggleArray(cuisines, setCuisines, item)}
                      style={{
                        padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: active ? `1px solid ${C.amber}` : `1px solid ${C.border}`,
                        background: active ? C.amberSoft : "transparent",
                        color: active ? C.amber : C.textMid, transition: "all 0.15s"
                      }}>
                      {active ? "✓ " : ""}{item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={savePreferences} disabled={loading}
                style={{ flex: 1, padding: "12px", background: C.amber, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {loading ? "Saving…" : "Save Preferences"}
              </button>
              <button onClick={() => { 
                setEditing(false); setCity(user?.city || ""); setPriceRange(user?.preferredPriceRange || ""); 
                setCuisines(user?.preferredCuisines || []); setDietary(user?.dietaryPreferences || []);
              }}
                style={{ padding: "12px 20px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.textMid, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Your City</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: user?.city ? C.text : C.border }}>{user?.city || "Not set"}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Preferred Price Range</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: user?.preferredPriceRange ? C.amber : C.border }}>{user?.preferredPriceRange || "Not set"}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Dietary Preferences</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {user?.dietaryPreferences?.length > 0 ? user.dietaryPreferences.map(d => (
                  <Badge key={d} label={d} color={C.green} />
                )) : <span style={{ fontSize: 14, color: C.border, fontWeight: 600 }}>Not set</span>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Favorite Cuisines</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {user?.preferredCuisines?.length > 0 ? user.preferredCuisines.map(c => (
                  <Badge key={c} label={c} color={C.amber} />
                )) : <span style={{ fontSize: 14, color: C.border, fontWeight: 600 }}>Not set</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────
function BookingsTab() {
  const navigate = useNavigate();
  const [reservations, setReservations]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState("all");
  const [selected, setSelected]           = useState(null);
  const [cancelling, setCancelling]       = useState(null);

  // Review state
  const [reviewTarget, setReviewTarget]   = useState(null);
  const [reviewedIds, setReviewedIds]     = useState(new Set());
  const [reviewSuccess, setReviewSuccess] = useState(null);

  // Bill state
  const [billTarget, setBillTarget]       = useState(null);  // reservation object with full bill data
  const [billLoading, setBillLoading]     = useState(null);  // reservation._id being loaded
  const [paying, setPaying]               = useState(false);

  // Track customer messages (updated locally after send)
  const [localMessages, setLocalMessages] = useState({}); // { reservationId: message }

  useEffect(() => {
    // Fetch all reservations
    axios.get("/reservations/my?limit=100")
      .then(r => {
        const allReservations = r.data.data.reservations || [];
        setReservations(allReservations);

        // Pre-seed reviewedIds from backend — find completed bookings that already have a review
        // We use the restaurant review eligibility endpoint per restaurant, but that's expensive.
        // Simpler: fetch the customer's own reviews and build a set of reviewed reservationIds.
        return axios.get("/reviews/my").catch(() => ({ data: { data: { reviews: [] } } }));
      })
      .then(r => {
        const myReviews = r?.data?.data?.reviews || [];
        const doneIds = new Set(myReviews.map(rv => rv.reservation?.toString()).filter(Boolean));
        setReviewedIds(doneIds);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cancelReservation = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this reservation?")) return;
    setCancelling(id);
    try {
      await axios.patch(`/reservations/${id}/cancel`, { reason: "Cancelled by customer" });
      setReservations(prev => prev.map(r => r._id === id ? { ...r, status: "cancelled" } : r));
      if (selected?._id === id) setSelected(p => ({ ...p, status: "cancelled" }));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to cancel reservation.");
    } finally { setCancelling(null); }
  };

  // ── Review eligibility: ONLY completed status + past date ─────────────────
  const isReviewable = (r) =>
    r.status === "completed" && new Date(r.scheduledAt) <= new Date();

  // ── Cancel eligibility: pending or confirmed only ─────────────────────────
  const canCancel = (r) => ["pending", "confirmed"].includes(r.status);

  const filtered = filter === "all"      ? reservations
    : filter === "upcoming"              ? reservations.filter(r => ["pending", "confirmed", "seated"].includes(r.status))
    : filter === "past"                  ? reservations.filter(r => ["completed", "cancelled", "no_show"].includes(r.status))
    : reservations.filter(r => r.status === filter);

  const handleReviewSuccess = (reservationId) => {
    setReviewedIds(prev => new Set([...prev, reservationId]));
    setReviewSuccess(reservationId);
    setReviewTarget(null);
    setTimeout(() => setReviewSuccess(null), 4000);
  };

  // ── Load full bill data from API then open BillModal ─────────────────────
  const openBill = async (reservationId) => {
    setBillLoading(reservationId);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/reservations/${reservationId}/bill`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setBillTarget(res.data.data.reservation);
    } catch (e) {
      alert(e.response?.data?.message || "Could not load bill. Please try again.");
    } finally {
      setBillLoading(null);
    }
  };

  // ── Mark payment as paid ─────────────────────────────────────────────────
  const handlePay = async () => {
    if (!billTarget) return;
    setPaying(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `/reservations/${billTarget._id}/payment`,
        { paymentStatus: "paid" },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // Update local bill state
      setBillTarget(p => ({ ...p, paymentStatus: "paid", paymentReference: res.data.data.paymentReference }));
      // Also update reservation list
      setReservations(prev => prev.map(r =>
        r._id === billTarget._id ? { ...r, paymentStatus: "paid" } : r
      ));
    } catch (e) {
      alert(e.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Loading bookings…</div>;

  return (
    <div>
      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { id: "all",       label: "All" },
          { id: "upcoming",  label: "Upcoming" },
          { id: "past",      label: "Past" },
          { id: "cancelled", label: "Cancelled" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: "none",
              background: filter === f.id ? C.amber : C.bgSoft,
              color: filter === f.id ? "#fff" : C.textMid,
              fontFamily: "'DM Sans',sans-serif",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Review success toast */}
      {reviewSuccess && (
        <div style={{
          marginBottom: 16, padding: "14px 18px",
          background: "linear-gradient(135deg, #E8F5EE, #D1EEE0)",
          border: `1.5px solid ${C.green}40`, borderRadius: 12,
          fontSize: 14, color: C.green, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          🎉 Thank you! Your review has been submitted successfully.
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: C.text, marginBottom: 8 }}>No bookings yet</h3>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 24 }}>Explore restaurants and make your first reservation!</p>
          <button onClick={() => navigate("/explore")}
            style={{
              padding: "12px 28px", background: C.amber, border: "none", borderRadius: 12,
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            }}>
            Browse Restaurants →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20 }}>
          {/* ── Booking List ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map(r => {
              const cfg        = STATUS_CONFIG[r.status] || {};
              const isSelected = selected?._id === r._id;
              const reviewable = isReviewable(r);
              const alreadyDone = reviewedIds.has(r._id);
              const hasBill    = r.status === "completed" && r.billGeneratedAt;
              const isPaid     = r.paymentStatus === "paid" || r.paymentStatus === "waived";
              const isConfirmed = r.status === "confirmed";
              const currentMsg = localMessages[r._id] || r.customerMessage;

              return (
                <div key={r._id} onClick={() => setSelected(isSelected ? null : r)}
                  style={{
                    background: C.bgCard, borderRadius: 14,
                    border: `1.5px solid ${isSelected ? C.amber : C.border}`,
                    padding: 20, cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = C.amber + "80"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = C.border; }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      {/* Restaurant name + status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: C.text }}>
                          {r.restaurant?.name || "Restaurant"}
                        </span>
                        <Badge label={cfg.label || r.status} color={cfg.color || C.textMuted} />
                        {hasBill && isPaid && <Badge label="Paid ✓" color={C.green} />}
                        {hasBill && !isPaid && <Badge label="Bill Ready" color={C.blue} />}
                      </div>

                      {/* Meta info */}
                      <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.textMuted, flexWrap: "wrap" }}>
                        <span>📅 {new Date(r.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>🕐 {new Date(r.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>👥 {r.numberOfGuests} guest{r.numberOfGuests !== 1 ? "s" : ""}</span>
                        <span style={{ fontFamily: "monospace", color: C.amber, fontWeight: 700 }}>#{r._id.slice(-8).toUpperCase()}</span>
                      </div>

                      {/* Pre-order summary */}
                      {r.preOrderItems?.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: C.green, fontWeight: 600 }}>
                          🍽️ Pre-order: {r.preOrderItems.length} item{r.preOrderItems.length !== 1 ? "s" : ""} · ₹{r.preOrderTotal}
                        </div>
                      )}

                      {/* ── Special Request form (confirmed only) ── */}
                      {isConfirmed && (
                        <div onClick={e => e.stopPropagation()}>
                          <SpecialRequestForm
                            reservationId={r._id}
                            existingMessage={currentMsg}
                            existingMessageSentAt={r.customerMessageSentAt}
                            onSent={(msg) => {
                              setLocalMessages(p => ({ ...p, [r._id]: msg }));
                              setReservations(prev => prev.map(res =>
                                res._id === r._id ? { ...res, customerMessage: msg } : res
                              ));
                            }}
                          />
                        </div>
                      )}

                      {/* ── Bill + Pay buttons (completed with bill) ── */}
                      {hasBill && (
                        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                          <button
                            id={`view-bill-btn-${r._id}`}
                            onClick={() => openBill(r._id)}
                            disabled={billLoading === r._id}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "7px 16px", borderRadius: 20,
                              background: C.blue + "15", border: `1px solid ${C.blue}40`,
                              color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer",
                              fontFamily: "'DM Sans',sans-serif",
                            }}>
                            {billLoading === r._id ? "Loading…" : "🧾 View Bill"}
                          </button>
                          {!isPaid && (
                            <button
                              id={`pay-btn-${r._id}`}
                              onClick={() => openBill(r._id) /* opens bill + shows Pay CTA */}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "7px 16px", borderRadius: 20,
                                background: "linear-gradient(135deg, #4A9B6F, #3A8B5F)",
                                border: "none", color: "#fff",
                                fontSize: 12, fontWeight: 700, cursor: "pointer",
                                fontFamily: "'DM Sans',sans-serif",
                                boxShadow: "0 2px 8px rgba(74,155,111,0.3)",
                              }}>
                              💳 Pay Online
                            </button>
                          )}
                        </div>
                      )}

                      {/* ── Review CTA (completed only) ── */}
                      {reviewable && (
                        <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                          {alreadyDone ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "6px 14px", borderRadius: 20,
                              background: C.green + "15", border: `1px solid ${C.green}40`,
                              fontSize: 12, color: C.green, fontWeight: 700,
                            }}>✅ Review Submitted</span>
                          ) : (
                            <button
                              id={`review-btn-${r._id}`}
                              onClick={() => setReviewTarget({
                                reservation: r,
                                restaurantId: r.restaurant?._id || r.restaurant,
                                restaurantName: r.restaurant?.name || "Restaurant",
                              })}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "7px 16px", borderRadius: 20,
                                background: "linear-gradient(135deg, #D4883A, #E8A050)",
                                border: "none", color: "#fff",
                                fontSize: 12, fontWeight: 700, cursor: "pointer",
                                fontFamily: "'DM Sans',sans-serif",
                                boxShadow: "0 2px 8px rgba(212,136,58,0.3)",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
                              ⭐ Write a Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: fee + cancel */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>₹{r.reservationFee || 0}</div>
                      {canCancel(r) && (
                        <button
                          disabled={cancelling === r._id}
                          onClick={e => { e.stopPropagation(); cancelReservation(r._id); }}
                          style={{
                            padding: "5px 12px", background: C.red + "15",
                            border: `1px solid ${C.red}30`, borderRadius: 8,
                            color: C.red, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
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

          {/* ── Detail Panel ── */}
          {selected && (
            <div style={{
              width: 320, flexShrink: 0, background: C.bgCard, borderRadius: 16,
              border: `1px solid ${C.border}`, padding: 24, alignSelf: "flex-start",
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
                { label: "Booking ID",    value: `#${selected._id.slice(-8).toUpperCase()}` },
                { label: "Date",          value: new Date(selected.scheduledAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" }) },
                { label: "Time",          value: new Date(selected.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) },
                { label: "Guests",        value: selected.numberOfGuests },
                { label: "Type",          value: selected.type === "instant" ? "Instant Booking" : "Scheduled" },
                { label: "Res Fee",       value: `₹${selected.reservationFee || 0}` },
                { label: "Status",        value: <Badge label={STATUS_CONFIG[selected.status]?.label} color={STATUS_CONFIG[selected.status]?.color} /> },
                { label: "Payment",       value: <Badge label={selected.paymentStatus || "unpaid"} color={selected.paymentStatus === "paid" ? C.green : C.textMuted} /> },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{value}</span>
                </div>
              ))}

              {/* Special Requests (from booking form) */}
              {selected.specialRequests && (
                <div style={{ marginTop: 12, padding: 12, background: C.amberSoft, borderRadius: 8, fontSize: 13, color: C.textMid }}>
                  💬 {selected.specialRequests}
                </div>
              )}

              {/* Customer Message (sent post-confirmation) */}
              {(localMessages[selected._id] || selected.customerMessage) && (
                <div style={{ marginTop: 12, padding: 12, background: C.blue + "12", borderRadius: 8, fontSize: 12, color: C.blue, border: `1px solid ${C.blue}30` }}>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>📤 Your Special Request</div>
                  {localMessages[selected._id] || selected.customerMessage}
                </div>
              )}

              {/* Pre-order items */}
              {selected.preOrderItems?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>🍽️ Your Pre-Order</div>
                  {selected.preOrderItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
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
                </div>
              )}

              {/* Bill total summary (if generated) */}
              {selected.billGeneratedAt && (
                <div style={{
                  marginTop: 16, padding: "12px 14px",
                  background: "linear-gradient(135deg, #FBF0E0, #F5E8D0)",
                  borderRadius: 10, border: `1px solid ${C.amber}30`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Bill Total</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.amber }}>₹{(selected.billTotal || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>incl. ₹{(selected.billTax || 0).toFixed(2)} tax</div>
                    </div>
                    <span style={{ fontSize: 28 }}>🧾</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {canCancel(selected) && (
                  <button
                    disabled={cancelling === selected._id}
                    onClick={() => cancelReservation(selected._id)}
                    style={{
                      width: "100%", padding: "11px",
                      background: C.red + "15", border: `1.5px solid ${C.red}40`,
                      borderRadius: 10, color: C.red, fontSize: 14, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                    }}>
                    {cancelling === selected._id ? "Cancelling…" : "Cancel Reservation"}
                  </button>
                )}

                {/* View Bill in detail panel */}
                {selected.billGeneratedAt && (
                  <button
                    onClick={() => openBill(selected._id)}
                    disabled={billLoading === selected._id}
                    style={{
                      width: "100%", padding: "11px",
                      background: C.blue + "15", border: `1.5px solid ${C.blue}40`,
                      borderRadius: 10, color: C.blue, fontSize: 14, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                    }}>
                    {billLoading === selected._id ? "Loading Bill…" : "🧾 View Full Bill"}
                  </button>
                )}

                {/* Review button in detail panel */}
                {isReviewable(selected) && !reviewedIds.has(selected._id) && (
                  <button
                    onClick={() => setReviewTarget({
                      reservation: selected,
                      restaurantId: selected.restaurant?._id || selected.restaurant,
                      restaurantName: selected.restaurant?.name || "Restaurant",
                    })}
                    style={{
                      width: "100%", padding: "11px",
                      background: "linear-gradient(135deg, #D4883A, #E8A050)",
                      border: "none", borderRadius: 10, color: "#fff",
                      fontSize: 14, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      boxShadow: "0 4px 14px rgba(212,136,58,0.3)",
                    }}>
                    ⭐ Write a Review
                  </button>
                )}
              </div>

              {/* Special Request form in panel for confirmed bookings */}
              {selected.status === "confirmed" && (
                <SpecialRequestForm
                  reservationId={selected._id}
                  existingMessage={localMessages[selected._id] || selected.customerMessage}
                  existingMessageSentAt={selected.customerMessageSentAt}
                  onSent={(msg) => {
                    setLocalMessages(p => ({ ...p, [selected._id]: msg }));
                    setSelected(p => ({ ...p, customerMessage: msg }));
                    setReservations(prev => prev.map(res =>
                      res._id === selected._id ? { ...res, customerMessage: msg } : res
                    ));
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewTarget && (
        <ReviewModal
          reservation={reviewTarget.reservation}
          restaurantId={reviewTarget.restaurantId}
          restaurantName={reviewTarget.restaurantName}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => handleReviewSuccess(reviewTarget.reservation._id)}
        />
      )}

      {/* ── Bill Modal ── */}
      {billTarget && (
        <BillModal
          reservation={billTarget}
          onClose={() => setBillTarget(null)}
          onPay={billTarget.paymentStatus === "paid" ? null : handlePay}
          paying={paying}
        />
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
      if (user?.role === "owner")     navigate("/owner/dashboard");
      else if (user?.role === "admin") navigate("/admin/dashboard");
      return;
    }
    axios.get("/reservations/my?limit=1")
      .then(r => setReservationCount(r.data.total || 0))
      .catch(() => {});
  }, [isLoggedIn, loading, user, navigate]);

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: `4px solid ${C.border}`, borderTop: `4px solid ${C.amber}`,
          borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px",
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
          padding: 28, background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: C.amber + "20",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: C.amber, flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {user?.name}
            </h1>
            <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 12 }}>{user?.email}</div>

            {user?.customerId && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px",
                background: C.amber + "15", border: `1.5px solid ${C.amber}40`, borderRadius: 10, marginBottom: 12,
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
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif", boxShadow: `0 4px 16px ${C.amber}40`,
            }}>
            Book a Table →
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}`, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { id: "bookings",    label: "My Bookings",        icon: "📋" },
            { id: "preferences", label: "Dining Preferences", icon: "🍽️" },
            { id: "profile",     label: "Profile & Security", icon: "👤" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "12px 24px", background: "transparent", border: "none",
                borderBottom: `3px solid ${tab === t.id ? C.amber : "transparent"}`,
                color: tab === t.id ? C.amber : C.textMuted, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap"
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "bookings"    && <BookingsTab />}
        {tab === "preferences" && <PreferencesTab user={user} />}
        {tab === "profile"     && <ProfileTab user={user} />}
      </div>
    </div>
  );
}
