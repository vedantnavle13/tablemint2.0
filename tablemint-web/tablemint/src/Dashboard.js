import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from './context/AuthContext';

const C = {
  bg:        "#FDFAF6",
  bgSoft:    "#F5F0E8",
  bgCard:    "#FFFFFF",
  border:    "#E8E0D0",
  amber:     "#D4883A",
  amberSoft: "#FBF0E0",
  text:      "#2C2416",
  textMid:   "#6B5B45",
  textMuted: "#A0907A",
  green:     "#4A9B6F",
  red:       "#D05A4A",
  blue:      "#4A7B9D",
};

// ========================================
// 📝 MOCK DATA (Replace with API later)
// ========================================

const mockRestaurant = {
  name: "Ember & Oak",
  id: 1,
};

const mockStats = {
  todayReservations: 12,
  todayRevenue: 3600,
  avgPartySize: 3.5,
  noShows: 1,
  yesterdayComparison: {
    reservations: +20,
    revenue: +400,
    partySize: -0.2,
    noShows: -2,
  }
};

const mockUpcomingReservations = [
  {
    id: "RES001",
    time: "7:30 PM",
    customerId: "CUST2453",
    guests: 4,
    preOrder: {
      items: [
        { name: "Tandoori Chicken Platter", qty: 2, price: 650 },
        { name: "Dal Makhani", qty: 1, price: 320 },
        { name: "Butter Naan", qty: 3, price: 80 }
      ],
      total: 1860
    },
    status: "arriving", // arriving, confirmed, completed, cancelled
    arrivalIn: 15,
  },
  {
    id: "RES002",
    time: "8:00 PM",
    customerId: "CUST2454",
    guests: 2,
    preOrder: {
      items: [
        { name: "Paneer Tikka Masala", qty: 1, price: 480 },
        { name: "Garlic Naan", qty: 2, price: 90 }
      ],
      total: 660
    },
    status: "confirmed",
    arrivalIn: 45,
  },
  {
    id: "RES003",
    time: "8:30 PM",
    customerId: "CUST2455",
    guests: 6,
    preOrder: null,
    status: "confirmed",
    arrivalIn: 75,
  },
  {
    id: "RES004",
    time: "9:00 PM",
    customerId: "CUST2456",
    guests: 3,
    preOrder: {
      items: [
        { name: "Butter Chicken", qty: 2, price: 550 },
        { name: "Vegetable Biryani", qty: 1, price: 380 }
      ],
      total: 1480
    },
    status: "confirmed",
    arrivalIn: 105,
  },
];

// ========================================
// 📊 COMPONENTS
// ========================================

function StatCard({ icon, label, value, change, trend }) {
  const isPositive = change > 0;
  const trendColor = trend === "good" ? C.green : trend === "bad" ? C.red : C.textMuted;

  return (
    <div style={{
      background: C.bgCard,
      padding: 24,
      borderRadius: 16,
      border: `1px solid ${C.border}`,
      transition: "all 0.2s ease",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        {change !== undefined && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            background: isPositive ? C.green + "15" : C.red + "15",
            borderRadius: 8,
          }}>
            <span style={{ fontSize: 12, color: trendColor, fontWeight: 700 }}>
              {isPositive ? "↑" : "↓"} {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 32,
        fontWeight: 700,
        color: C.text,
      }}>
        {value}
      </div>
    </div>
  );
}

function ReservationRow({ reservation, onViewDetails }) {
  const getStatusColor = (status) => {
    switch(status) {
      case "arriving": return C.amber;
      case "confirmed": return C.green;
      case "completed": return C.blue;
      case "cancelled": return C.red;
      default: return C.textMuted;
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case "arriving": return `⚡ Arriving in ${reservation.arrivalIn}m`;
      case "confirmed": return "✅ Confirmed";
      case "completed": return "✓ Completed";
      case "cancelled": return "✗ Cancelled";
      default: return status;
    }
  };

  return (
    <tr style={{
      borderBottom: `1px solid ${C.border}`,
      transition: "background 0.2s ease",
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <td style={{ padding: "16px 12px", fontSize: 15, fontWeight: 700, color: C.text }}>
        {reservation.time}
      </td>
      <td style={{ padding: "16px 12px" }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.amber,
          background: C.amberSoft,
          padding: "4px 10px",
          borderRadius: 8,
          fontFamily: "monospace",
        }}>
          {reservation.customerId}
        </span>
      </td>
      <td style={{ padding: "16px 12px", fontSize: 14, color: C.text, textAlign: "center" }}>
        👥 {reservation.guests}
      </td>
      <td style={{ padding: "16px 12px" }}>
        {reservation.preOrder ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              ₹{reservation.preOrder.total}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              {reservation.preOrder.items.length} item{reservation.preOrder.items.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => onViewDetails(reservation)}
              style={{
                marginTop: 6,
                fontSize: 12,
                color: C.amber,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                textDecoration: "underline",
                padding: 0,
              }}
            >
              View Details →
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic" }}>No pre-order</span>
        )}
      </td>
      <td style={{ padding: "16px 12px" }}>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: getStatusColor(reservation.status),
          background: getStatusColor(reservation.status) + "15",
          padding: "6px 12px",
          borderRadius: 8,
          whiteSpace: "nowrap",
        }}>
          {getStatusLabel(reservation.status)}
        </span>
      </td>
    </tr>
  );
}

// ========================================
// 🏠 DASHBOARD COMPONENT
// ========================================

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedReservation, setSelectedReservation] = useState(null);

  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate('/for-restaurants');
  };

  const viewAllReservations = () => {
    navigate('/restaurant-portal/reservations');
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const greeting = hours < 12 ? "Good Morning" : hours < 17 ? "Good Afternoon" : "Good Evening";
    return greeting;
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:8px; }
        ::-webkit-scrollbar-thumb { background:#D4C4B0; border-radius:4px; }
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* TOP NAV */}
      <nav style={{
        background: C.bgCard,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 6%",
        height: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>🍽️</span>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
            }}>
              Table<span style={{ color: C.amber }}>Mint</span>
            </span>
            <span style={{
              fontSize: 13,
              color: C.textMuted,
              fontWeight: 500,
              marginLeft: 8,
            }}>Restaurant Portal</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {[
            { label: "Dashboard", path: "/restaurant-portal/dashboard", active: true },
            { label: "Reservations", path: "/restaurant-portal/reservations" },
            { label: "Menu", path: "/restaurant-portal/menu" },
            { label: "Analytics", path: "/restaurant-portal/analytics" },
          ].map(item => (
            <span
              key={item.label}
              onClick={() => navigate(item.path)}
              style={{
                fontSize: 14,
                fontWeight: item.active ? 700 : 500,
                color: item.active ? C.amber : C.textMuted,
                cursor: "pointer",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={e => e.target.style.color = C.amber}
              onMouseLeave={e => e.target.style.color = item.active ? C.amber : C.textMuted}
            >
              {item.label}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: C.amberSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 700,
            color: C.amber,
          }}>
            E
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              color: C.textMid,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              e.target.style.borderColor = C.red;
              e.target.style.color = C.red;
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = C.border;
              e.target.style.color = C.textMid;
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div style={{ padding: "40px 6%", maxWidth: 1600, margin: "0 auto" }}>
        
        {/* GREETING */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 36,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}>
            {getCurrentTime()}, {mockRestaurant.name}! 👋
          </h1>
          <p style={{ fontSize: 15, color: C.textMuted }}>
            📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* STATS GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          marginBottom: 40,
        }}>
          <StatCard
            icon="📊"
            label="Today's Reservations"
            value={mockStats.todayReservations}
            change={mockStats.yesterdayComparison.reservations}
            trend="good"
          />
          <StatCard
            icon="💰"
            label="Revenue (Res Fees)"
            value={`₹${mockStats.todayRevenue.toLocaleString()}`}
            change={Math.round((mockStats.yesterdayComparison.revenue / (mockStats.todayRevenue - mockStats.yesterdayComparison.revenue)) * 100)}
            trend="good"
          />
          <StatCard
            icon="👥"
            label="Avg Party Size"
            value={mockStats.avgPartySize}
            change={Math.round((mockStats.yesterdayComparison.partySize / (mockStats.avgPartySize - mockStats.yesterdayComparison.partySize)) * 100)}
            trend={mockStats.yesterdayComparison.partySize < 0 ? "bad" : "good"}
          />
          <StatCard
            icon="❌"
            label="No-Shows"
            value={mockStats.noShows}
            change={Math.abs(mockStats.yesterdayComparison.noShows) * 100}
            trend="good"
          />
        </div>

        {/* UPCOMING RESERVATIONS */}
        <div style={{
          background: C.bgCard,
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          marginBottom: 40,
        }}>
          <div style={{
            padding: "24px 32px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 24,
                fontWeight: 700,
                color: C.text,
                marginBottom: 4,
              }}>
                🔥 Upcoming Reservations
              </h2>
              <p style={{ fontSize: 14, color: C.textMuted }}>
                Next 2 hours • {mockUpcomingReservations.length} bookings
              </p>
            </div>
            <button
              onClick={viewAllReservations}
              style={{
                padding: "10px 20px",
                background: C.amber,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              View All →
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr style={{ background: C.bgSoft, borderBottom: `2px solid ${C.border}` }}>
                  <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>TIME</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>CUSTOMER ID</th>
                  <th style={{ padding: "14px 12px", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>GUESTS</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>PRE-ORDER</th>
                  <th style={{ padding: "14px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: 1 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {mockUpcomingReservations.map(reservation => (
                  <ReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    onViewDetails={setSelectedReservation}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: C.text,
            marginBottom: 20,
          }}>Quick Actions</h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {[
              { icon: "📋", title: "All Reservations", desc: "Manage bookings", path: "/restaurant-portal/reservations" },
              { icon: "🍽️", title: "Update Menu", desc: "Add/edit items", path: "/restaurant-portal/menu" },
              { icon: "📊", title: "View Reports", desc: "Analytics & stats", path: "/restaurant-portal/analytics" },
            ].map(action => (
              <div
                key={action.title}
                onClick={() => navigate(action.path)}
                style={{
                  background: C.bgCard,
                  padding: 24,
                  borderRadius: 16,
                  border: `1.5px solid ${C.border}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.amber;
                  e.currentTarget.style.boxShadow = `0 8px 24px ${C.amber}15`;
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>{action.icon}</div>
                <h4 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 6,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {action.title}
                </h4>
                <p style={{ fontSize: 13, color: C.textMuted }}>
                  {action.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRE-ORDER DETAILS MODAL */}
      {selectedReservation && (
        <div
          onClick={() => setSelectedReservation(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.bgCard,
              borderRadius: 20,
              maxWidth: 500,
              width: "100%",
              padding: 32,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 8,
                }}>
                  Pre-Order Details
                </h3>
                <p style={{ fontSize: 14, color: C.textMuted }}>
                  {selectedReservation.customerId} • {selectedReservation.time}
                </p>
              </div>
              <button
                onClick={() => setSelectedReservation(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: `1px solid ${C.border}`,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 18,
                  color: C.textMuted,
                }}
              >
                ×
              </button>
            </div>

            {selectedReservation.preOrder ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  {selectedReservation.preOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "12px 0",
                        borderBottom: idx < selectedReservation.preOrder.items.length - 1 ? `1px solid ${C.border}` : "none",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 13, color: C.textMuted }}>
                          Qty: {item.qty} × ₹{item.price}
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>
                        ₹{item.qty * item.price}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding: "16px 0",
                  borderTop: `2px solid ${C.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Total</span>
                  <span style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: C.amber,
                  }}>
                    ₹{selectedReservation.preOrder.total}
                  </span>
                </div>

                <div style={{
                  marginTop: 20,
                  padding: 12,
                  background: C.green + "15",
                  borderRadius: 10,
                  border: `1px solid ${C.green}30`,
                  fontSize: 13,
                  color: C.green,
                  fontWeight: 600,
                  textAlign: "center",
                }}>
                  💳 Pre-order to be paid at restaurant
                </div>
              </>
            ) : (
              <p style={{ fontSize: 14, color: C.textMuted, textAlign: "center", padding: "40px 0" }}>
                No pre-order for this reservation
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
