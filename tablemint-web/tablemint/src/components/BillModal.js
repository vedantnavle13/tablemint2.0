import { useRef } from "react";

const C = {
  bg: "#FDFAF6", bgSoft: "#F5F0E8", bgCard: "#FFFFFF",
  border: "#E8E0D0", amber: "#D4883A", amberSoft: "#FBF0E0",
  text: "#2C2416", textMid: "#6B5B45", textMuted: "#A0907A",
  green: "#4A9B6F", red: "#D05A4A", blue: "#4A7B9D",
};

/**
 * BillModal — Print-friendly bill with TableMint branding.
 *
 * Props:
 *   reservation  — full populated reservation object from /api/reservations/:id/bill
 *   onClose()    — close the modal
 *   onPay()      — called when customer clicks "Pay Now" (triggers markPayment)
 *   paying       — boolean loading state for payment action
 */
export default function BillModal({ reservation, onClose, onPay, paying = false }) {
  const printRef = useRef(null);

  if (!reservation) return null;

  const {
    restaurant, customer, confirmationCode,
    scheduledAt, numberOfGuests, preOrderItems = [],
    billItems = [], billTax = 0, billTotal = 0,
    billGeneratedAt, billGeneratedBy, billNotes,
    reservationFee = 0, paymentStatus = "unpaid",
    paymentReference,
  } = reservation;

  const isAlreadyPaid = paymentStatus === "paid" || paymentStatus === "waived";

  const subtotal = billItems.reduce((s, i) => s + i.amount * i.quantity, 0);

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const w = window.open("", "_blank", "width=800,height=900");
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TableMint Bill — ${confirmationCode || reservation._id?.slice(-8).toUpperCase()}</title>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
          <style>
            * { box-sizing:border-box; margin:0; padding:0; }
            body { font-family:'DM Sans',sans-serif; background:#fff; color:#2C2416; padding:40px; }
            table { width:100%; border-collapse:collapse; }
            th, td { padding:10px 14px; text-align:left; border-bottom:1px solid #E8E0D0; }
            th { font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#A0907A; font-weight:700; }
            .total-row td { font-weight:700; font-size:14px; }
            .grand-total td { font-size:18px; color:#D4883A; border-top:2px solid #D4883A; }
            @media print { body { padding:20px; } }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

  const PAYMENT_COLORS = {
    unpaid:   C.red,
    paid:     C.green,
    refunded: C.blue,
    waived:   C.textMuted,
  };

  const PAYMENT_LABELS = {
    unpaid:   "Unpaid",
    paid:     "Paid ✓",
    refunded: "Refunded",
    waived:   "Waived",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 3000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes billSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes billSpin    { to { transform: rotate(360deg); } }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bgCard, borderRadius: 24, width: "100%", maxWidth: 620,
          maxHeight: "94vh", overflowY: "auto",
          boxShadow: "0 32px 100px rgba(0,0,0,0.35)",
          animation: "billSlideUp 0.3s ease",
        }}
      >
        {/* ── Modal Actions Header ── */}
        <div className="no-print" style={{
          padding: "20px 28px 16px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, background: C.bgCard,
          borderRadius: "24px 24px 0 0", zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🧾</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: C.text }}>
              Your Bill
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              id="bill-print-btn"
              onClick={handlePrint}
              style={{
                padding: "8px 16px", background: C.bgSoft, border: `1px solid ${C.border}`,
                borderRadius: 10, fontSize: 13, fontWeight: 600, color: C.textMid,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              🖨️ Print
            </button>
            <button onClick={onClose} aria-label="Close bill" style={{
              width: 36, height: 36, borderRadius: "50%", background: C.bgSoft,
              border: `1px solid ${C.border}`, cursor: "pointer", fontSize: 18,
              color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>

        {/* ── Printable Content ── */}
        <div ref={printRef} style={{ padding: "28px 28px 0" }}>

          {/* ── TableMint Brand Header ── */}
          <div style={{
            textAlign: "center", padding: "20px 0 24px",
            borderBottom: `2px solid ${C.amber}`,
          }}>
            <div style={{
              fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700,
              color: C.text, letterSpacing: -0.5, marginBottom: 4,
            }}>
              Table<span style={{ color: C.amber }}>Mint</span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
              Restaurant Management Platform
            </div>
            {restaurant?.address && (
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
                {[restaurant.address.street, restaurant.address.area, restaurant.address.city].filter(Boolean).join(", ")}
                {restaurant.phone && ` · ${restaurant.phone}`}
              </div>
            )}
          </div>

          {/* ── Restaurant & Bill Info ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "24px 0",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Restaurant</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{restaurant?.name || "—"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Bill Reference</div>
              <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 900, color: C.amber, letterSpacing: 2 }}>
                #{confirmationCode || reservation._id?.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* ── Booking Summary Row ── */}
          <div style={{
            background: C.bgSoft, borderRadius: 12, padding: "14px 18px",
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
            marginBottom: 24, border: `1px solid ${C.border}`,
          }}>
            {[
              { label: "Customer", value: customer?.name || "—" },
              { label: "Visit Date", value: scheduledAt ? new Date(scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—" },
              { label: "Time", value: scheduledAt ? new Date(scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—" },
              { label: "Guests", value: numberOfGuests || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{value}</div>
              </div>
            ))}
          </div>

          {/* ── Itemized Bill Table ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
            <thead>
              <tr>
                {["Item / Description", "Qty", "Unit Price", "Amount"].map(h => (
                  <th key={h} style={{
                    padding: "10px 12px", textAlign: h === "Amount" || h === "Qty" || h === "Unit Price" ? "right" : "left",
                    fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5,
                    color: C.textMuted, fontWeight: 700,
                    borderBottom: `2px solid ${C.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billItems.length > 0 ? billItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "11px 12px", fontSize: 13, color: C.text, fontWeight: 500 }}>
                    {item.description}
                  </td>
                  <td style={{ padding: "11px 12px", fontSize: 13, color: C.textMid, textAlign: "right" }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: "11px 12px", fontSize: 13, color: C.textMid, textAlign: "right" }}>
                    ₹{item.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 600, color: C.text, textAlign: "right" }}>
                    ₹{(item.amount * item.quantity).toFixed(2)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ padding: "16px 12px", fontSize: 13, color: C.textMuted, textAlign: "center" }}>
                    No itemized records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div style={{
            marginTop: 0, borderTop: `1px solid ${C.border}`,
            paddingTop: 12,
          }}>
            {[
              { label: "Subtotal", value: `₹${subtotal.toFixed(2)}` },
              { label: "GST / Tax", value: `₹${billTax.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between",
                padding: "7px 12px",
              }}>
                <span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 12px", borderTop: `2px solid ${C.amber}`, marginTop: 4,
            }}>
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: C.text }}>
                Grand Total
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, color: C.amber }}>₹{billTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Payment Status ── */}
          <div style={{
            margin: "20px 0", padding: "14px 18px",
            background: isAlreadyPaid ? C.green + "12" : C.red + "10",
            border: `1.5px solid ${isAlreadyPaid ? C.green : C.red}40`,
            borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                Payment Status
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: PAYMENT_COLORS[paymentStatus] }}>
                {PAYMENT_LABELS[paymentStatus] || paymentStatus}
              </div>
              {paymentReference && (
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginTop: 3 }}>
                  Ref: {paymentReference}
                </div>
              )}
            </div>
            {isAlreadyPaid ? (
              <div style={{ fontSize: 32 }}>✅</div>
            ) : (
              <div style={{ fontSize: 32 }}>💳</div>
            )}
          </div>

          {/* ── Bill Notes ── */}
          {billNotes && (
            <div style={{
              padding: "10px 14px", background: C.amberSoft, borderRadius: 8,
              fontSize: 12, color: C.textMid, marginBottom: 16,
              border: `1px solid ${C.amber}20`,
            }}>
              📝 {billNotes}
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{
            borderTop: `1px solid ${C.border}`, paddingTop: 16, paddingBottom: 4,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
              Bill generated {fmtDate(billGeneratedAt)}
              {billGeneratedBy?.name && ` · by ${billGeneratedBy.name}`}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Thank you for dining with us! 🍽️ · Powered by{" "}
              <span style={{ fontFamily: "'Playfair Display',serif", color: C.amber, fontWeight: 700 }}>TableMint</span>
            </div>
          </div>
        </div>

        {/* ── Pay Now CTA (not printed) ── */}
        {!isAlreadyPaid && onPay && (
          <div className="no-print" style={{ padding: "20px 28px 28px" }}>
            <button
              id="bill-pay-btn"
              onClick={onPay}
              disabled={paying}
              style={{
                width: "100%", padding: "15px",
                background: paying ? C.border : "linear-gradient(135deg, #4A9B6F, #3A8B5F)",
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: paying ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: paying ? "none" : "0 6px 20px rgba(74,155,111,0.4)",
                transition: "all 0.2s",
              }}
            >
              {paying ? (
                <>
                  <span style={{
                    display: "inline-block", width: 16, height: 16,
                    border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
                    borderRadius: "50%", animation: "billSpin 0.7s linear infinite",
                  }} />
                  Processing…
                </>
              ) : (
                <>💳 Pay Now — ₹{billTotal.toFixed(2)}</>
              )}
            </button>
            <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 8 }}>
              Secure payment · Your reference will be generated after confirmation
            </p>
          </div>
        )}

        {isAlreadyPaid && (
          <div className="no-print" style={{ padding: "16px 28px 28px" }}>
            <div style={{
              padding: "14px 18px", background: C.green + "15", borderRadius: 12,
              textAlign: "center", fontSize: 14, fontWeight: 700, color: C.green,
              border: `1.5px solid ${C.green}40`,
            }}>
              ✅ Payment Confirmed · {paymentReference ? `Ref: ${paymentReference}` : "Thank you!"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
