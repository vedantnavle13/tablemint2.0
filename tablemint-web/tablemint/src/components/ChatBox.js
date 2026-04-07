import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../services/api';
import PollComponent from './PollComponent';

// ── Avatar colour helper ───────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#3b82f6', '#6366f1'],
  ['#10b981', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#ec4899', '#f43f5e'],
  ['#06b6d4', '#3b82f6'],
];
function getAvatarColors(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Animation keyframes injected once ─────────────────────────────────────────
const KEYFRAMES = `
  @keyframes cbSlideUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes cbFadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes cbSpin      { to   { transform:rotate(360deg); } }
  @keyframes cbPulse     { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
`;

// ── Tiny icon helpers ─────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const IconClose = ({ size = 18 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconPoll = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

// ── Restaurant Card (in chat) ─────────────────────────────────────────────────
function RestaurantCard({ r, isMe, navigate }) {
  const [hovered, setHovered] = useState(false);
  const rid = r?.restaurantId?.toString?.() || r?.restaurantId;
  return (
    <div
      onClick={() => rid && navigate(`/restaurant/${rid}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 260, background: '#fff',
        borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        overflow: 'hidden',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.18)' : '0 2px 10px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        cursor: rid ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ height: 130, background: '#f3f4f6', position: 'relative', overflow: 'hidden' }}>
        {r?.image ? (
          <img src={r.image} alt={r?.name || 'Restaurant'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hovered ? 'scale(1.06)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍽️</div>
        )}
        {r?.rating > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: '#fbbf24', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
            ★ {Number(r.rating).toFixed(1)}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r?.name || 'Restaurant'}
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {r?.cuisine && <span>{r.cuisine}</span>}
          {r?.cuisine && r?.price && <span style={{ color: '#d1d5db' }}>·</span>}
          {r?.price && <span style={{ color: '#D4883A', fontWeight: 600 }}>{r.price}</span>}
        </p>
        <div style={{ marginTop: 10, padding: '7px 0 0', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Tap to view →</span>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', borderRadius: 6, padding: '3px 8px', letterSpacing: 0.2 }}>
            View Details
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Poll Modal ─────────────────────────────────────────────────────────
function CreatePollModal({ onClose, onLaunch, sharedRestaurants }) {
  const [question, setQuestion]             = useState('Where should we go tonight?');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [searching, setSearching]           = useState(false);
  const [manualName, setManualName]         = useState('');
  const [launching, setLaunching]           = useState(false);
  const questionRef = useRef(null);

  // Auto-pre-select restaurants already shared in the group chat
  useEffect(() => {
    if (sharedRestaurants?.length > 0) {
      // Deduplicate by restaurantId
      const unique = [];
      const seen = new Set();
      sharedRestaurants.forEach(r => {
        const id = String(r.restaurantId);
        if (!seen.has(id)) { seen.add(id); unique.push(r); }
      });
      setSelectedOptions(unique.slice(0, 6));
    }
    questionRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiCall(`/restaurants?search=${encodeURIComponent(searchQuery)}&limit=8`);
      const list = Array.isArray(res.data) ? res.data : res.data?.restaurants || [];
      setSearchResults(list);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleOption = (r) => {
    const rid = String(r._id || r.restaurantId);
    const isSelected = selectedOptions.some(o => String(o.restaurantId || o._id) === rid);
    if (isSelected) {
      setSelectedOptions(prev => prev.filter(o => String(o.restaurantId || o._id) !== rid));
    } else {
      if (selectedOptions.length >= 6) return; // max 6
      setSelectedOptions(prev => [...prev, {
        restaurantId: r._id || r.restaurantId,
        name: r.name,
        image: r.images?.[0] || r.image || '',
        rating: r.averageRating || r.rating || 0,
        cuisine: Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine || '',
      }]);
    }
  };

  const addManualOption = () => {
    if (!manualName.trim() || selectedOptions.length >= 6) return;
    // Give it a temporary fake id
    const fakeId = `manual_${Date.now()}`;
    setSelectedOptions(prev => [...prev, {
      restaurantId: fakeId,
      name: manualName.trim(),
      image: '',
      rating: 0,
      cuisine: '',
    }]);
    setManualName('');
  };

  const removeOption = (rid) => {
    setSelectedOptions(prev => prev.filter(o => String(o.restaurantId) !== String(rid)));
  };

  const handleLaunch = () => {
    if (!question.trim() || selectedOptions.length < 2 || launching) return;
    setLaunching(true);
    onLaunch({ question: question.trim(), restaurantOptions: selectedOptions });
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)', zIndex: 100,
          animation: 'cbFadeIn 0.18s ease',
        }}
      />

      {/* Modal card */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, 95vw)',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        zIndex: 101,
        animation: 'cbSlideUp 0.22s ease',
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* ── Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
          }}>
            🗳️
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827' }}>Create a Poll</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Let your group vote on where to eat</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
          >
            <IconClose size={14} />
          </button>
        </div>

        {/* ── Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Question */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Poll Question
            </label>
            <input
              ref={questionRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Where should we eat tonight?"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', fontSize: 14, fontWeight: 500,
                border: '1.5px solid #e5e7eb', borderRadius: 12,
                outline: 'none', fontFamily: 'inherit', color: '#111827',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Selected options */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Poll Options ({selectedOptions.length}/6)
              </label>
              {selectedOptions.length < 2 && (
                <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>Add at least 2 options</span>
              )}
            </div>

            {selectedOptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🍽️</div>
                No options yet — search restaurants below or add a custom option
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedOptions.map((opt, i) => (
                  <div key={String(opt.restaurantId) + i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 12,
                    background: '#f9fafb', border: '1.5px solid #e5e7eb',
                  }}>
                    {opt.image ? (
                      <img src={opt.image} alt={opt.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🍽️</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.name}</p>
                      {opt.cuisine && <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{opt.cuisine}</p>}
                    </div>
                    <button
                      onClick={() => removeOption(opt.restaurantId)}
                      style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      title="Remove option"
                    >
                      <IconClose size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search for restaurants */}
          {selectedOptions.length < 6 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Search Restaurants to Add
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <IconSearch />
                  </span>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchRestaurants()}
                    placeholder="Search restaurant name..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '9px 12px 9px 34px', fontSize: 13,
                      border: '1.5px solid #e5e7eb', borderRadius: 10,
                      outline: 'none', fontFamily: 'inherit', color: '#1f2937',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <button
                  onClick={searchRestaurants}
                  style={{
                    padding: '9px 16px', background: '#1f2937', color: '#fff', border: 'none',
                    borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                    flexShrink: 0,
                  }}
                >
                  {searching ? (
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'cbSpin 0.8s linear infinite' }} />
                  ) : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid #f3f4f6', borderRadius: 12, padding: 8 }}>
                  {searchResults.map(r => {
                    const rid = String(r._id);
                    const isSelected = selectedOptions.some(o => String(o.restaurantId) === rid);
                    return (
                      <div
                        key={rid}
                        onClick={() => toggleOption(r)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                          background: isSelected ? '#eff6ff' : 'transparent',
                          border: `1.5px solid ${isSelected ? '#93c5fd' : 'transparent'}`,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {(r.images?.[0] || r.image) && (
                          <img src={r.images?.[0] || r.image} alt={r.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine}</p>
                        </div>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: isSelected ? '#2563eb' : '#e5e7eb',
                          color: isSelected ? '#fff' : '#9ca3af',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {isSelected ? (
                            <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          ) : (
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {searchQuery && !searching && searchResults.length === 0 && (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, margin: '8px 0 0' }}>No results. Try a different name.</p>
              )}
            </div>
          )}

          {/* Manual option */}
          {selectedOptions.length < 6 && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Add Custom Option
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualOption()}
                  placeholder="e.g. Home-cooked dinner"
                  style={{
                    flex: 1, padding: '9px 12px', fontSize: 13,
                    border: '1.5px solid #e5e7eb', borderRadius: 10,
                    outline: 'none', fontFamily: 'inherit', color: '#1f2937',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  onClick={addManualOption}
                  disabled={!manualName.trim()}
                  style={{
                    padding: '9px 14px', borderRadius: 10,
                    border: '1.5px solid #e5e7eb', background: manualName.trim() ? '#2563eb' : '#f3f4f6',
                    color: manualName.trim() ? '#fff' : '#9ca3af',
                    fontSize: 13, fontWeight: 600, cursor: manualName.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  }}
                >
                  <IconPlus /> Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Buttons */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex', gap: 10, flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: '0 0 auto', padding: '11px 20px',
              borderRadius: 12, border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#374151',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={selectedOptions.length < 2 || !question.trim() || launching}
            style={{
              flex: 1, padding: '11px 0',
              borderRadius: 12, border: 'none',
              background: selectedOptions.length >= 2 && question.trim() && !launching
                ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                : '#e5e7eb',
              color: selectedOptions.length >= 2 && question.trim() && !launching ? '#fff' : '#9ca3af',
              fontSize: 14, fontWeight: 700,
              cursor: selectedOptions.length >= 2 && question.trim() && !launching ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              boxShadow: selectedOptions.length >= 2 && question.trim() && !launching
                ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
            onMouseEnter={e => { if (selectedOptions.length >= 2 && question.trim() && !launching) e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.5)'; }}
            onMouseLeave={e => { if (!launching) e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.4)'; }}
          >
            {launching ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'cbSpin 0.8s linear infinite' }} />
                Launching…
              </>
            ) : (
              <>🚀 Launch Poll ({selectedOptions.length} options)</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main ChatBox ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function ChatBox({ messages, currentUser, socket, groupId }) {
  const navigate = useNavigate();
  const [text, setText]                   = useState('');
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showPollModal, setShowPollModal]  = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState([]);
  const [searching, setSearching]         = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Extract restaurants already shared in this group chat ──────────────────
  const sharedRestaurants = messages
    .filter(m => m.type === 'restaurant_share' && m.restaurantData)
    .map(m => m.restaurantData);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const sendText = () => {
    if (!text.trim() || !socket) return;
    socket.emit('sendMessage', { groupId, text, type: 'text' });
    setText('');
  };

  const searchRestaurants = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiCall(`/restaurants?search=${encodeURIComponent(searchQuery)}&limit=7`);
      const list = Array.isArray(res.data) ? res.data : res.data?.restaurants || [];
      setSearchResults(list);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const shareRestaurants = () => {
    if (!socket || selectedRestaurants.length === 0) return;
    selectedRestaurants.forEach(r => {
      socket.emit('sendMessage', {
        groupId, type: 'restaurant_share',
        restaurantData: {
          restaurantId: r._id,
          name: r.name,
          image: r.images?.[0] || r.image || '',
          rating: r.averageRating || r.rating || 0,
          cuisine: Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine || '',
          price: r.price || r.priceRange || '',
        },
      });
    });
    resetSharePanel();
  };

  const launchPoll = ({ question, restaurantOptions }) => {
    if (!socket) return;
    socket.emit('createPoll', { groupId, question, restaurantOptions });
    setShowPollModal(false);
  };

  const resetSharePanel = () => {
    setSelectedRestaurants([]);
    setShowSharePanel(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  const toggleSelect = (r) => {
    setSelectedRestaurants(prev =>
      prev.find(x => x._id === r._id) ? prev.filter(x => x._id !== r._id) : [...prev, r]
    );
  };

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

        {/* ── Messages area ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
              <span style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '8px 18px', color: '#6b7280', fontSize: 13, fontWeight: 500, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
                Say hi to start planning! 👋
              </span>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isMe       = (msg.sender?._id || msg.sender) === currentUser?._id;
            const prevSender = idx > 0 ? (messages[idx - 1].sender?._id || messages[idx - 1].sender) : null;
            const currSender = msg.sender?._id || msg.sender;
            const showName   = !isMe && prevSender !== currSender;
            const [from, to] = getAvatarColors(msg.sender?.name || '');

            // ── POLL ───────────────────────────────────────────────────────
            if (msg.type === 'poll') {
              return (
                <div key={msg._id || idx} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0', animation: 'cbSlideUp 0.25s ease' }}>
                  <div style={{ width: '100%', maxWidth: 420 }}>
                    {msg.sender?.name && (
                      <p style={{ margin: '0 0 8px 6px', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                        {isMe ? 'You' : msg.sender.name} created a poll
                      </p>
                    )}
                    <PollComponent poll={msg.pollId} socket={socket} currentUser={currentUser} />
                  </div>
                </div>
              );
            }

            // ── RESTAURANT SHARE ────────────────────────────────────────────
            if (msg.type === 'restaurant_share') {
              const r = msg.restaurantData;
              return (
                <div key={msg._id || idx} style={{
                  display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-end', gap: 8, marginBottom: 6,
                  animation: 'cbSlideUp 0.2s ease',
                }}>
                  {!isMe && (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${from}, ${to})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 11,
                      visibility: showName ? 'visible' : 'hidden',
                    }}>
                      {(msg.sender?.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 4 }}>
                    {showName && (
                      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginLeft: 2 }}>
                        {msg.sender?.name}
                      </span>
                    )}
                    <RestaurantCard r={r} isMe={isMe} navigate={navigate} />
                    <span style={{ fontSize: 10, color: '#9ca3af', alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 1 }}>
                      {formatTime(msg.createdAt)} · {isMe ? 'You shared' : `${msg.sender?.name || 'Someone'} shared`}
                    </span>
                  </div>
                </div>
              );
            }

            // ── TEXT MESSAGE ────────────────────────────────────────────────
            return (
              <div key={msg._id || idx} style={{
                display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 8, marginBottom: 2,
                animation: 'cbSlideUp 0.18s ease',
              }}>
                {!isMe && (
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${from}, ${to})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 11,
                    visibility: showName ? 'visible' : 'hidden',
                  }}>
                    {(msg.sender?.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '68%' }}>
                  {showName && (
                    <span style={{ fontSize: 11, color: '#6b7280', marginBottom: 3, fontWeight: 600 }}>
                      {msg.sender?.name}
                    </span>
                  )}
                  <div style={{
                    padding: '9px 14px',
                    background: isMe ? '#2563eb' : '#fff',
                    color: isMe ? '#fff' : '#111827',
                    borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                    fontSize: 15, lineHeight: 1.45,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    border: isMe ? 'none' : '1px solid #e5e7eb',
                    wordBreak: 'break-word',
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* ── Share-restaurant slide-up panel ─────────────────────────────── */}
        {showSharePanel && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, right: 0,
            background: '#fff', borderTop: '1px solid #e5e7eb',
            padding: 16, boxShadow: '0 -8px 24px rgba(0,0,0,0.09)', zIndex: 20,
            animation: 'cbSlideUp 0.2s ease',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>📍 Share a Restaurant</span>
              <button onClick={resetSharePanel} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <IconClose size={16} />
              </button>
            </div>

            {/* Search bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                  <IconSearch />
                </span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchRestaurants()}
                  placeholder="Search a restaurant to share..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 24, outline: 'none', fontFamily: 'inherit', color: '#1f2937' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <button
                onClick={searchRestaurants}
                style={{ background: '#1f2937', color: '#fff', border: 'none', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                {searching ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'cbSpin 0.7s linear infinite' }} /> : 'Search'}
              </button>
            </div>

            {/* Results */}
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searchResults.length === 0 && searchQuery && !searching && (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, margin: '8px 0' }}>No results found.</p>
              )}
              {searchResults.map(r => {
                const isSelected = selectedRestaurants.some(x => x._id === r._id);
                return (
                  <div
                    key={r._id}
                    onClick={() => toggleSelect(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderRadius: 10, cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      border: `1.5px solid ${isSelected ? '#93c5fd' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {(r.images?.[0] || r.image) && <img src={r.images?.[0] || r.image} alt={r.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine}</p>
                    </div>
                    {isSelected && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            {selectedRestaurants.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                <button
                  onClick={shareRestaurants}
                  style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Share ({selectedRestaurants.length})
                </button>
                <button
                  onClick={resetSharePanel}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: '0 8px', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Input bar ───────────────────────────────────────────────────── */}
        <div style={{
          background: '#f0f2f5', borderTop: '1px solid rgba(0,0,0,0.08)',
          padding: '10px 14px', display: 'flex', alignItems: 'center',
          gap: 8, flexShrink: 0, zIndex: 10,
        }}>
          {/* Share restaurant button */}
          <button
            onClick={() => { setShowSharePanel(v => !v); }}
            title="Share a restaurant"
            style={{
              width: 38, height: 38, borderRadius: '50%', border: 'none',
              background: showSharePanel ? '#eff6ff' : 'transparent',
              color: showSharePanel ? '#2563eb' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!showSharePanel) e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={e => { if (!showSharePanel) e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>

          {/* ── Create Poll button ─── */}
          <button
            onClick={() => { setShowSharePanel(false); setShowPollModal(true); }}
            title="Create a poll"
            style={{
              height: 36, borderRadius: 20, border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#374151',
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 12px', cursor: 'pointer', flexShrink: 0,
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.color = '#2563eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
          >
            <IconPoll />
            Poll
          </button>

          {/* Message input pill */}
          <div style={{
            flex: 1, background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 28, display: 'flex', alignItems: 'center',
            padding: '4px 8px 4px 4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', gap: 4,
          }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
              placeholder="Type a message..."
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 15,
                color: '#1f2937', background: 'transparent',
                padding: '8px 6px 8px 10px', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={sendText}
            disabled={!text.trim()}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: text.trim() ? '#2563eb' : '#e5e7eb',
              color: text.trim() ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0, transition: 'all 0.2s',
              boxShadow: text.trim() ? '0 2px 8px rgba(37,99,235,0.4)' : 'none',
            }}
            onMouseEnter={e => { if (text.trim()) { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = text.trim() ? '#2563eb' : '#e5e7eb'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ transform: 'translateX(1px) translateY(-1px)' }}>
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Poll creation modal (portal-like, rendered outside flex column) ── */}
      {showPollModal && (
        <CreatePollModal
          onClose={() => setShowPollModal(false)}
          onLaunch={launchPoll}
          sharedRestaurants={sharedRestaurants}
        />
      )}
    </>
  );
}