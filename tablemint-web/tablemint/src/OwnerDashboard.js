import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import axios from "axios";

const C = {
  bg: "#FDFAF6", bgSoft: "#F5F0E8", bgCard: "#FFFFFF",
  border: "#E8E0D0", amber: "#D4883A", amberSoft: "#FBF0E0",
  text: "#2C2416", textMid: "#6B5B45", textMuted: "#A0907A",
  green: "#4A9B6F", red: "#D05A4A",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');`;

// ─── Reusable components ──────────────────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: color + "20", color, border: `1px solid ${color}40`, textTransform: "uppercase", letterSpacing: 0.5
    }}>
      {label}
    </span>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, required, half }) {
  return (
    <div style={{ marginBottom: 16, ...(half ? { flex: "0 0 calc(50% - 8px)" } : {}) }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
          fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
        }}
        onFocus={e => e.target.style.borderColor = C.amber}
        onBlur={e => e.target.style.borderColor = C.border} />
    </div>
  );
}

function SideNav({ active, setActive, restaurantCount, onLogout }) {
  const items = [
    { id: "overview", icon: "🏠", label: "Overview" },
    { id: "restaurants", icon: "🏢", label: "My Restaurants", badge: restaurantCount },
    { id: "revenue", icon: "💰", label: "Revenue" },
    { id: "add", icon: "➕", label: "Add Restaurant" },
  ];
  return (
    <div style={{ width: 220, background: C.text, minHeight: "100vh", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "28px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🍽️</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#fff" }}>
            Table<span style={{ color: C.amber }}>Mint</span>
          </span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Owner Portal
        </div>
      </div>
      <div style={{ flex: 1, padding: "16px 12px" }}>
        {items.map(item => (
          <div key={item.id} onClick={() => setActive(item.id)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 12px", borderRadius: 10, marginBottom: 4, cursor: "pointer",
              background: active === item.id ? C.amber + "25" : "transparent",
              transition: "all 0.15s"
            }}
            onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: active === item.id ? C.amber : "rgba(255,255,255,0.75)" }}>{item.label}</span>
            </div>
            {item.badge > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: C.amber, color: "#fff", borderRadius: 20, padding: "2px 7px" }}>{item.badge}</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <span style={{ fontSize: 16 }}>🚪</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Sign Out</span>
        </div>
      </div>
    </div>
  );
}

// ─── Add Restaurant Form ──────────────────────────────────────────────────────

function AddRestaurantForm({ onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Created restaurant ID (set after step 3 submit, used for photo upload in step 4)
  const [createdRestaurant, setCreatedRestaurant] = useState(null);
  // Photo state
  const [coverPhoto, setCoverPhoto] = useState(null);   // File
  const [coverPreview, setCoverPreview] = useState("");  // object URL
  const [galleryPhotos, setGalleryPhotos] = useState([]); // File[]
  const [galleryPreviews, setGalleryPreviews] = useState([]); // object URL[]
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", phone: "", email: "", website: "",
    priceRange: "moderate", reservationFee: 300, instantBookingEnabled: true,
    cuisine: [], address: { street: "", area: "", city: "Pune", state: "Maharashtra", pincode: "", country: "India" },
    operatingHours: [], adminEmails: ["", "", ""],
  });
  // Geolocation state
  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Auto-fetch location on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(6));
        setGeoLng(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false); // silently fail — user can enter manually
      },
      { timeout: 8000 }
    );
  }, []);

  const f = (key) => (val) => setForm(p => ({ ...p, [key]: val }));
  const addr = (key) => (val) => setForm(p => ({ ...p, address: { ...p.address, [key]: val } }));

  const cuisineOptions = ["North Indian", "South Indian", "Chinese", "Italian", "Continental", "Thai", "Japanese", "Mexican", "Mediterranean", "Fast Food", "Cafe", "Bakery", "Seafood", "Mughlai"];
  const toggleCuisine = (c) => setForm(p => ({
    ...p, cuisine: p.cuisine.includes(c) ? p.cuisine.filter(x => x !== c) : [...p.cuisine, c]
  }));

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const toggleDay = (day) => {
    const exists = form.operatingHours.find(h => h.day === day);
    if (exists) {
      setForm(p => ({ ...p, operatingHours: p.operatingHours.filter(h => h.day !== day) }));
    } else {
      setForm(p => ({ ...p, operatingHours: [...p.operatingHours, { day, open: "10:00", close: "23:00", isClosed: false }] }));
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true); setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(6));
        setGeoLng(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      () => {
        setGeoError("Location access denied. Please enter coordinates manually.");
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  };

  // Step 3 submit: create restaurant then advance to step 4
  const handleCreateRestaurant = async () => {
    setLoading(true); setError("");
    try {
      const payload = { ...form };
      delete payload.adminEmails;
      // Attach GeoJSON location if coordinates provided
      if (geoLat && geoLng) {
        payload.location = {
          type: "Point",
          coordinates: [parseFloat(geoLng), parseFloat(geoLat)], // GeoJSON is [lng, lat]
        };
      }
      const res = await axios.post("/restaurants", payload);
      const restaurant = res.data.data.restaurant;
      setCreatedRestaurant(restaurant);

      // Add admin emails (up to 3, skip empty ones)
      const validEmails = form.adminEmails.filter(e => e.trim());
      for (const email of validEmails) {
        try {
          await axios.post(`/restaurants/${restaurant._id}/create-admin`, {
            name: email.split("@")[0], email
          });
        } catch (e) { /* skip if email already exists */ }
      }

      // Advance to photo step
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create restaurant.");
    } finally { setLoading(false); }
  };

  // Step 4 submit: upload photos then finish
  const handlePhotoUpload = async (skip = false) => {
    if (skip || !coverPhoto) {
      onSuccess(createdRestaurant);
      return;
    }
    setPhotoUploading(true); setPhotoError("");
    try {
      const formData = new FormData();
      formData.append("photos", coverPhoto); // cover first
      galleryPhotos.forEach(f => formData.append("photos", f));
      await axios.post(
        `/restaurants/${createdRestaurant._id}/photos?setCover=true`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      onSuccess(createdRestaurant);
    } catch (err) {
      setPhotoError(err.response?.data?.message || "Photo upload failed. You can upload photos later from your restaurant settings.");
    } finally { setPhotoUploading(false); }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverPhoto(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setGalleryPhotos(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setGalleryPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeGalleryPhoto = (idx) => {
    URL.revokeObjectURL(galleryPreviews[idx]);
    setGalleryPhotos(prev => prev.filter((_, i) => i !== idx));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const stepTitles = ["Basic Info", "Cuisine & Hours", "Admin Access", "Photos"];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: C.text, marginBottom: 8 }}>Add New Restaurant</h1>
        <p style={{ color: C.textMuted, fontSize: 14 }}>Fill in your restaurant details. Our team will verify and activate it.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: 36 }}>
        {stepTitles.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
              background: step === i + 1 ? C.amber : step > i + 1 ? C.green : C.bgSoft,
              borderRadius: 10, cursor: step > i + 1 ? "pointer" : "default"
            }}
              onClick={() => step > i + 1 && setStep(i + 1)}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: step === i + 1 ? "#fff" : step > i + 1 ? "#fff" : C.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                color: step === i + 1 ? C.amber : step > i + 1 ? C.green : C.textMuted
              }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: step === i + 1 || step > i + 1 ? "#fff" : C.textMuted }}>{t}</span>
            </div>
            {i < stepTitles.length - 1 && <div style={{ width: 24, height: 2, background: step > i + 1 ? C.green : C.border }} />}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: "#FFF5F5", border: `1px solid ${C.red}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, padding: 32 }}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, marginBottom: 24 }}>Restaurant Details</h3>
            <Input label="Restaurant Name" value={form.name} onChange={f("name")} placeholder="e.g. Spice Garden" required />
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Description</label>
              <textarea value={form.description} onChange={e => f("description")(e.target.value)} placeholder="Tell customers about your restaurant..."
                rows={3} style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                  fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical"
                }}
                onFocus={e => e.target.style.borderColor = C.amber} onBlur={e => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Phone</label>
                  <input type="text" value={form.phone} onChange={e => f("phone")(e.target.value)} placeholder="+91 98765 43210"
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = C.border} />
                </div>
              </div>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Email <span style={{ color: C.red }}>*</span></label>
                  <input type="email" value={form.email} onChange={e => f("email")(e.target.value)} placeholder="restaurant@example.com"
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10,
                      border: `1.5px solid ${showValidation && !form.email.trim() ? C.red : form.email.trim() ? C.green : C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = form.email.trim() ? C.green : (showValidation ? C.red : C.border)} />
                  {showValidation && !form.email.trim() && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Email is required</p>}
                </div>
              </div>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Street Address <span style={{ color: C.red }}>*</span></label>
                  <input type="text" value={form.address.street} onChange={e => addr("street")(e.target.value)} placeholder="123 MG Road"
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10,
                      border: `1.5px solid ${showValidation && !form.address.street.trim() ? C.red : form.address.street.trim() ? C.green : C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = form.address.street.trim() ? C.green : (showValidation ? C.red : C.border)} />
                  {showValidation && !form.address.street.trim() && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Street address is required</p>}
                </div>
              </div>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Area / Locality <span style={{ color: C.red }}>*</span></label>
                  <input type="text" value={form.address.area} onChange={e => addr("area")(e.target.value)} placeholder="Koregaon Park"
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10,
                      border: `1.5px solid ${showValidation && !form.address.area.trim() ? C.red : form.address.area.trim() ? C.green : C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = form.address.area.trim() ? C.green : (showValidation ? C.red : C.border)} />
                  {showValidation && !form.address.area.trim() && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Area / locality is required</p>}
                </div>
              </div>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>City <span style={{ color: C.red }}>*</span></label>
                  <input type="text" value={form.address.city} onChange={e => addr("city")(e.target.value)} placeholder="Pune"
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10,
                      border: `1.5px solid ${showValidation && !form.address.city.trim() ? C.red : form.address.city.trim() ? C.green : C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = form.address.city.trim() ? C.green : (showValidation ? C.red : C.border)} />
                  {showValidation && !form.address.city.trim() && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>City is required</p>}
                </div>
              </div>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Pincode <span style={{ color: C.red }}>*</span></label>
                  <input type="text" value={form.address.pincode} onChange={e => addr("pincode")(e.target.value)} placeholder="411001"
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 10,
                      border: `1.5px solid ${showValidation && !form.address.pincode.trim() ? C.red : form.address.pincode.trim() ? C.green : C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = form.address.pincode.trim() ? C.green : (showValidation ? C.red : C.border)} />
                  {showValidation && !form.address.pincode.trim() && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Pincode is required</p>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Price Range <span style={{ color: C.red }}>*</span></label>
                <select value={form.priceRange} onChange={e => f("priceRange")(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    border: `1.5px solid ${form.priceRange ? C.green : C.border}`,
                    fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none"
                  }}>
                  <option value="">-- Select Price Range --</option>
                  <option value="budget">Budget (₹)</option>
                  <option value="moderate">Moderate (₹₹)</option>
                  <option value="expensive">Expensive (₹₹₹)</option>
                  <option value="luxury">Luxury (₹₹₹₹)</option>
                </select>
                {showValidation && !form.priceRange && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Price range is required</p>}
              </div>
              <div style={{ flex: "0 0 calc(50% - 8px)" }}>
                <Input label="Reservation Fee (₹)" type="number" value={form.reservationFee} onChange={val => f("reservationFee")(Number(val))} placeholder="300" />
              </div>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="instant" checked={form.instantBookingEnabled}
                onChange={e => f("instantBookingEnabled")(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.amber }} />
              <label htmlFor="instant" style={{ fontSize: 14, fontWeight: 600, color: C.text, cursor: "pointer" }}>
                Enable Instant Booking (customers can book 10-60 min in advance)
              </label>
            </div>

            {/* ── Location Section ── */}
            <div style={{ marginTop: 24, padding: 20, background: C.amberSoft, borderRadius: 14, border: `2px solid ${C.amber}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    📍 Restaurant Location <span style={{ color: C.red }}>*</span>
                  </label>
                  <p style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Used to show distance to customers and for nearby search</p>
                </div>
                <button type="button" onClick={handleUseMyLocation} disabled={geoLoading}
                  style={{
                    padding: "9px 16px", background: geoLoading ? C.border : C.amber, border: "none",
                    borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: geoLoading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif",
                    display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0
                  }}>
                  {geoLoading
                    ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Detecting…</>
                    : <>📡 Use My Location</>}
                </button>
              </div>
              {geoError && <div style={{ fontSize: 12, color: C.red, marginBottom: 10, padding: "8px 12px", background: "#FFF5F5", borderRadius: 8 }}>⚠️ {geoError}</div>}
              {geoLat && geoLng && (
                <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 10, padding: "8px 12px", background: C.green + "15", borderRadius: 8 }}>
                  ✅ Location captured: {geoLat}°N, {geoLng}°E
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Latitude</label>
                  <input type="number" step="any" value={geoLat}
                    onChange={e => { setGeoLat(e.target.value); setGeoError(""); }}
                    placeholder="e.g. 18.5204"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      border: `1.5px solid ${geoLat ? C.green : C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = geoLat ? C.green : C.border} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Longitude</label>
                  <input type="number" step="any" value={geoLng}
                    onChange={e => { setGeoLng(e.target.value); setGeoError(""); }}
                    placeholder="e.g. 73.8567"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      border: `1.5px solid ${geoLng ? C.green : C.border}`,
                      fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none"
                    }}
                    onFocus={e => e.target.style.borderColor = C.amber}
                    onBlur={e => e.target.style.borderColor = geoLng ? C.green : C.border} />
                </div>
              </div>
              {(!geoLat || !geoLng) && (
                <p style={{ fontSize: 11, color: C.amber, marginTop: 10, fontWeight: 600 }}>
                  ⚠️ Location is required. Click "Use My Location" or enter coordinates manually.
                </p>
              )}

              {/* ── Preview + Confirmation ── */}
              {geoLat && geoLng && (
                <div style={{ marginTop: 14 }}>
                  {/* Preview Button */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${geoLat},${geoLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 18px", borderRadius: 10,
                      background: "#1a73e8", border: "none",
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      textDecoration: "none", cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(26,115,232,0.3)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#1558b0"}
                    onMouseLeave={e => e.currentTarget.style.background = "#1a73e8"}
                  >
                    🗺️ Preview Location on Google Maps
                  </a>

                  {/* Confirmation + tip message */}
                  <div style={{
                    marginTop: 12, padding: "12px 14px", borderRadius: 10,
                    background: "rgba(26,115,232,0.08)", border: "1.5px solid rgba(26,115,232,0.2)",
                    fontSize: 12, color: "#1a5fa8", lineHeight: 1.65,
                  }}>
                    <strong>✅ Is this your correct restaurant location?</strong><br />
                    Click the button above to verify on Google Maps.<br />
                    <span style={{ color: C.textMid }}>
                      💡 <strong>Tip:</strong> You can also search by <em>address query</em> on Google Maps
                      (e.g. <em>"Spice Garden, Koregaon Park, Pune"</em>), then copy the coordinates
                      from the URL bar — use whichever method is easiest!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Cuisine & Hours */}
        {step === 2 && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, marginBottom: 8 }}>Cuisine Types</h3>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Select all that apply</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {cuisineOptions.map(c => (
                <div key={c} onClick={() => toggleCuisine(c)}
                  style={{
                    padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: form.cuisine.includes(c) ? C.amber : C.bgSoft,
                    color: form.cuisine.includes(c) ? "#fff" : C.textMid,
                    border: `1.5px solid ${form.cuisine.includes(c) ? C.amber : C.border}`,
                    transition: "all 0.15s"
                  }}>
                  {c}
                </div>
              ))}
            </div>

            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, marginBottom: 8 }}>Operating Hours</h3>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Click a day to toggle it on/off</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {days.map(day => {
                const h = form.operatingHours.find(x => x.day === day);
                return (
                  <div key={day} style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "12px 16px",
                    background: h ? C.amber + "08" : C.bgSoft, borderRadius: 10,
                    border: `1.5px solid ${h ? C.amber + "40" : C.border}`
                  }}>
                    <div onClick={() => toggleDay(day)}
                      style={{
                        width: 20, height: 20, borderRadius: 4, border: `2px solid ${h ? C.amber : C.border}`,
                        background: h ? C.amber : "transparent", cursor: "pointer", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700
                      }}>
                      {h && "✓"}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: h ? C.text : C.textMuted, width: 100, textTransform: "capitalize" }}>{day}</span>
                    {h && (
                      <>
                        <input type="time" value={h.open}
                          onChange={e => setForm(p => ({ ...p, operatingHours: p.operatingHours.map(x => x.day === day ? { ...x, open: e.target.value } : x) }))}
                          style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }} />
                        <span style={{ color: C.textMuted, fontSize: 13 }}>to</span>
                        <input type="time" value={h.close}
                          onChange={e => setForm(p => ({ ...p, operatingHours: p.operatingHours.map(x => x.day === day ? { ...x, close: e.target.value } : x) }))}
                          style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Admin Access */}
        {step === 3 && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, marginBottom: 8 }}>Admin Access</h3>
            <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
              Add up to <strong>3 admin email addresses</strong>. Each admin will receive login credentials via email and can manage this restaurant's reservations, orders, and operations.
            </p>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Admin {i + 1} Email {i === 0 && <span style={{ color: C.red }}>*</span>}
                </label>
                <input type="email" value={form.adminEmails[i]}
                  onChange={e => setForm(p => { const a = [...p.adminEmails]; a[i] = e.target.value; return { ...p, adminEmails: a }; })}
                  placeholder={i === 0 ? "admin@yourrestaurant.com" : `admin${i + 1}@yourrestaurant.com (optional)`}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`,
                    fontSize: 14, color: C.text, fontFamily: "'DM Sans',sans-serif", outline: "none"
                  }}
                  onFocus={e => e.target.style.borderColor = C.amber}
                  onBlur={e => e.target.style.borderColor = C.border} />
              </div>
            ))}
            <div style={{ marginTop: 24, padding: 16, background: C.amberSoft, borderRadius: 12, border: `1px solid ${C.amber}30` }}>
              <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>
                📧 Each admin will receive an email with their login credentials.<br />
                ⏳ Your restaurant will be <strong>pending verification</strong> until our team visits and activates it.<br />
                🔑 Share the OTP with our team during the verification visit.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Photos */}
        {step === 4 && (
          <div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, marginBottom: 8 }}>📸 Restaurant Photos</h3>
            <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
              Add a <strong>cover photo</strong> (required) and up to 9 additional <strong>gallery photos</strong>. Great photos attract more customers!
            </p>

            {photoError && (
              <div style={{ background: "#FFF5F5", border: `1px solid ${C.red}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: C.red }}>
                ⚠️ {photoError}
              </div>
            )}

            {/* Cover Photo */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Cover Photo <span style={{ color: C.red }}>*</span>
                <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8, fontWeight: 500, textTransform: "none" }}>— shown on Explore page</span>
              </label>
              {coverPreview ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={coverPreview} alt="Cover preview"
                    style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 14, border: `2px solid ${C.amber}` }} />
                  <button
                    onClick={() => { URL.revokeObjectURL(coverPreview); setCoverPhoto(null); setCoverPreview(""); }}
                    style={{
                      position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 16,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>×
                  </button>
                  <div style={{
                    position: "absolute", bottom: 10, left: 10, background: C.green,
                    color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8
                  }}>
                    ✓ Cover Photo
                  </div>
                </div>
              ) : (
                <label style={{
                  display: "block", border: `2px dashed ${C.amber}60`, borderRadius: 14,
                  padding: "32px 24px", textAlign: "center", cursor: "pointer",
                  background: C.amberSoft, transition: "all 0.2s"
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.amber}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.amber + "60"}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Click to upload cover photo</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>JPG, PNG or WEBP · Max 10 MB</div>
                  <input type="file" accept="image/*" onChange={handleCoverChange}
                    style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* Gallery Photos */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Gallery Photos
                <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8, fontWeight: 500, textTransform: "none" }}>— optional, up to 9 additional photos</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
                {galleryPreviews.map((url, idx) => (
                  <div key={idx} style={{
                    position: "relative", height: 120, borderRadius: 10, overflow: "hidden",
                    border: `1.5px solid ${C.border}`
                  }}>
                    <img src={url} alt={`Gallery ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => removeGalleryPhoto(idx)}
                      style={{
                        position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(0,0,0,0.6)", border: "none", color: "#fff",
                        fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                      }}>×
                    </button>
                  </div>
                ))}
                {galleryPhotos.length < 9 && (
                  <label style={{
                    height: 120, border: `2px dashed ${C.border}`, borderRadius: 10,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", background: C.bgSoft, transition: "all 0.2s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.amber}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <div style={{ fontSize: 28, marginBottom: 4, color: C.textMuted }}>+</div>
                    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Add Photo</div>
                    <input type="file" accept="image/*" multiple onChange={handleGalleryChange}
                      style={{ display: "none" }} />
                  </label>
                )}
              </div>
              <p style={{ fontSize: 12, color: C.textMuted }}>
                {galleryPhotos.length}/9 gallery photos added
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          {step < 4 ? (
            <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
              style={{
                padding: "11px 24px", background: "transparent", border: `1.5px solid ${C.border}`,
                borderRadius: 10, color: C.textMid, fontSize: 14, fontWeight: 600,
                cursor: step === 1 ? "not-allowed" : "pointer", opacity: step === 1 ? 0.4 : 1, fontFamily: "'DM Sans',sans-serif"
              }}>
              ← Back
            </button>
          ) : (
            <button onClick={() => handlePhotoUpload(true)}
              style={{
                padding: "11px 24px", background: "transparent", border: `1.5px solid ${C.border}`,
                borderRadius: 10, color: C.textMid, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
              }}>
              Skip Photos →
            </button>
          )}

          {step < 3 ? (
            <button onClick={() => {
              if (step === 1) {
                // Validate all required step-1 fields before advancing
                const hasRequiredFields =
                  form.name.trim() &&
                  form.email.trim() &&
                  form.address.street.trim() &&
                  form.address.area.trim() &&
                  form.address.city.trim() &&
                  form.address.pincode.trim() &&
                  form.priceRange &&
                  geoLat && geoLng;
                if (!hasRequiredFields) {
                  setShowValidation(true);
                  if (!geoLat || !geoLng) setGeoError("Location is required. Click \"Use My Location\" or enter coordinates manually.");
                  return;
                }
                setShowValidation(false);
              }
              setStep(s => s + 1);
            }}
              style={{
                padding: "11px 28px", background: C.amber, border: "none", borderRadius: 10,
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif"
              }}>
              Next →
            </button>
          ) : step === 3 ? (
            <button onClick={handleCreateRestaurant} disabled={loading || !form.adminEmails[0]}
              style={{
                padding: "11px 28px", background: loading ? C.border : C.green, border: "none", borderRadius: 10,
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif"
              }}>
              {loading ? "Creating…" : "Create Restaurant →"}
            </button>
          ) : (
            <button onClick={() => handlePhotoUpload(false)}
              disabled={photoUploading || !coverPhoto}
              style={{
                padding: "11px 28px",
                background: photoUploading ? C.border : !coverPhoto ? C.border : C.amber,
                border: "none", borderRadius: 10,
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: photoUploading || !coverPhoto ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans',sans-serif",
                display: "flex", alignItems: "center", gap: 8
              }}>
              {photoUploading ? (
                <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Uploading…</>
              ) : "📤 Upload & Finish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Info Tab (Editable) ──────────────────────────────────────────────────────
function InfoTab({ restaurant }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    phone: restaurant.phone || "",
    email: restaurant.email || "",
    website: restaurant.website || "",
    description: restaurant.description || "",
    priceRange: restaurant.priceRange || "moderate",
    reservationFee: restaurant.reservationFee ?? 300,
    instantBookingEnabled: restaurant.instantBookingEnabled ?? true,
    address: {
      street: restaurant.address?.street || "",
      area: restaurant.address?.area || "",
      city: restaurant.address?.city || "Pune",
      pincode: restaurant.address?.pincode || "",
    },
  });

  const f = (key) => (val) => setForm(p => ({ ...p, [key]: val }));
  const addr = (key) => (val) => setForm(p => ({ ...p, address: { ...p.address, [key]: val } }));

  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
    fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff",
  };

  const handleSave = async () => {
    setLoading(true); setMsg(""); setError("");
    try {
      await axios.patch(`/restaurants/${restaurant._id}`, form);
      setMsg("Restaurant info updated successfully!");
      setEditing(false);
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text }}>Restaurant Info</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            style={{
              padding: "8px 18px", background: C.amberSoft, border: `1px solid ${C.amber}40`,
              borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.amber, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
            }}>
            ✏️ Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={loading}
              style={{
                padding: "8px 18px", background: C.green, border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
              }}>
              {loading ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => { setEditing(false); setError(""); }}
              style={{
                padding: "8px 18px", background: "transparent", border: `1.5px solid ${C.border}`,
                borderRadius: 8, fontSize: 13, color: C.textMid, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
              }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {msg && <div style={{ padding: "10px 14px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>✅ {msg}</div>}
      {error && <div style={{ padding: "10px 14px", background: C.red + "15", borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {error}</div>}

      {editing ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Phone */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Phone</label>
            <input value={form.phone} onChange={e => f("phone")(e.target.value)} placeholder="+91 98765 43210" style={inp} />
          </div>
          {/* Email */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</label>
            <input type="email" value={form.email} onChange={e => f("email")(e.target.value)} placeholder="restaurant@example.com" style={inp} />
          </div>
          {/* Street */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Street</label>
            <input value={form.address.street} onChange={e => addr("street")(e.target.value)} placeholder="123 MG Road" style={inp} />
          </div>
          {/* Area */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Area</label>
            <input value={form.address.area} onChange={e => addr("area")(e.target.value)} placeholder="Koregaon Park" style={inp} />
          </div>
          {/* City */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>City</label>
            <input value={form.address.city} onChange={e => addr("city")(e.target.value)} placeholder="Pune" style={inp} />
          </div>
          {/* Pincode */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Pincode</label>
            <input value={form.address.pincode} onChange={e => addr("pincode")(e.target.value)} placeholder="411001" style={inp} />
          </div>
          {/* Price Range */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Price Range</label>
            <select value={form.priceRange} onChange={e => f("priceRange")(e.target.value)}
              style={{ ...inp }}>
              <option value="budget">Budget (₹)</option>
              <option value="moderate">Moderate (₹₹)</option>
              <option value="expensive">Expensive (₹₹₹)</option>
              <option value="luxury">Luxury (₹₹₹₹)</option>
            </select>
          </div>
          {/* Reservation Fee */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Reservation Fee (₹)</label>
            <input type="number" value={form.reservationFee} onChange={e => f("reservationFee")(Number(e.target.value))} style={inp} />
          </div>
          {/* Description — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Description</label>
            <textarea value={form.description} onChange={e => f("description")(e.target.value)}
              rows={3} placeholder="Tell customers about your restaurant…"
              style={{ ...inp, resize: "vertical" }} />
          </div>
          {/* Instant Booking toggle — full width */}
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="instant" checked={form.instantBookingEnabled}
              onChange={e => f("instantBookingEnabled")(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: C.amber }} />
            <label htmlFor="instant" style={{ fontSize: 14, fontWeight: 600, color: C.text, cursor: "pointer" }}>
              Enable Instant Booking
            </label>
          </div>
        </div>
      ) : (
        /* View mode */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Phone", value: form.phone || "—" },
            { label: "Email", value: form.email || "—" },
            { label: "Address", value: [form.address.street, form.address.area, form.address.city].filter(Boolean).join(", ") || "—" },
            { label: "Pincode", value: form.address.pincode || "—" },
            { label: "Price Range", value: { budget: "Budget (₹)", moderate: "Moderate (₹₹)", expensive: "Expensive (₹₹₹)", luxury: "Luxury (₹₹₹₹)" }[form.priceRange] || form.priceRange },
            { label: "Reservation Fee", value: `₹${form.reservationFee ?? 0}` },
            { label: "Instant Booking", value: form.instantBookingEnabled ? "✅ Enabled" : "❌ Disabled" },
            { label: "Avg Rating", value: restaurant.avgRating ? `${restaurant.avgRating}★` : "No ratings yet" },
            { label: "Total Reviews", value: restaurant.totalReviews || 0 },
            { label: "Description", value: form.description || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: 14, background: C.bgSoft, borderRadius: 10,
              gridColumn: label === "Description" ? "1 / -1" : "auto"
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{value}</div>
            </div>
          ))}

          {/* Google Maps location link — full width */}
          {(() => {
            const lat = restaurant.location?.coordinates?.[1];
            const lng = restaurant.location?.coordinates?.[0];
            return lat && lng ? (
              <div style={{
                gridColumn: "1 / -1", padding: 14, background: "#EAF4FF",
                borderRadius: 10, border: "1.5px solid #1a73e820",
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1a73e8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                    📍 Restaurant Location
                  </div>
                  <div style={{ fontSize: 13, color: "#1a5fa8", fontWeight: 600 }}>
                    {lat.toFixed(6)}°N, {lng.toFixed(6)}°E
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 8, background: "#1a73e8",
                    color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1558b0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1a73e8"}
                >
                  🗺️ View on Google Maps
                </a>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Tables Section ───────────────────────────────────────────────────────────
function TablesSection({ restaurant }) {
  const [tables, setTables] = useState(restaurant.tables || []);
  const [form, setForm] = useState({ tableNumber: "", capacity: "", location: "indoor" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const addTable = async () => {
    if (!form.tableNumber || !form.capacity) return;
    setLoading(true);
    try {
      const res = await axios.post(`/restaurants/${restaurant._id}/tables`, {
        tableNumber: form.tableNumber,
        capacity: Number(form.capacity),
        location: form.location,
      });
      setTables(t => [...t, res.data.data.table]);
      setForm({ tableNumber: "", capacity: "", location: "indoor" });
      setMsg("Table added!");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) { setMsg("Failed to add table."); }
    finally { setLoading(false); }
  };

  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div>
      {msg && <div style={{ padding: "10px 16px", background: C.green + "15", border: `1px solid ${C.green}30`, borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>{msg}</div>}

      {/* Add table form */}
      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Add Table</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input placeholder="Table No. (e.g. T1)" value={form.tableNumber}
            onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))}
            style={{
              flex: "1 1 120px", padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none"
            }} />
          <input placeholder="Seats (capacity)" type="number" min="1" value={form.capacity}
            onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
            style={{
              flex: "1 1 120px", padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none"
            }} />
          <select value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            style={{
              flex: "1 1 140px", padding: "10px 14px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none"
            }}>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="rooftop">Rooftop</option>
            <option value="private">Private</option>
          </select>
          <button onClick={addTable} disabled={loading || !form.tableNumber || !form.capacity}
            style={{
              padding: "10px 20px", background: C.amber, border: "none", borderRadius: 10,
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
            }}>
            + Add Table
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Total Tables", value: tables.length },
          { label: "Total Seats", value: totalSeats },
        ].map(s => (
          <div key={s.label} style={{
            background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`,
            padding: "16px 24px", display: "flex", alignItems: "center", gap: 16
          }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: C.amber }}>{s.value}</div>
            <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tables list */}
      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {tables.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 14 }}>
            No tables added yet. Add your first table above!
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bgSoft }}>
                {["Table No.", "Seats", "Location", "Status"].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: 11,
                    fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tables.map((t, i) => (
                <tr key={t._id || i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 700, color: C.text }}>
                    🪑 {t.tableNumber}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 14, color: C.text }}>{t.capacity} seats</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: C.amber + "15", color: C.amber, textTransform: "capitalize"
                    }}>
                      {t.location}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: t.isAvailable ? C.green + "15" : C.red + "15",
                      color: t.isAvailable ? C.green : C.red
                    }}>
                      {t.isAvailable ? "Available" : "Occupied"}
                    </span>
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

// ─── Restaurant Detail View ───────────────────────────────────────────────────

// ── OTP Banner for pending verification ──────────────────────────────────────
function OtpBanner({ restaurantId }) {
  const [otp, setOtp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get(`/restaurants/${restaurantId}/my-otp`)
      .then(r => setOtp(r.data.data.otp))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const handleCopy = () => {
    if (otp) {
      navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ background: C.amberSoft, border: `2px solid ${C.amber}`, borderRadius: 16, padding: "16px 20px", maxWidth: 320 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        ⏳ Pending Verification
      </p>
      <p style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5, marginBottom: 10 }}>
        Share this OTP with our team when they visit your restaurant to go live.
      </p>
      {loading ? (
        <div style={{ fontSize: 12, color: C.textMuted }}>Loading OTP…</div>
      ) : otp ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "#fff", border: `1px solid ${C.amber}`, borderRadius: 10,
            padding: "10px 20px", fontFamily: "monospace", fontSize: 26, fontWeight: 700,
            color: C.amber, letterSpacing: 6
          }}>
            {otp}
          </div>
          <button onClick={handleCopy}
            style={{
              padding: "8px 14px", background: copied ? C.green : C.amber, border: "none",
              borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif"
            }}>
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.textMuted }}>OTP not available.</div>
      )}
    </div>
  );
}

function RestaurantDetail({ restaurant, onBack }) {
  const [tab, setTab] = useState("info");
  const [menuItem, setMenuItem] = useState({ name: "", price: "", category: "main", isVeg: false, description: "" });
  const [menu, setMenu] = useState(restaurant.menu || []);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const addMenuItem = async () => {
    if (!menuItem.name || !menuItem.price) return;
    setLoading(true);
    try {
      const res = await axios.post(`/restaurants/${restaurant._id}/menu`, { ...menuItem, price: Number(menuItem.price) });
      setMenu(m => [...m, res.data.data.menuItem]);
      setMenuItem({ name: "", price: "", category: "main", isVeg: false, description: "" });
      setMsg("Menu item added!");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) { setMsg("Failed to add item."); }
    finally { setLoading(false); }
  };

  const removeMenuItem = async (itemId) => {
    try {
      await axios.delete(`/restaurants/${restaurant._id}/menu/${itemId}`);
      setMenu(m => m.filter(x => x._id !== itemId));
    } catch (e) { }
  };

  const statusColor = restaurant.verificationStatus === "verified" ? C.green : restaurant.verificationStatus === "rejected" ? C.red : C.amber;
  const statusLabel = restaurant.verificationStatus === "verified" ? "Verified ✓" : restaurant.verificationStatus === "rejected" ? "Rejected" : "Pending Verification";

  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.amber, fontSize: 14, fontWeight: 700, marginBottom: 20, padding: 0 }}>
        ← Back to Restaurants
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 8 }}>{restaurant.name}</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge label={statusLabel} color={statusColor} />
            <Badge label={restaurant.priceRange} color={C.textMid} />
          </div>
        </div>
        {restaurant.verificationStatus === "pending" && (
          <OtpBanner restaurantId={restaurant._id} />
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {[{ id: "info", label: "Info" }, { id: "menu", label: `Menu (${menu.length})` }, { id: "tables", label: `Tables` }, { id: "admins", label: "Admins" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "10px 20px", background: "transparent", border: "none",
              borderBottom: `3px solid ${tab === t.id ? C.amber : "transparent"}`,
              color: tab === t.id ? C.amber : C.textMuted, fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif", transition: "all 0.15s"
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <InfoTab restaurant={restaurant} />
      )}

      {tab === "menu" && (
        <div>
          {msg && <div style={{ padding: "10px 16px", background: C.green + "15", border: `1px solid ${C.green}30`, borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 16 }}>{msg}</div>}

          {/* Add item form */}
          <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Add Menu Item</h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input placeholder="Item name *" value={menuItem.name} onChange={e => setMenuItem(p => ({ ...p, name: e.target.value }))}
                style={{ flex: "2 1 200px", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
              <input placeholder="Price (₹) *" type="number" value={menuItem.price} onChange={e => setMenuItem(p => ({ ...p, price: e.target.value }))}
                style={{ flex: "1 1 100px", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
              <select value={menuItem.category} onChange={e => setMenuItem(p => ({ ...p, category: e.target.value }))}
                style={{ flex: "1 1 120px", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }}>
                <option value="starter">Starter</option>
                <option value="main">Main Course</option>
                <option value="dessert">Dessert</option>
                <option value="beverage">Beverage</option>
                <option value="special">Special</option>
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={!menuItem.isVeg} onChange={e => setMenuItem(p => ({ ...p, isVeg: !e.target.checked }))} style={{ width: 16, height: 16, accentColor: C.red }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.red }}>Non-Veg</span>
              </div>
              <button onClick={addMenuItem} disabled={loading || !menuItem.name || !menuItem.price}
                style={{ padding: "10px 20px", background: C.amber, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                + Add
              </button>
            </div>
          </div>

          {/* Menu list */}
          <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {menu.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 14 }}>No menu items yet. Add your first item above!</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.bgSoft }}>
                    {["Item", "Category", "Price", "Type", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {menu.map(item => (
                    <tr key={item._id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: C.text }}>{item.name}</td>
                      <td style={{ padding: "14px 16px" }}><Badge label={item.category} color={C.textMid} /></td>
                      <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 700, color: C.amber }}>₹{item.price}</td>
                      <td style={{ padding: "14px 16px" }}><Badge label={item.isVeg ? "Veg" : "Non-Veg"} color={item.isVeg ? C.green : C.red} /></td>
                      <td style={{ padding: "14px 16px" }}>
                        <button onClick={() => removeMenuItem(item._id)}
                          style={{ padding: "5px 12px", background: C.red + "15", border: `1px solid ${C.red}30`, borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "tables" && (
        <TablesSection restaurant={restaurant} />
      )}

      {tab === "admins" && (
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>Admin Accounts</h3>
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
            Admins can manage reservations, orders, and daily operations for this restaurant. You can have up to 3 admins.
          </p>
          <AddAdminSection restaurantId={restaurant._id} />
        </div>
      )}
    </div>
  );
}

function AddAdminSection({ restaurantId }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [admins, setAdmins] = useState([]);

  const refreshAdmins = () =>
    axios.get(`/restaurants/${restaurantId}/admins`)
      .then(r => setAdmins(r.data.data.admins || []))
      .catch(() => { });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshAdmins(); }, [restaurantId]);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { setError("All 3 fields are required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (admins.length >= 3) { setError("Maximum 3 admins allowed."); return; }
    setLoading(true); setError(""); setMsg("");
    try {
      await axios.post(`/restaurants/${restaurantId}/create-admin`, form);
      setMsg("✅ Admin added! They can login at /admin/login with the password you set.");
      setForm({ name: "", email: "", password: "" });
      refreshAdmins();
      setTimeout(() => setMsg(""), 4000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to create admin.");
    } finally { setLoading(false); }
  };

  const handleDelete = async (adminId, adminName) => {
    if (!window.confirm(`Remove ${adminName} as admin? They will lose access immediately.`)) return;
    setDeleting(adminId);
    try {
      await axios.delete(`/restaurants/${restaurantId}/admins/${adminId}`);
      setAdmins(p => p.filter(a => a._id !== adminId));
      setMsg("Admin removed.");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to remove admin.");
    } finally { setDeleting(null); }
  };

  const inp = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1.5px solid ${C.border}`, fontSize: 14,
    fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff"
  };

  return (
    <div>
      {/* Existing admins list */}
      {admins.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 12
          }}>{admins.length} / 3 admins</div>
          {admins.map(a => (
            <div key={a._id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", background: C.bgSoft, borderRadius: 12, marginBottom: 10,
              border: `1px solid ${C.border}`
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", background: C.amber + "20",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 700, color: C.amber, flexShrink: 0
              }}>
                {a.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{a.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{a.email}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                background: C.green + "15", color: C.green, border: `1px solid ${C.green}30`, marginRight: 8
              }}>
                Admin
              </span>
              <button onClick={() => handleDelete(a._id, a.name)} disabled={deleting === a._id}
                style={{
                  padding: "7px 14px", background: C.red + "12", border: `1px solid ${C.red}30`,
                  borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                }}>
                {deleting === a._id ? "…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {msg && <div style={{ padding: "10px 16px", background: C.green + "15", borderRadius: 8, fontSize: 13, color: C.green, marginBottom: 14 }}>{msg}</div>}
      {error && <div style={{ padding: "10px 16px", background: C.red + "15", borderRadius: 8, fontSize: 13, color: C.red, marginBottom: 14 }}>⚠️ {error}</div>}

      {/* Add form — only show if under 3 */}
      {admins.length < 3 ? (
        <div style={{ background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>
            Add New Admin ({3 - admins.length} slot{3 - admins.length !== 1 ? "s" : ""} remaining)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input placeholder="Admin name *" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inp}
              onFocus={e => e.target.style.borderColor = C.amber}
              onBlur={e => e.target.style.borderColor = C.border} />
            <input placeholder="Admin email *" type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inp}
              onFocus={e => e.target.style.borderColor = C.amber}
              onBlur={e => e.target.style.borderColor = C.border} />
            <input placeholder="Set password * (min 6 characters)" type="password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={inp}
              onFocus={e => e.target.style.borderColor = C.amber}
              onBlur={e => e.target.style.borderColor = C.border} />
            <button onClick={handleAdd} disabled={loading || !form.name || !form.email || !form.password}
              style={{
                padding: "12px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 700,
                fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s", cursor: "pointer",
                background: (!form.name || !form.email || !form.password) ? C.bgSoft : C.amber,
                color: (!form.name || !form.email || !form.password) ? C.textMuted : "#fff"
              }}>
              {loading ? "Adding…" : "Add Admin →"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.6 }}>
            Share login credentials with your admin. They login at <strong style={{ color: C.amber }}>/admin/login</strong>
          </p>
        </div>
      ) : (
        <div style={{
          padding: "16px 20px", background: C.amberSoft, borderRadius: 10,
          border: `1px solid ${C.amber}30`, fontSize: 14, color: C.textMid
        }}>
          Maximum of 3 admins reached. Remove an existing admin to add a new one.
        </div>
      )}
    </div>
  );
}

// ─── Restaurant List ──────────────────────────────────────────────────────────

function RestaurantList({ restaurants, onSelect, onAdd }) {
  if (restaurants.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 40px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏢</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: C.text, marginBottom: 12 }}>No restaurants yet</h2>
        <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Add your first restaurant to get started.<br />Our team will verify and activate it.
        </p>
        <button onClick={onAdd}
          style={{ padding: "13px 28px", background: C.amber, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          + Add Your First Restaurant
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: C.text, marginBottom: 4 }}>My Restaurants</h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>{restaurants.length} restaurant{restaurants.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button onClick={onAdd}
          style={{ padding: "10px 20px", background: C.amber, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          + Add Restaurant
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {restaurants.map(r => {
          const statusColor = r.verificationStatus === "verified" ? C.green : r.verificationStatus === "rejected" ? C.red : C.amber;
          return (
            <div key={r._id} onClick={() => onSelect(r)}
              style={{
                background: C.bgCard, borderRadius: 16, border: `1.5px solid ${C.border}`,
                overflow: "hidden", cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.boxShadow = `0 8px 24px ${C.amber}15`; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ height: 8, background: statusColor }} />
              <div style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: C.text }}>{r.name}</h3>
                  <Badge label={r.verificationStatus === "verified" ? "Live" : "Pending"} color={statusColor} />
                </div>
                <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
                  {[r.address?.area, r.address?.city].filter(Boolean).join(", ") || "Address not set"}
                </p>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>{r.avgRating || "—"}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>Rating</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{r.totalReviews || 0}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>Reviews</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function Overview({ user, restaurants, onNavigate }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          {greeting}, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p style={{ color: C.textMuted, fontSize: 15 }}>Welcome to your Owner Portal.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 20, marginBottom: 32 }}>
        {[
          { icon: "🏢", label: "Total Restaurants", value: restaurants.length },
          { icon: "✅", label: "Verified", value: restaurants.filter(r => r.verificationStatus === "verified").length },
          { icon: "⏳", label: "Pending", value: restaurants.filter(r => r.verificationStatus === "pending").length },
        ].map(s => (
          <div key={s.label} style={{ background: C.bgCard, padding: 24, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: C.amber }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          { icon: "🏢", title: "Manage Restaurants", desc: "View, edit and manage your restaurants", action: () => onNavigate("restaurants") },
          { icon: "➕", title: "Add New Restaurant", desc: "Register a new restaurant on TableMint", action: () => onNavigate("add") },
        ].map(c => (
          <div key={c.title} onClick={c.action}
            style={{ background: C.bgCard, padding: 28, borderRadius: 16, border: `1.5px solid ${C.border}`, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>{c.title}</h3>
            <p style={{ fontSize: 13, color: C.textMuted }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue View ─────────────────────────────────────────────────────────────
function RevenueView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/admin/owner/revenue', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then(r => r.json())
      .then(d => setData(d.status === 'success' ? d.data : null))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '60px 0', textAlign: 'center', color: C.textMuted }}>Loading revenue…</div>;
  if (!data) return <div style={{ padding: '60px 0', textAlign: 'center', color: C.textMuted }}>Could not load revenue data.</div>;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: C.text, marginBottom: 8 }}>💰 Revenue Overview</h1>
        <p style={{ fontSize: 14, color: C.textMuted }}>All-time reservation fee revenue across your {data.restaurants.length} restaurant(s).</p>
      </div>

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 36 }}>
        {[
          { icon: '💰', label: 'Total Revenue', value: `₹${(data.total.revenue || 0).toLocaleString()}` },
          { icon: '📋', label: 'Total Reservations', value: data.total.reservations },
          { icon: '🏢', label: 'Restaurants', value: data.restaurants.length },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{ background: C.bgCard, padding: 24, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: C.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Per-restaurant breakdown */}
      {data.restaurants.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: C.textMuted }}>No restaurants found.</div>
      ) : (
        <div style={{ background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: `1px solid ${C.border}` }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text }}>Per-Restaurant Breakdown</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead><tr style={{ background: C.bgSoft, borderBottom: `2px solid ${C.border}` }}>
                {['RESTAURANT', 'STATUS', 'RATING', 'RESERVATIONS', 'REVENUE', 'NO-SHOWS'].map(h => (
                  <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.restaurants.map(r => (
                  <tr key={r._id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: C.text }}>{r.name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: r.isActive ? C.green : C.red, background: (r.isActive ? C.green : C.red) + '18' }}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: C.text }}>{r.avgRating ? `${r.avgRating}⭐` : '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 700, color: C.text }}>{r.reservations}</td>
                    <td style={{ padding: '14px 16px', fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.amber }}>₹{(r.revenue || 0).toLocaleString()}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: C.red, fontWeight: 600 }}>{r.noShows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Owner Dashboard ─────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [active, setActive] = useState("overview");
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/restaurants/my/all")
      .then(r => setRestaurants(r.data.data.restaurants || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); navigate("/for-restaurants"); };

  const handleRestaurantAdded = (r) => {
    setRestaurants(p => [...p, r]);
    setSelectedRestaurant(r);
    setActive("restaurants");
  };

  const renderContent = () => {
    if (loading) return <div style={{ padding: 80, textAlign: "center", color: C.textMuted }}>Loading…</div>;

    if (selectedRestaurant && active === "restaurants") {
      return <RestaurantDetail restaurant={selectedRestaurant} onBack={() => setSelectedRestaurant(null)} />;
    }

    switch (active) {
      case "overview": return <Overview user={user} restaurants={restaurants} onNavigate={setActive} />;
      case "restaurants": return <RestaurantList restaurants={restaurants} onSelect={async (r) => {
        // Fetch full restaurant (includes menu + tables) instead of the summary version
        try {
          const res = await axios.get(`/restaurants/${r._id}`);
          setSelectedRestaurant(res.data.data.restaurant);
        } catch (e) {
          setSelectedRestaurant(r); // fallback to summary if fetch fails
        }
      }} onAdd={() => setActive("add")} />;
      case "add": return <AddRestaurantForm onSuccess={handleRestaurantAdded} />;
      case "revenue": return <RevenueView />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`${FONTS} *{box-sizing:border-box;margin:0;padding:0;} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#D4C4B0;border-radius:3px}`}</style>
      <SideNav active={active} setActive={(v) => { setActive(v); setSelectedRestaurant(null); }} restaurantCount={restaurants.length} onLogout={handleLogout} />
      <div style={{ flex: 1, background: C.bg, overflowY: "auto" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
