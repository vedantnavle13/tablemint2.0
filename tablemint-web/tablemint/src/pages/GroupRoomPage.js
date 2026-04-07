import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../services/api';
import ChatBox from '../components/ChatBox';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// ── Keyframes injected once ────────────────────────────────────────────────────
const KF = `
  @keyframes grpSpin    { to   { transform: rotate(360deg); } }
  @keyframes grpSlideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes grpFadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes grpToastIn { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
`;

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    ['#6366f1', '#8b5cf6'], ['#3b82f6', '#6366f1'], ['#10b981', '#14b8a6'],
    ['#f59e0b', '#f97316'], ['#ec4899', '#f43f5e'], ['#06b6d4', '#3b82f6'],
];
function getAvatarColors(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function Avatar({ name = '', size = 36, style = {} }) {
    const [f, t] = getAvatarColors(name);
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `linear-gradient(135deg, ${f}, ${t})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', ...style,
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fa', fontFamily: "'Inter',system-ui,sans-serif" }}>
            <style>{KF}</style>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#3b82f6', animation: 'grpSpin 0.8s linear infinite' }} />
            <p style={{ marginTop: 16, color: '#9ca3af', fontWeight: 500 }}>Loading group…</p>
        </div>
    );
}

// ── Toast notification ─────────────────────────────────────────────────────────
function Toast({ toasts }) {
    return (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    background: t.type === 'error' ? '#1f2937' : t.type === 'success' ? '#166534' : '#1f2937',
                    color: '#fff', padding: '10px 20px', borderRadius: 12,
                    fontSize: 13, fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    animation: 'grpToastIn 0.25s ease',
                    border: `1px solid ${t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#22c55e' : '#374151'}`,
                }}>
                    {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'} {t.message}
                </div>
            ))}
        </div>
    );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ onClose, children, width = 480 }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(4px)', zIndex: 200, animation: 'grpFadeIn 0.18s ease' }} />
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: `min(${width}px, 95vw)`, background: '#fff', borderRadius: 20,
                boxShadow: '0 20px 60px rgba(0,0,0,0.22)', zIndex: 201,
                animation: 'grpSlideUp 0.22s ease', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
            }}>
                {children}
            </div>
        </>
    );
}

function ModalHeader({ title, subtitle, emoji, onClose }) {
    return (
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {emoji && (
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                    {emoji}
                </div>
            )}
            <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827' }}>{title}</h2>
                {subtitle && <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'} onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
}

// ── Btn helper ────────────────────────────────────────────────────────────────
function Btn({ onClick, disabled, variant = 'primary', loading, children, style = {} }) {
    const base = { padding: '10px 18px', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: disabled || loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 6, border: 'none', opacity: disabled ? 0.55 : 1, ...style };
    const variants = {
        primary: { background: disabled ? '#e5e7eb' : 'linear-gradient(135deg,#2563eb,#7c3aed)', color: disabled ? '#9ca3af' : '#fff', boxShadow: disabled ? 'none' : '0 3px 12px rgba(37,99,235,0.35)' },
        ghost: { background: '#f3f4f6', color: '#374151', boxShadow: 'none' },
        danger: { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', boxShadow: 'none' },
    };
    return (
        <button onClick={onClick} disabled={disabled || loading} style={{ ...base, ...variants[variant] }}>
            {loading && <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'grpSpin 0.75s linear infinite' }} />}
            {children}
        </button>
    );
}

// ── Styled input ──────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text', onKeyDown }) {
    return (
        <div style={{ marginBottom: 16 }}>
            {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</label>}
            <input value={value} onChange={onChange} placeholder={placeholder} type={type} onKeyDown={onKeyDown}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 11, outline: 'none', fontFamily: 'inherit', color: '#111827', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Edit Group Name Modal ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function EditNameModal({ group, onClose, onSuccess, addToast }) {
    const [name, setName] = useState(group.name);
    const [loading, setLoading] = useState(false);

    const save = async () => {
        if (!name.trim() || name.trim() === group.name) return onClose();
        setLoading(true);
        try {
            await apiCall(`/groups/${group._id}`, 'PATCH', { name: name.trim() });
            addToast('Group name updated!', 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to update name.', 'error');
        } finally { setLoading(false); }
    };

    return (
        <Modal onClose={onClose} width={420}>
            <ModalHeader title="Edit Group Name" subtitle="All members will see the new name" emoji="✏️" onClose={onClose} />
            <div style={{ padding: '20px 24px' }}>
                <Field label="Group Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter new name…" onKeyDown={e => e.key === 'Enter' && save()} />
                <p style={{ margin: '0 0 20px', fontSize: 11, color: '#9ca3af' }}>Max 80 characters · {80 - name.length} remaining</p>
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn onClick={save} loading={loading} disabled={!name.trim()} style={{ flex: 1, justifyContent: 'center' }}>Save Name</Btn>
            </div>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Manage Members Modal ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function ManageMembersModal({ group, currentUser, onClose, onSuccess, addToast }) {
    const [inviteInput, setInviteInput] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [removingId, setRemovingId] = useState(null);

    const isCreator = group.createdBy?._id === currentUser?._id ||
        group.createdBy?._id?.toString() === currentUser?._id;

    const inviteMembers = async () => {
        const emails = inviteInput.split(',').map(e => e.trim()).filter(Boolean);
        if (!emails.length) return;
        setInviteLoading(true);
        try {
            const res = await apiCall(`/groups/${group._id}/invite`, 'POST', { emails });
            const { added = [], alreadyMembers = [], notFound = [] } = res.data?.meta || {};
            if (added.length) addToast(`Invitation sent / Added: ${added.join(', ')}`, 'success');
            if (alreadyMembers.length) addToast(`User already in group: ${alreadyMembers.join(', ')}`, 'error');
            if (notFound.length) addToast(`No account found for: ${notFound.join(', ')}`, 'error');
            setInviteInput('');
            onSuccess();
        } catch (err) {
            addToast(err.response?.data?.message || 'Invite failed.', 'error');
        } finally { setInviteLoading(false); }
    };

    const removeMember = async (memberId, memberName) => {
        if (!window.confirm(`Remove ${memberName} from the group?`)) return;
        setRemovingId(memberId);
        try {
            await apiCall(`/groups/${group._id}/members/${memberId}`, 'DELETE');
            addToast(`${memberName} was removed.`, 'success');
            onSuccess();
        } catch (err) {
            addToast(err.response?.data?.message || 'Remove failed.', 'error');
        } finally { setRemovingId(null); }
    };

    return (
        <Modal onClose={onClose} width={500}>
            <ModalHeader title="Manage Members" subtitle={`${group.members.length} member${group.members.length !== 1 ? 's' : ''}`} emoji="👥" onClose={onClose} />

            {/* Member list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>Current Members</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.members.map(m => {
                        const isSelf = m._id === currentUser?._id || m._id?.toString() === currentUser?._id;
                        const isGroupCreator = m._id === group.createdBy?._id || m._id?.toString() === group.createdBy?._id?.toString();
                        const [f, t] = getAvatarColors(m.name);
                        return (
                            <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${f},${t})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                    {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                                        {isSelf && <span style={{ fontSize: 9, fontWeight: 700, color: '#3b82f6', background: '#eff6ff', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>YOU</span>}
                                        {isGroupCreator && <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>CREATOR</span>}
                                    </div>
                                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</p>
                                </div>
                                {/* Remove button — creator can remove non-creators, not themselves */}
                                {isCreator && !isSelf && !isGroupCreator && (
                                    <button onClick={() => removeMember(m._id, m.name)} disabled={removingId === m._id}
                                        style={{ padding: '5px 11px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}>
                                        {removingId === m._id ? (
                                            <span style={{ width: 10, height: 10, border: '2px solid #fca5a5', borderTopColor: '#dc2626', borderRadius: '50%', display: 'inline-block', animation: 'grpSpin 0.7s linear infinite' }} />
                                        ) : '✕'} Remove
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Invite section — creator only */}
                {isCreator && (
                    <div style={{ marginTop: 20 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 }}>Invite by Email</p>
                        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280' }}>Enter one or more emails separated by commas</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input value={inviteInput} onChange={e => setInviteInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && inviteMembers()}
                                placeholder="user@email.com, friend@email.com"
                                style={{ flex: 1, padding: '10px 13px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 11, outline: 'none', fontFamily: 'inherit', color: '#111827', transition: 'border-color 0.15s' }}
                                onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                            <Btn onClick={inviteMembers} loading={inviteLoading} disabled={!inviteInput.trim()} style={{ flexShrink: 0 }}>
                                Invite
                            </Btn>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <Btn variant="ghost" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Done</Btn>
            </div>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Leave Group Confirmation Modal ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function LeaveGroupModal({ group, onClose, onLeave, loading }) {
    return (
        <Modal onClose={onClose} width={400}>
            <ModalHeader title="Leave Group" subtitle={group.name} emoji="🚪" onClose={onClose} />
            <div style={{ padding: '20px 24px' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                    Are you sure you want to leave <strong>{group.name}</strong>? You won't be able to see the group chat anymore.
                </p>
                <div style={{ marginTop: 16, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#92400e', fontWeight: 500 }}>
                        ⚠️ You will need to be re-invited by the group creator to rejoin.
                    </p>
                </div>
            </div>
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Btn>
                <Btn variant="danger" onClick={onLeave} loading={loading} style={{ flex: 1, justifyContent: 'center', border: '1.5px solid #fca5a5' }}>
                    Leave Group
                </Btn>
            </div>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Three-dot dropdown menu ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function GroupMenu({ group, currentUser, onEditName, onManageMembers, onLeaveGroup }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const isCreator = group.createdBy?._id === currentUser?._id ||
        group.createdBy?._id?.toString() === currentUser?._id;

    useEffect(() => {
        const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const item = (icon, label, onClick, danger = false) => (
        <button onClick={() => { setOpen(false); onClick(); }} style={{
            width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none',
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: 500, color: danger ? '#dc2626' : '#374151',
            transition: 'background 0.12s', fontFamily: 'inherit',
        }}
            onMouseEnter={e => e.currentTarget.style.background = danger ? '#fef2f2' : '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 16 }}>{icon}</span> {label}
        </button>
    );

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(v => !v)}
                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: open ? '#f3f4f6' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'none'; }}
                title="Group options">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: 42, width: 220,
                    background: '#fff', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
                    border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden',
                    animation: 'grpSlideUp 0.15s ease',
                }}>
                    {isCreator && item('✏️', 'Edit Group Name', onEditName)}
                    {isCreator && item('👥', 'Manage Members', onManageMembers)}
                    <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
                    {item('🚪', 'Leave Group', onLeaveGroup, true)}
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main GroupRoomPage ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function GroupRoomPage() {
    const { id: groupId } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);

    // Modals
    const [showEditName, setShowEditName] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showLeave, setShowLeave] = useState(false);
    const [leaveLoading, setLeaveLoading] = useState(false);

    // Toast queue
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const goBack = useCallback(() => navigate('/groups'), [navigate]);

    // ── Refetch group data (after member/name changes) ────────────────────────
    const refetchGroup = useCallback(async () => {
        try {
            const res = await apiCall(`/groups/${groupId}`);
            setGroup(res.data);
        } catch {/* silent */ }
    }, [groupId]);

    // ── Tab-focus refresh ─────────────────────────────────────────────────────
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && groupId) {
                apiCall(`/groups/${groupId}/messages`).then(r => setMessages(r.data)).catch(() => { });
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [groupId]);

    // ── Socket + data init ────────────────────────────────────────────────────
    useEffect(() => {
        let sock;
        const init = async () => {
            try {
                const [gRes, mRes] = await Promise.all([
                    apiCall(`/groups/${groupId}`),
                    apiCall(`/groups/${groupId}/messages`),
                ]);
                setGroup(gRes.data);
                setMessages(mRes.data);
            } catch {
                navigate('/groups');
                return;
            } finally { setLoading(false); }

            sock = io(SOCKET_URL, { auth: { token } });
            socketRef.current = sock;
            setSocket(sock);

            sock.on('connect', () => { setIsConnected(true); sock.emit('joinGroup', { groupId }); });
            sock.on('disconnect', () => setIsConnected(false));
            sock.on('reconnect', () => { setIsConnected(true); sock.emit('joinGroup', { groupId }); });

            sock.on('newMessage', msg => {
                setMessages(prev => {
                    if (msg._id && prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
            });

            sock.on('pollUpdated', updatedPoll => {
                setMessages(prev => prev.map(m => {
                    const pid = m.pollId?._id || m.pollId;
                    return String(pid) === String(updatedPoll._id) ? { ...m, pollId: updatedPoll } : m;
                }));
            });

            // Group name or members changed
            sock.on('groupUpdated', updatedGroup => {
                setGroup(updatedGroup);
            });

            // User was removed or left — if it's us, redirect
            sock.on('memberRemoved', ({ userId }) => {
                if (userId === user?._id || userId === user?._id?.toString()) {
                    addToast('You have been removed from this group.', 'error');
                    setTimeout(() => navigate('/groups'), 1800);
                } else {
                    // Just refresh member list
                    refetchGroup();
                }
            });

            sock.on('error', err => console.error('Socket error:', err?.message));
        };

        if (token) init();
        return () => { sock?.disconnect(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId, token]);

    // ── Leave group ───────────────────────────────────────────────────────────
    const handleLeave = async () => {
        setLeaveLoading(true);
        try {
            await apiCall(`/groups/${groupId}/leave`, 'DELETE');
            addToast('You left the group.', 'success');
            setTimeout(() => navigate('/groups'), 1200);
        } catch (err) {
            addToast(err.response?.data?.message || 'Could not leave group.', 'error');
            setLeaveLoading(false);
            setShowLeave(false);
        }
    };

    // ── Guards ────────────────────────────────────────────────────────────────
    if (loading) return <LoadingScreen />;
    if (!group) return null;

    return (
        <>
            <style>{KF}</style>
            <Toast toasts={toasts} />

            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f0f2f5', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

                {/* ══ HEADER ══════════════════════════════════════════════════ */}
                <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', zIndex: 20 }}>

                    {/* Back */}
                    <button onClick={goBack} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'background 0.15s', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'none'} title="Back">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>

                    <Avatar name={group.name} size={40} />

                    {/* Group info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                            {group.name}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isConnected ? '#22c55e' : '#f59e0b', boxShadow: isConnected ? '0 0 0 2px #dcfce7' : '0 0 0 2px #fef9c3', transition: 'all 0.3s' }} />
                            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                                {isConnected ? 'Online' : 'Connecting…'} &bull; {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Stacked avatars */}
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}>
                        {group.members.slice(0, 4).map((m, i) => {
                            const [f, t] = getAvatarColors(m.name);
                            return (
                                <div key={m._id} title={m.name} style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${f},${t})`, border: '2px solid #fff', marginLeft: i === 0 ? 0 : -8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                                    {m.name.charAt(0).toUpperCase()}
                                </div>
                            );
                        })}
                        {group.members.length > 4 && (
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', border: '2px solid #fff', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontWeight: 700, fontSize: 10 }}>
                                +{group.members.length - 4}
                            </div>
                        )}
                    </div>

                    {/* Three-dot menu */}
                    <GroupMenu
                        group={group}
                        currentUser={user}
                        onEditName={() => setShowEditName(true)}
                        onManageMembers={() => setShowMembers(true)}
                        onLeaveGroup={() => setShowLeave(true)}
                    />
                </header>

                {/* ══ MAIN ════════════════════════════════════════════════════ */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Chat */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, background: '#efeae2' }}>
                        <ChatBox messages={messages} currentUser={user} socket={socket} groupId={groupId} />
                    </div>

                    {/* Members sidebar */}
                    <aside style={{ width: 272, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

                        {/* Sidebar header: title + Add Member button */}
                        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>
                                    Members &mdash; {group.members.length}
                                </p>
                            </div>

                            {/* Add Member button — creator only */}
                            {(group.createdBy?._id === user?._id || group.createdBy?._id?.toString() === user?._id) ? (
                                <button
                                    onClick={() => setShowMembers(true)}
                                    style={{
                                        width: '100%', padding: '9px 0',
                                        borderRadius: 10, border: '1.5px dashed #93c5fd',
                                        background: '#eff6ff', color: '#2563eb',
                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        fontFamily: 'inherit', transition: 'all 0.18s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.15)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Member
                                </button>
                            ) : (
                                /* Non-creators see a greyed-out hint */
                                <div style={{
                                    width: '100%', padding: '9px 0',
                                    borderRadius: 10, border: '1.5px dashed #e5e7eb',
                                    background: '#f9fafb', color: '#9ca3af',
                                    fontSize: 12, fontWeight: 500, textAlign: 'center',
                                }}>
                                    Ask the creator to invite members
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                            {group.members.map(m => {
                                const isMe = m._id === user?._id || m._id?.toString() === user?._id;
                                const isOwner = m._id === group.createdBy?._id || m._id?.toString() === group.createdBy?._id?.toString();
                                const [f, t] = getAvatarColors(m.name);
                                return (
                                    <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, transition: 'background 0.15s', cursor: 'default' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${f},${t})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</p>
                                                {isMe && <span style={{ fontSize: 9, fontWeight: 700, color: '#3b82f6', background: '#eff6ff', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>YOU</span>}
                                                {isOwner && <span style={{ fontSize: 9, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>👑</span>}
                                            </div>
                                            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                            <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9ca3af' }}>
                                Created by <span style={{ fontWeight: 600, color: '#6b7280' }}>{group.createdBy?.name || 'Unknown'}</span>
                            </p>
                            <button onClick={() => setShowLeave(true)} style={{ width: '100%', padding: '8px 0', borderRadius: 9, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
                                🚪 Leave Group
                            </button>
                        </div>
                    </aside>
                </div>
            </div>

            {/* ══ MODALS ════════════════════════════════════════════════════ */}
            {showEditName && (
                <EditNameModal
                    group={group}
                    onClose={() => setShowEditName(false)}
                    onSuccess={refetchGroup}
                    addToast={addToast}
                />
            )}
            {showMembers && (
                <ManageMembersModal
                    group={group}
                    currentUser={user}
                    onClose={() => setShowMembers(false)}
                    onSuccess={refetchGroup}
                    addToast={addToast}
                />
            )}
            {showLeave && (
                <LeaveGroupModal
                    group={group}
                    onClose={() => setShowLeave(false)}
                    onLeave={handleLeave}
                    loading={leaveLoading}
                />
            )}
        </>
    );
}
