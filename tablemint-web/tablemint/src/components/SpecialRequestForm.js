import { useState } from "react";
import axios from "axios";

const C = {
  border: "#E8E0D0", amber: "#D4883A", amberSoft: "#FBF0E0",
  text: "#2C2416", textMid: "#6B5B45", textMuted: "#A0907A",
  green: "#4A9B6F", red: "#D05A4A",
};

/**
 * SpecialRequestForm — Inline form for confirmed reservations.
 *
 * Allows the customer to send one special message/request to the restaurant.
 * Once sent, displays the message as read-only.
 *
 * Props:
 *   reservationId       — The reservation's MongoDB _id
 *   existingMessage     — If already sent, shows it read-only
 *   existingMessageSentAt — ISO date string of when message was sent
 *   onSent(msg)         — Called with the sent message text after success
 */
export default function SpecialRequestForm({
  reservationId,
  existingMessage,
  existingMessageSentAt,
  onSent,
}) {
  const [expanded, setExpanded]   = useState(!!existingMessage);
  const [message, setMessage]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(existingMessage || "");
  const [sentAt, setSentAt]       = useState(existingMessageSentAt || null);

  // If a message was already stored at mount time, show it read-only
  const alreadySent = !!(success || existingMessage);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed)         { setError("Please write a message before sending."); return; }
    if (trimmed.length > 600) { setError("Message cannot exceed 600 characters."); return; }

    setLoading(true); setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `/reservations/${reservationId}/customer-message`,
        { message: trimmed },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const sentMessage = res.data.data?.customerMessage || trimmed;
      const sentTime    = res.data.data?.sentAt || new Date().toISOString();
      setSuccess(sentMessage);
      setSentAt(sentTime);
      setMessage("");
      if (onSent) onSent(sentMessage);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      marginTop: 14, borderRadius: 12,
      border: `1px solid ${alreadySent ? C.amber + "50" : C.border}`,
      background: alreadySent ? C.amberSoft : "#fff",
      overflow: "hidden",
      transition: "all 0.2s",
    }}>
      {/* ── Header / Toggle ── */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: "100%", padding: "12px 16px",
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>💬</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: alreadySent ? C.amber : C.textMid }}>
            {alreadySent ? "Special Request Sent" : "Send Special Request to Restaurant"}
          </span>
        </div>
        <span style={{
          fontSize: 14, color: C.textMuted,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          display: "inline-block",
        }}>▾</span>
      </button>

      {/* ── Expandable Body ── */}
      {expanded && (
        <div style={{ padding: "0 16px 16px" }}>
          {alreadySent ? (
            /* ── Read-only: message already sent ── */
            <div>
              <div style={{
                padding: "12px 14px", background: "#fff",
                borderRadius: 10, fontSize: 13, color: C.textMid,
                border: `1px solid ${C.amber}30`, lineHeight: 1.6,
                fontStyle: "italic",
              }}>
                {`"${success || existingMessage}"`}
              </div>
              {sentAt && (
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                  📤 Sent {new Date(sentAt).toLocaleString("en-IN", {
                    day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              )}
              <div style={{
                marginTop: 8, fontSize: 12, color: C.green,
                fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
              }}>
                ✓ Restaurant and captain can see this message.
              </div>
            </div>
          ) : (
            /* ── Input form ── */
            <div>
              <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
                Share any special requirements — dietary restrictions, seating preferences, celebration notes, etc.
                The restaurant team will see this.
              </p>
              <textarea
                id="special-request-input"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={600}
                rows={3}
                placeholder="e.g. Please arrange a window seat — celebrating our anniversary 🎉"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10,
                  border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text,
                  fontFamily: "'DM Sans',sans-serif", outline: "none",
                  resize: "vertical", boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = C.amber)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginTop: 4,
              }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>{message.length}/600</span>
                {error && (
                  <span style={{ fontSize: 11, color: C.red }}>⚠️ {error}</span>
                )}
              </div>
              <button
                id="special-request-send-btn"
                onClick={handleSend}
                disabled={loading || !message.trim()}
                style={{
                  marginTop: 10, width: "100%", padding: "10px",
                  background: message.trim() && !loading ? C.amber : C.border,
                  border: "none", borderRadius: 10, color: "#fff",
                  fontSize: 13, fontWeight: 700,
                  cursor: message.trim() && !loading ? "pointer" : "not-allowed",
                  fontFamily: "'DM Sans',sans-serif",
                  transition: "all 0.2s",
                  boxShadow: message.trim() && !loading ? "0 3px 10px rgba(212,136,58,0.3)" : "none",
                }}
              >
                {loading ? "Sending…" : "📤 Send to Restaurant"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
