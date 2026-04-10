import { useState, useRef } from "react";
import axios from "axios";

const C = {
  bg: "#FDFAF6", bgSoft: "#F5F0E8", bgCard: "#FFFFFF",
  border: "#E8E0D0", amber: "#D4883A", amberSoft: "#FBF0E0",
  text: "#2C2416", textMid: "#6B5B45", textMuted: "#A0907A",
  green: "#4A9B6F", red: "#D05A4A",
};

function StarPicker({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            fontSize: size, cursor: "pointer",
            color: n <= (hover || value) ? "#F59E0B" : "#D1C5B5",
            transition: "color 0.1s, transform 0.1s",
            transform: n <= (hover || value) ? "scale(1.15)" : "scale(1)",
            display: "inline-block",
          }}
        >★</span>
      ))}
    </div>
  );
}

function SubRating({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: C.textMid, fontWeight: 600 }}>{label}</span>
      <StarPicker value={value} onChange={onChange} size={20} />
    </div>
  );
}

export default function ReviewModal({ reservation, restaurantName, restaurantId, onClose, onSuccess }) {
  const [rating, setRating]                   = useState(0);
  const [comment, setComment]                 = useState("");
  const [title, setTitle]                     = useState("");
  const [foodRating, setFoodRating]           = useState(0);
  const [serviceRating, setServiceRating]     = useState(0);
  const [ambienceRating, setAmbienceRating]   = useState(0);
  const [files, setFiles]                     = useState([]);
  const [previews, setPreviews]               = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const fileRef                               = useRef(null);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files).slice(0, 5 - files.length);
    if (!picked.length) return;
    setFiles((p) => [...p, ...picked]);
    setPreviews((p) => [...p, ...picked.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!rating)         { setError("Please select a star rating."); return; }
    if (!comment.trim()) { setError("Please write a comment."); return; }
    setLoading(true); setError("");

    try {
      const fd = new FormData();
      fd.append("restaurantId", restaurantId);
      fd.append("rating", rating);
      if (title.trim())  fd.append("title", title.trim());
      fd.append("comment", comment.trim());
      if (foodRating)    fd.append("foodRating",    foodRating);
      if (serviceRating) fd.append("serviceRating", serviceRating);
      if (ambienceRating) fd.append("ambienceRating", ambienceRating);
      files.forEach((f) => fd.append("media", f));

      await axios.post("/reviews", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const LABELS = ["", "Poor 😞", "Fair 😐", "Good 🙂", "Very Good 😊", "Excellent 🤩"];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bgCard, borderRadius: 24, width: "100%", maxWidth: 560,
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
          animation: "rmSlideUp 0.25s ease",
        }}
      >
        <style>{`
          @keyframes rmSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes rmSpin    { to { transform: rotate(360deg); } }
        `}</style>

        {/* ── Header ── */}
        <div style={{
          padding: "24px 28px 18px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          position: "sticky", top: 0, background: C.bgCard,
          borderRadius: "24px 24px 0 0", zIndex: 1,
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700,
              color: C.text, margin: "0 0 4px",
            }}>✍️ Write a Review</h2>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              {restaurantName}
              {reservation?.confirmationCode && (
                <> · <span style={{ fontFamily: "monospace", color: C.amber, fontWeight: 700 }}>
                  #{reservation.confirmationCode}
                </span></>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: "50%", background: C.bgSoft,
            border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 18,
            color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>×</button>
        </div>

        <div style={{ padding: "24px 28px" }}>

          {/* ── Overall Star Rating ── */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, color: C.textMuted,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12,
            }}>
              Overall Rating *
            </p>
            <StarPicker value={rating} onChange={setRating} size={40} />
            <p style={{ marginTop: 8, fontSize: 13, color: C.amber, fontWeight: 700, minHeight: 20 }}>
              {LABELS[rating]}
            </p>
          </div>

          {/* ── Title ── */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
              Review Title (optional)
            </label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              maxLength={100} placeholder="e.g. Fantastic dining experience!"
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.amber)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>

          {/* ── Comment ── */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
              Your Comment *
            </label>
            <textarea
              value={comment} onChange={(e) => setComment(e.target.value)}
              maxLength={1000} rows={4}
              placeholder="Share your experience — food, service, ambience, what you loved…"
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text,
                fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.amber)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right", marginTop: 3 }}>
              {comment.length}/1000
            </div>
          </div>

          {/* ── Sub Ratings ── */}
          <div style={{
            padding: "14px 16px", background: C.bgSoft, borderRadius: 12,
            border: `1px solid ${C.border}`, marginBottom: 20,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Rate Specific Aspects (optional)
            </p>
            <SubRating label="🍽️ Food Quality"  value={foodRating}    onChange={setFoodRating} />
            <SubRating label="👨‍🍳 Service"        value={serviceRating} onChange={setServiceRating} />
            <SubRating label="✨ Ambience"        value={ambienceRating} onChange={setAmbienceRating} />
          </div>

          {/* ── Photo Upload ── */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              Add Photos (up to 5)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 8 }}>
              {previews.map((url, i) => (
                <div key={i} style={{
                  position: "relative", height: 88, borderRadius: 10,
                  overflow: "hidden", border: `1.5px solid ${C.border}`,
                }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removeFile(i)} style={{
                    position: "absolute", top: 4, right: 4, width: 22, height: 22,
                    borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none",
                    color: "#fff", fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>×</button>
                </div>
              ))}
              {files.length < 5 && (
                <label style={{
                  height: 88, border: `2px dashed ${C.border}`, borderRadius: 10,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", background: C.bgSoft,
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.amber)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
                >
                  <span style={{ fontSize: 22, color: C.textMuted }}>📷</span>
                  <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, marginTop: 3 }}>Add Photo</span>
                  <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: "none" }} />
                </label>
              )}
            </div>
            {files.length > 0 && (
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                {files.length}/5 file{files.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              padding: "11px 14px", background: "#FFF5F5", border: `1px solid ${C.red}30`,
              borderRadius: 10, fontSize: 13, color: C.red, marginBottom: 16,
            }}>⚠️ {error}</div>
          )}

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit} disabled={loading}
            style={{
              width: "100%", padding: "15px",
              background: loading ? C.border : C.amber,
              border: "none", borderRadius: 12, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : "0 4px 16px rgba(212,136,58,0.35)",
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <>
                <span style={{
                  display: "inline-block", width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
                  borderRadius: "50%", animation: "rmSpin 0.7s linear infinite",
                }} />
                Submitting…
              </>
            ) : "Submit Review ✨"}
          </button>
        </div>
      </div>
    </div>
  );
}
