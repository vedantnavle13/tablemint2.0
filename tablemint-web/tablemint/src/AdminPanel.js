import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { apiCall } from './services/api';
import AdminInsights from './components/AdminInsights';

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#FDFAF6',
  bgSoft: '#F5F0E8',
  bgCard: '#FFFFFF',
  border: '#E8E0D0',
  amber: '#D4883A',
  amberSoft: '#FBF0E0',
  text: '#2C2416',
  textMid: '#6B5B45',
  textMuted: '#A0907A',
  green: '#4A9B6F',
  red: '#D05A4A',
  blue: '#4A7B9D',
};

const TABS = ['Analytics', 'Reviews', 'Reservations', 'Menu'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusColor(s) {
  return {
    pending: C.amber, confirmed: C.green, seated: C.blue,
    completed: '#888', cancelled: C.red, no_show: C.red
  }[s] || C.textMuted;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `4px solid ${C.border}`, borderTopColor: C.amber,
        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
      }} />
      Loading…
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}></div>
      <p style={{ fontSize: 14 }}>{message}</p>
    </div>
  );
}

function StatCard({ icon, label, value, change }) {
  const up = change > 0;
  return (
    <div style={{
      background: C.bgCard, padding: 24, borderRadius: 16,
      border: `1px solid ${C.border}`, transition: 'all 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        {change !== null && change !== undefined && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
            background: up ? C.green + '18' : C.red + '18',
            color: up ? C.green : C.red,
          }}>
            {up ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, color: C.text }}>{value}</div>
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiCall('/admin/analytics')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <EmptyState message={error} />;

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 8 }}>
        Platform Analytics
      </h2>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 28 }}>
        Today's stats across all {data.totalRestaurants} active restaurants.
        {' '}% change vs yesterday.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
        <StatCard icon="" label="TODAY'S RESERVATIONS"
          value={data.todayReservations}
          change={data.changes.reservations}
        />
        <StatCard icon="" label="REVENUE (FEES)"
          value={`₹${(data.todayRevenue || 0).toLocaleString()}`}
          change={data.changes.revenue}
        />
        <StatCard icon="" label="AVG PARTY SIZE"
          value={data.avgPartySize || '—'}
          change={null}
        />
        <StatCard icon="" label="NO-SHOWS"
          value={data.noShows}
          change={data.changes.noShows !== null ? -data.changes.noShows : null}
        />
      </div>

      <div style={{
        background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`,
        padding: '20px 28px',
      }}>
        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.8 }}>
          <strong>Tip:</strong> Analytics are computed in real-time from the database.
          Revenue reflects reservation fees collected today. No-show data updates as captains mark status changes.
        </p>
      </div>
    </div>
  );
}

// ── Reviews Tab (ML Insights) ───────────────────────────────────────────
function ReviewsTab() {
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall('/admin/my-restaurant')
      .then(res => {
        const r = res.data?.restaurant || res.data;
        setRestaurantId(r?._id || null);
        setRestaurantName(r?.name || '');
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (!restaurantId) {
    return (
      <EmptyState message="No restaurant assigned to your account. Contact a super-admin." />
    );
  }

  return (
    <div>
      <h2 style={{
        fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700,
        color: C.text, marginBottom: 6,
      }}>
        Reviews &amp; AI Insights
      </h2>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 28 }}>
        ML-powered sentiment analysis from customer reviews for · <strong>{restaurantName}</strong>.
      </p>
      <AdminInsights restaurantId={restaurantId} restaurantName={restaurantName} />
    </div>
  );
}

// ── Reservations Tab ──────────────────────────────────────────────────────────
function ReservationsTab() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiCall('/admin/reservations')
      .then(res => setReservations(res.data.reservations || []))
      .catch(() => setError('Failed to load reservations.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reservations.filter(r => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.restaurant?.name?.toLowerCase().includes(q) ||
      r.customer?.name?.toLowerCase().includes(q) ||
      r.customer?.customerId?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    );
  });

  if (loading) return <Spinner />;
  if (error) return <EmptyState message={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            All Reservations
          </h2>
          <p style={{ color: C.textMuted, fontSize: 13 }}>
            {reservations.length} total reservations across all restaurants
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by restaurant, customer, status…"
          style={{
            padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`,
            fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif",
            minWidth: 260, color: C.text,
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? `No results for "${search}"` : 'No reservations found.'} />
      ) : (
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bgSoft, borderBottom: `2px solid ${C.border}` }}>
                {['TIME', 'RESTAURANT', 'CUSTOMER ID', 'GUESTS', 'PRE-ORDER', 'FEE', 'STATUS'].map(h => (
                  <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id}
                  style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px', fontSize: 13, color: C.text, whiteSpace: 'nowrap' }}>
                    {fmt(r.scheduledAt)}
                  </td>
                  <td style={{ padding: '14px', fontSize: 13, fontWeight: 600, color: C.text }}>
                    {r.restaurant?.name || '—'}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: C.amber,
                      background: C.amberSoft, padding: '3px 9px', borderRadius: 8, fontFamily: 'monospace',
                    }}>
                      {r.customer?.customerId || r.customer?.name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px', fontSize: 13, textAlign: 'center', color: C.text }}>
                    👥 {r.numberOfGuests}
                  </td>
                  <td style={{ padding: '14px', fontSize: 13, color: C.text }}>
                    {r.preOrderItems?.length > 0
                      ? `${r.preOrderItems.length} item(s) · ₹${r.preOrderTotal || 0}`
                      : <span style={{ color: C.textMuted, fontStyle: 'italic' }}>None</span>}
                  </td>
                  <td style={{ padding: '14px', fontSize: 13, fontWeight: 700, color: C.amber }}>
                    ₹{r.reservationFee || 0}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                      color: statusColor(r.status),
                      background: statusColor(r.status) + '18',
                      textTransform: 'capitalize',
                    }}>
                      {r.status?.replace('_', '-') || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Menu Tab ──────────────────────────────────────────────────────────────────
function MenuTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiCall('/admin/menu')
      .then(res => setItems(res.data.menuItems || []))
      .catch(() => setError('Failed to load menu items.'))
      .finally(() => setLoading(false));
  }, []);

  const catColor = c => ({
    starter: '#8B5CF6', main: C.amber, dessert: C.red,
    beverage: C.blue, special: C.green,
  })[c] || C.textMuted;

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return !q || i.name?.toLowerCase().includes(q) || i.restaurantName?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q);
  });

  if (loading) return <Spinner />;
  if (error) return <EmptyState message={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            All Menu Items
          </h2>
          <p style={{ color: C.textMuted, fontSize: 13 }}>
            {items.length} items across all restaurants
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by item, restaurant, category…"
          style={{
            padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`,
            fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif",
            minWidth: 260, color: C.text,
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={search ? `No results for "${search}"` : 'No menu items found.'} />
      ) : (
        <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bgSoft, borderBottom: `2px solid ${C.border}` }}>
                {['ITEM', 'RESTAURANT', 'CATEGORY', 'PRICE', 'VEG', 'AVAILABLE'].map(h => (
                  <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={`${item._id}-${idx}`}
                  style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px', fontSize: 13, fontWeight: 600, color: C.text, maxWidth: 220 }}>
                    {item.name}
                    {item.description && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px', fontSize: 13, color: C.textMid }}>
                    {item.restaurantName}
                    {!item.restaurantActive && (
                      <span style={{ fontSize: 10, color: C.red, marginLeft: 6, fontWeight: 600 }}>[Inactive]</span>
                    )}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
                      color: catColor(item.category), background: catColor(item.category) + '18',
                      textTransform: 'capitalize',
                    }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px', fontSize: 14, fontWeight: 700, color: C.amber }}>
                    ₹{item.price}
                  </td>
                  <td style={{ padding: '14px', fontSize: 16 }}>
                    {item.isVeg ? '🟢' : '🔴'}
                  </td>
                  <td style={{ padding: '14px', fontSize: 13 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
                      color: item.isAvailable ? C.green : C.red,
                      background: (item.isAvailable ? C.green : C.red) + '18',
                    }}>
                      {item.isAvailable ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setTab] = useState('Analytics');

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/admin/login');
  }, [logout, navigate]);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #D4C4B0; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        background: C.bgCard, borderBottom: `1px solid ${C.border}`,
        padding: '0 5%', height: 68, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}></span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text }}>
            Table<span style={{ color: C.amber }}>Mint</span>
          </span>
          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 6, fontWeight: 500 }}>Admin Panel</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setTab(tab)} style={{
              padding: '7px 18px', borderRadius: 100, border: 'none',
              background: activeTab === tab ? C.amber : 'transparent',
              color: activeTab === tab ? '#fff' : C.textMuted,
              fontWeight: activeTab === tab ? 700 : 500, fontSize: 13,
              cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.background = C.bgSoft; }}
              onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.background = 'transparent'; }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: C.amberSoft, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.amber,
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span style={{ fontSize: 13, color: C.textMid, fontWeight: 500 }}>{user?.name || 'Admin'}</span>
          <button onClick={handleLogout} style={{
            padding: '7px 16px', background: 'transparent',
            border: `1.5px solid ${C.border}`, borderRadius: 10,
            color: C.textMid, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'DM Sans', sans-serif",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <div style={{ padding: '36px 5%', maxWidth: 1400, margin: '0 auto' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Tab content */}
        {activeTab === 'Analytics' && <AnalyticsTab />}
        {activeTab === 'Reviews' && <ReviewsTab />}
        {activeTab === 'Reservations' && <ReservationsTab />}
        {activeTab === 'Menu' && <MenuTab />}
      </div>
    </div>
  );
}
