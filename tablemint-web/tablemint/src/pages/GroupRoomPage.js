import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';
import ChatBox from '../components/ChatBox';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const AVATAR_COLORS = [
    ['#6366f1', '#8b5cf6'], // purple
    ['#3b82f6', '#6366f1'], // blue-indigo
    ['#10b981', '#14b8a6'], // emerald-teal
    ['#f59e0b', '#f97316'], // amber-orange
    ['#ec4899', '#f43f5e'], // pink-rose
    ['#06b6d4', '#3b82f6'], // cyan-blue
];

function getAvatarColors(name = '') {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name = '', size = 40, style = {} }) {
    const [from, to] = getAvatarColors(name);
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `linear-gradient(135deg, ${from}, ${to})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            ...style,
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

export default function GroupRoomPage() {
    const { id: groupId } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [socket, setSocket] = useState(null); // state so ChatBox always gets live instance
    const socketRef = useRef(null);

    const goBack = useCallback(() => navigate('/groups'), [navigate]);

    // Refetch messages when user returns to this tab (catches shares made from other pages)
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && groupId) {
                apiCall(`/groups/${groupId}/messages`)
                    .then(res => setMessages(res.data))
                    .catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [groupId]);

    useEffect(() => {
        let socket;

        const init = async () => {
            try {
                const [groupRes, msgRes] = await Promise.all([
                    apiCall(`/groups/${groupId}`),
                    apiCall(`/groups/${groupId}/messages`)
                ]);
                setGroup(groupRes.data);
                setMessages(msgRes.data);
            } catch (err) {
                console.error('Failed to load group:', err);
                navigate('/groups');
                return;
            } finally {
                setLoading(false);
            }

            socket = io(SOCKET_URL, { auth: { token } });
            socketRef.current = socket;
            setSocket(socket); // expose to ChatBox via state

            socket.on('connect', () => {
                setIsConnected(true);
                socket.emit('joinGroup', { groupId });
            });
            socket.on('disconnect', () => setIsConnected(false));

            // Handle ALL incoming message types (text, restaurant_share, poll)
            socket.on('newMessage', (msg) => {
                setMessages((prev) => {
                    // Deduplicate by _id (REST share + socket broadcast both fire)
                    if (msg._id && prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
            });

            socket.on('pollUpdated', (updatedPoll) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.pollId?._id === updatedPoll._id ? { ...m, pollId: updatedPoll } : m
                    )
                );
            });

            socket.on('error', (err) => console.error('Socket error:', err.message));
        };

        if (token) init();
        return () => { socket?.disconnect(); };
    }, [groupId, token, navigate]);

    // ── Loading screen ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100vh', background: '#f8f9fa',
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: '4px solid #e5e7eb', borderTopColor: '#3b82f6',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ marginTop: 16, color: '#9ca3af', fontWeight: 500, fontFamily: 'system-ui, sans-serif' }}>
                    Loading group...
                </p>
            </div>
        );
    }

    if (!group) return null;

    const [fromColor] = getAvatarColors(group.name);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
            background: '#f0f2f5', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}>

            {/* ── Top Header ──────────────────────────────────────────────────── */}
            <header style={{
                background: '#fff', borderBottom: '1px solid #e5e7eb',
                padding: '0 16px', height: 64, display: 'flex', alignItems: 'center',
                gap: 12, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', zIndex: 20,
            }}>
                {/* Back button */}
                <button onClick={goBack} style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6b7280', transition: 'background 0.15s',
                    flexShrink: 0,
                }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                {/* Group avatar */}
                <Avatar name={group.name} size={40} />

                {/* Group info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{
                        margin: 0, fontSize: 17, fontWeight: 700, color: '#111827',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        lineHeight: 1.2
                    }}>
                        {group.name}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: isConnected ? '#22c55e' : '#f59e0b',
                            boxShadow: isConnected ? '0 0 0 2px #dcfce7' : '0 0 0 2px #fef9c3',
                        }} />
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                            {isConnected ? 'Online' : 'Connecting...'} &bull; {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Stacked member avatars */}
                <div style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}>
                    {group.members.slice(0, 4).map((m, i) => {
                        const [from, to] = getAvatarColors(m.name);
                        return (
                            <div key={m._id} title={m.name} style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: `linear-gradient(135deg, ${from}, ${to})`,
                                border: '2px solid #fff', marginLeft: i === 0 ? 0 : -8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: 10,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                            }}>
                                {m.name.charAt(0).toUpperCase()}
                            </div>
                        );
                    })}
                    {group.members.length > 4 && (
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb',
                            border: '2px solid #fff', marginLeft: -8, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#6b7280', fontWeight: 700, fontSize: 10,
                        }}>
                            +{group.members.length - 4}
                        </div>
                    )}
                </div>

                {/* Three-dot menu */}
                <button style={{
                    width: 36, height: 36, borderRadius: '50%', border: 'none',
                    background: 'none', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#9ca3af',
                    flexShrink: 0,
                }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </header>

            {/* ── Main content ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Chat section */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, background: '#efeae2' }}>
                    <ChatBox
                        messages={messages}
                        currentUser={user}
                        socket={socket}
                        groupId={groupId}
                    />
                </div>

                {/* Members sidebar */}
                <aside style={{
                    width: 272, background: '#fff', borderLeft: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', flexShrink: 0,
                    // Hide on small screens via media query workaround — inline styles can't do it,
                    // so we always render but the layout still works on mobile by just showing chat
                }}>
                    <div style={{
                        padding: '20px 20px 12px', borderBottom: '1px solid #f3f4f6',
                    }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>
                            Members &mdash; {group.members.length}
                        </p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
                        {group.members.map((m) => {
                            const isMe = m._id === user?._id;
                            const [from, to] = getAvatarColors(m.name);
                            return (
                                <div key={m._id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 10px', borderRadius: 12, cursor: 'default',
                                    transition: 'background 0.15s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                        background: `linear-gradient(135deg, ${from}, ${to})`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontWeight: 700, fontSize: 14,
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                    }}>
                                        {m.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <p style={{
                                                margin: 0, fontSize: 14, fontWeight: 600,
                                                color: '#1f2937', whiteSpace: 'nowrap',
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {m.name}
                                            </p>
                                            {isMe && (
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, color: '#3b82f6',
                                                    background: '#eff6ff', borderRadius: 4,
                                                    padding: '1px 5px', letterSpacing: 0.5,
                                                }}>
                                                    YOU
                                                </span>
                                            )}
                                        </div>
                                        <p style={{
                                            margin: 0, fontSize: 11, color: '#9ca3af',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {m.email}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{
                        padding: '12px 20px', borderTop: '1px solid #f3f4f6',
                        background: '#fafafa',
                    }}>
                        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                            Created by{' '}
                            <span style={{ fontWeight: 600, color: '#6b7280' }}>
                                {group.createdBy?.name || 'Unknown'}
                            </span>
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
