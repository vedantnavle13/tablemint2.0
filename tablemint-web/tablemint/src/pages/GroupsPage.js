import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../services/api';
import Navbar from '/Users/vedant13/tablemint/tablemint-web/tablemint/src/Navbar.js';  // adjust path if yours differs

export default function GroupsPage() {
    const navigate = useNavigate();

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Create-group form state
    const [groupName, setGroupName] = useState('');
    const [inviteEmails, setInviteEmails] = useState('');
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');

    // ── Fetch groups on mount ──────────────────────────────────────────────────
    useEffect(() => {
        apiCall('/groups')
            .then(data => setGroups(data.data))
            .catch(() => setError('Could not load groups. Make sure you are logged in.'))
            .finally(() => setLoading(false));
    }, []);

    // ── Create group ───────────────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) { setFormError('Group name is required.'); return; }
        setCreating(true);
        setFormError('');
        try {
            const emails = inviteEmails.split(',').map(s => s.trim()).filter(Boolean);
            const data = await apiCall('/groups', {
                method: 'POST',
                body: JSON.stringify({ name: groupName.trim(), inviteEmails: emails })
            });
            navigate(`/groups/${data.data._id}`);
        } catch (err) {
            setFormError(err.message || 'Failed to create group.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <Navbar />
            <div style={{ paddingTop: 80, minHeight: '100vh', background: '#FDFAF6' }}>
                <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>

                    <h1 style={{
                        fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700,
                        color: '#2C2416', marginBottom: 6
                    }}>
                        Plans with Friends
                    </h1>
                    <p style={{ color: '#A0907A', fontSize: 14, marginBottom: 32 }}>
                        Create a group, chat, share restaurants, and vote on where to go.
                    </p>

                    {/* ── Create Group Card ──────────────────────────────────────────── */}
                    <div style={{
                        background: '#fff', borderRadius: 16, border: '1px solid #E8E0D0',
                        padding: 24, marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C2416', marginBottom: 16 }}>
                            Start a New Dinner Plan
                        </h2>

                        {formError && (
                            <p style={{ color: '#D05A4A', fontSize: 13, marginBottom: 12 }}>{formError}</p>
                        )}

                        <form onSubmit={handleCreate}>
                            <input
                                type="text"
                                placeholder="Group name  (e.g. Friday Night Crew)"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder="Invite by email — comma separated  (optional)"
                                value={inviteEmails}
                                onChange={e => setInviteEmails(e.target.value)}
                                style={{ ...inputStyle, marginTop: 10 }}
                            />
                            <button type="submit" disabled={creating} style={btnStyle(creating)}>
                                {creating ? 'Creating...' : 'Create Group'}
                            </button>
                        </form>
                    </div>

                    {/* ── Group List ─────────────────────────────────────────────────── */}
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C2416', marginBottom: 14 }}>
                        My Groups
                    </h2>

                    {error && <p style={{ color: '#D05A4A', fontSize: 13 }}>{error}</p>}

                    {loading ? (
                        <p style={{ color: '#A0907A', fontSize: 14 }}>Loading your groups...</p>
                    ) : groups.length === 0 ? (
                        <p style={{ color: '#A0907A', fontSize: 14 }}>
                            No groups yet — create one above to get started.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {groups.map(g => (
                                <div key={g._id}
                                    onClick={() => navigate(`/groups/${g._id}`)}
                                    style={groupCardStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, color: '#2C2416', fontSize: 15 }}>{g.name}</span>
                                        <span style={{ fontSize: 12, color: '#D4883A', fontWeight: 600 }}>Open →</span>
                                    </div>
                                    <p style={{ fontSize: 12, color: '#A0907A', marginTop: 4 }}>
                                        {g.members.length} member{g.members.length !== 1 ? 's' : ''} · Created by {g.createdBy?.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ── Tiny style helpers ─────────────────────────────────────────────────────────
const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #E8E0D0', borderRadius: 10,
    padding: '10px 14px', fontSize: 14, color: '#2C2416',
    fontFamily: "'DM Sans',sans-serif", outline: 'none',
    background: '#FDFAF6',
};

const btnStyle = (disabled) => ({
    marginTop: 14, width: '100%', padding: '11px 0',
    background: disabled ? '#ccc' : '#D4883A',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'DM Sans',sans-serif", transition: 'background 0.2s',
});

const groupCardStyle = {
    background: '#fff', border: '1px solid #E8E0D0', borderRadius: 12,
    padding: '16px 20px', cursor: 'pointer',
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s, transform 0.15s',
};