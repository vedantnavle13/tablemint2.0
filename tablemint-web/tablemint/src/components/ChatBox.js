import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../services/api';
import PollComponent from './PollComponent';

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Restaurant share card ──────────────────────────────────────────────────────
function RestaurantCard({ r, isMe, navigate }) {
    const [hovered, setHovered] = useState(false);
    const rid = r?.restaurantId?.toString?.() || r?.restaurantId;

    return (
        <div
            onClick={() => rid && navigate(`/restaurant/${rid}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 260,
                background: '#fff',
                borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                overflow: 'hidden',
                boxShadow: hovered
                    ? '0 8px 24px rgba(0,0,0,0.18)'
                    : '0 2px 10px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                cursor: rid ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                transform: hovered ? 'translateY(-2px)' : 'none',
            }}
        >
            {/* Image */}
            <div style={{ height: 130, background: '#f3f4f6', position: 'relative', overflow: 'hidden' }}>
                {r?.image ? (
                    <img
                        src={r.image}
                        alt={r?.name || 'Restaurant'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍽️</div>
                )}
                {/* Rating badge */}
                {r?.rating > 0 && (
                    <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                        color: '#fbbf24', fontSize: 12, fontWeight: 700,
                        padding: '3px 8px', borderRadius: 20,
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        ★ {Number(r.rating).toFixed(1)}
                    </div>
                )}
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />
            </div>

            {/* Body */}
            <div style={{ padding: '10px 12px 12px' }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r?.name || 'Restaurant'}
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {r?.cuisine && <span>{r.cuisine}</span>}
                    {r?.cuisine && r?.price && <span style={{ color: '#d1d5db' }}>·</span>}
                    {r?.price && <span style={{ color: '#D4883A', fontWeight: 600 }}>{r.price}</span>}
                </p>

                <div style={{
                    marginTop: 10, padding: '7px 0 0', borderTop: '1px solid #f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Tap to view →</span>
                    <div style={{
                        fontSize: 11, fontWeight: 700, color: '#2563eb',
                        background: '#eff6ff', borderRadius: 6,
                        padding: '3px 8px', letterSpacing: 0.2,
                    }}>
                        View Details
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main ChatBox component ─────────────────────────────────────────────────────
export default function ChatBox({ messages, currentUser, socket, groupId }) {
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [showPollBuilder, setShowPollBuilder] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedRestaurants, setSelectedRestaurants] = useState([]);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendText = () => {
        if (!text.trim() || !socket) return;
        socket.emit('sendMessage', { groupId, text, type: 'text' });
        setText('');
    };

    const searchRestaurants = async () => {
        if (!searchQuery.trim()) return;
        try {
            const res = await apiCall(`/restaurants?search=${encodeURIComponent(searchQuery)}&limit=6`);
            const list = Array.isArray(res.data) ? res.data : res.data?.restaurants || [];
            setSearchResults(list);
        } catch {
            setSearchResults([]);
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
        resetPicker();
    };

    const launchPoll = () => {
        if (!socket || selectedRestaurants.length < 2) return;
        socket.emit('createPoll', {
            groupId,
            question: 'Where should we go?',
            restaurantOptions: selectedRestaurants.map(r => ({
                restaurantId: r._id,
                name: r.name,
                image: r.images?.[0] || r.image || '',
                rating: r.averageRating || r.rating || 0,
                cuisine: Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine || '',
            })),
        });
        resetPicker();
    };

    const resetPicker = () => {
        setSelectedRestaurants([]);
        setShowPicker(false);
        setShowPollBuilder(false);
        setSearchResults([]);
        setSearchQuery('');
    };

    const toggleSelect = (r) => {
        setSelectedRestaurants(prev =>
            prev.find(x => x._id === r._id) ? prev.filter(x => x._id !== r._id) : [...prev, r]
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

            {/* ── Messages area ─────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {messages.length === 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
                        <span style={{ background: 'rgba(0,0,0,0.07)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '8px 18px', color: '#6b7280', fontSize: 13, fontWeight: 500 }}>
                            Say hi to start planning! 👋
                        </span>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isMe = (msg.sender?._id || msg.sender) === currentUser?._id;
                    const prevSender = idx > 0 ? (messages[idx - 1].sender?._id || messages[idx - 1].sender) : null;
                    const currSender = msg.sender?._id || msg.sender;
                    const showName = !isMe && prevSender !== currSender;
                    const [from, to] = getAvatarColors(msg.sender?.name || '');

                    // ── POLL ─────────────────────────────────────────────────
                    if (msg.type === 'poll') {
                        return (
                            <div key={msg._id || idx} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                                <PollComponent poll={msg.pollId} socket={socket} currentUser={currentUser} />
                            </div>
                        );
                    }

                    // ── RESTAURANT SHARE ──────────────────────────────────────
                    if (msg.type === 'restaurant_share') {
                        const r = msg.restaurantData;
                        return (
                            <div key={msg._id || idx} style={{
                                display: 'flex',
                                flexDirection: isMe ? 'row-reverse' : 'row',
                                alignItems: 'flex-end', gap: 8, marginBottom: 6,
                            }}>
                                {/* Avatar for others */}
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
                                    {/* The restaurant card itself */}
                                    <RestaurantCard r={r} isMe={isMe} navigate={navigate} />
                                    <span style={{ fontSize: 10, color: '#9ca3af', alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 1 }}>
                                        {formatTime(msg.createdAt)} · {isMe ? 'You shared' : `${msg.sender?.name || 'Someone'} shared`}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // ── TEXT MESSAGE ──────────────────────────────────────────
                    return (
                        <div key={msg._id || idx} style={{
                            display: 'flex',
                            flexDirection: isMe ? 'row-reverse' : 'row',
                            alignItems: 'flex-end', gap: 8, marginBottom: 2,
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

            {/* ── Restaurant / Poll picker panel ───────────────────────────── */}
            {(showPicker || showPollBuilder) && (
                <div style={{
                    position: 'absolute', bottom: '100%', left: 0, right: 0,
                    background: '#fff', borderTop: '1px solid #e5e7eb',
                    padding: 16, boxShadow: '0 -8px 24px rgba(0,0,0,0.08)', zIndex: 20,
                }}>
                    {showPicker && !showPollBuilder && (
                        <>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchRestaurants()} placeholder="Search a restaurant to share..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 36px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 24, outline: 'none', fontFamily: 'inherit', color: '#1f2937' }} />
                                </div>
                                <button onClick={searchRestaurants} style={{ background: '#1f2937', color: '#fff', border: 'none', borderRadius: 24, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Search</button>
                            </div>

                            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {searchResults.length === 0 && searchQuery && (
                                    <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, margin: '12px 0' }}>No results found.</p>
                                )}
                                {searchResults.map(r => {
                                    const isSelected = selectedRestaurants.some(x => x._id === r._id);
                                    return (
                                        <div key={r._id} onClick={() => toggleSelect(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', background: isSelected ? '#eff6ff' : 'transparent', border: `1.5px solid ${isSelected ? '#93c5fd' : 'transparent'}`, transition: 'all 0.15s' }}>
                                            {(r.images?.[0] || r.image) && <img src={r.images?.[0] || r.image} alt={r.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                                                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine}</p>
                                            </div>
                                            {isSelected && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563eb', color: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedRestaurants.length > 0 && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                                    <button onClick={shareRestaurants} style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                        Share ({selectedRestaurants.length})
                                    </button>
                                    {selectedRestaurants.length >= 2 && (
                                        <button onClick={() => { setShowPollBuilder(true); setShowPicker(false); }} style={{ flex: 1, background: '#fff', color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                            Create Poll
                                        </button>
                                    )}
                                    <button onClick={resetPicker} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: '0 8px', fontFamily: 'inherit' }}>Cancel</button>
                                </div>
                            )}
                        </>
                    )}

                    {showPollBuilder && (
                        <>
                            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14, color: '#111827' }}>Launch a poll with {selectedRestaurants.length} options?</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                                {selectedRestaurants.map(r => (
                                    <span key={r._id} style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, border: '1px solid #bfdbfe' }}>{r.name}</span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={launchPoll} style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}>
                                    🚀 Launch Poll
                                </button>
                                <button onClick={resetPicker} style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Input bar ─────────────────────────────────────────────────── */}
            <div style={{ background: '#f0f2f5', borderTop: '1px solid rgba(0,0,0,0.08)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, zIndex: 10 }}>
                {/* Plus button (restaurant picker) */}
                <button
                    onClick={() => { setShowPicker(v => !v); setShowPollBuilder(false); }}
                    style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: (showPicker || showPollBuilder) ? '#eff6ff' : 'none', color: (showPicker || showPollBuilder) ? '#2563eb' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                    title="Share restaurant or create poll"
                >
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>

                {/* Input pill */}
                <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 28, display: 'flex', alignItems: 'center', padding: '4px 8px 4px 4px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', gap: 4 }}>
                    <button style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendText()} placeholder="Type a message..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1f2937', background: 'transparent', padding: '8px 10px', fontFamily: 'inherit' }} />
                </div>

                {/* Send button */}
                <button onClick={sendText} disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: text.trim() ? '#2563eb' : '#e5e7eb', color: text.trim() ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.2s', boxShadow: text.trim() ? '0 2px 8px rgba(37,99,235,0.4)' : 'none' }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ transform: 'translateX(1px) translateY(-1px)' }}>
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}