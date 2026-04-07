import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const C = { amber: '#D4883A', border: '#E8E0D0', text: '#2C2416', muted: '#A0907A' };

export default function PollComponent({ poll, socket, currentUser }) {
    const navigate = useNavigate();

    if (!poll) return null;

    // ── Tally votes ────────────────────────────────────────────────────────────
    const voteCounts = useMemo(() => {
        const counts = {};
        poll.options.forEach(o => { counts[o.restaurantId?.toString()] = 0; });
        if (poll.votes) {
            // MongoDB Map serialises as plain object over the wire
            Object.values(poll.votes).forEach(rid => {
                counts[rid] = (counts[rid] || 0) + 1;
            });
        }
        return counts;
    }, [poll]);

    const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
    const myVote = poll.votes?.[currentUser?._id];

    // ── Winner = option with most votes ───────────────────────────────────────
    const winner = poll.options.reduce((best, o) => {
        const rid = o.restaurantId?.toString();
        return (voteCounts[rid] || 0) > (voteCounts[best?.restaurantId?.toString()] || 0) ? o : best;
    }, poll.options[0]);

    const castVote = (restaurantId) => {
        if (!socket || !poll.isOpen) return;
        socket.emit('castVote', { pollId: poll._id, restaurantId: restaurantId.toString() });
    };

    return (
        <div style={{
            background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16,
            padding: 16, width: '100%', maxWidth: 340, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>
                🗳️ {poll.question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {poll.options.map(option => {
                    const rid = option.restaurantId?.toString();
                    const count = voteCounts[rid] || 0;
                    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                    const isMyVote = myVote === rid;

                    return (
                        <div key={rid}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                {option.image && (
                                    <img src={option.image} alt={option.name}
                                        style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                                )}
                                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: C.text }}>
                                    {option.name}
                                </span>
                                <span style={{ fontSize: 11, color: C.muted }}>{count} vote{count !== 1 ? 's' : ''}</span>
                            </div>

                            {/* Progress bar */}
                            <div style={{ height: 6, background: '#F0EBE3', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', width: `${pct}%`,
                                    background: isMyVote ? C.amber : '#C8A97A',
                                    borderRadius: 99, transition: 'width 0.4s ease',
                                }} />
                            </div>

                            {poll.isOpen && (
                                <button onClick={() => castVote(rid)} style={{
                                    marginTop: 6, fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
                                    background: isMyVote ? C.amber : 'transparent',
                                    color: isMyVote ? '#fff' : C.amber,
                                    border: `1px solid ${C.amber}`,
                                    fontWeight: isMyVote ? 700 : 500,
                                    transition: 'all 0.15s',
                                }}>
                                    {isMyVote ? '✓ Your vote' : 'Vote'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Winner banner — shows as soon as anyone has voted */}
            {totalVotes > 0 && winner && (
                <div style={{
                    marginTop: 16, padding: 12, background: '#FFF7ED',
                    border: `1px solid ${C.amber}40`, borderRadius: 12,
                }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>
                        Leading: {winner.name}
                    </p>
                    <button
                        onClick={() => navigate(`/restaurant/${winner.restaurantId}`)}
                        style={{
                            marginTop: 8, width: '100%', padding: '9px 0',
                            background: C.amber, color: '#fff', border: 'none', borderRadius: 8,
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>
                        Book Now →
                    </button>
                </div>
            )}
        </div>
    );
}