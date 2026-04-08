import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  blue:        '#2563eb',
  blueSoft:    '#eff6ff',
  blueBorder:  '#bfdbfe',
  blue2:       '#1d4ed8',
  green:       '#16a34a',
  greenSoft:   '#f0fdf4',
  greenBorder: '#86efac',
  green2:      '#15803d',
  amber:       '#d97706',
  amberSoft:   '#fffbeb',
  gray:        '#6b7280',
  grayLight:   '#f9fafb',
  border:      '#e5e7eb',
  text:        '#111827',
  textMid:     '#374151',
  textMuted:   '#9ca3af',
  red:         '#dc2626',
  redSoft:     '#fef2f2',
  redBorder:   '#fca5a5',
};

// ── Tiny util ─────────────────────────────────────────────────────────────────
function pct(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/**
 * PollComponent — live voting card rendered inside the chat.
 *
 * Props
 *   poll        — poll document (from message.pollId), updated in real-time by parent
 *   socket      — live Socket.io client
 *   currentUser — { _id, name, … }
 */
export default function PollComponent({ poll, socket, currentUser }) {
  const navigate = useNavigate();

  // Keep an internal copy so we can merge socket-pushed updates immediately
  // without waiting for the parent to re-render.
  const [localPoll, setLocalPoll] = useState(poll);
  const [ending, setEnding] = useState(false);
  const [votingFor, setVotingFor] = useState(null); // rid currently being cast

  // Sync when parent receives a fresh poll object (e.g. initial load or re-render)
  // We use a ref to track the last value we got from the parent.
  const parentPollRef = useRef(poll);
  useEffect(() => {
    if (poll && poll !== parentPollRef.current) {
      parentPollRef.current = poll;
      setLocalPoll(poll);
    }
  }, [poll]);

  // Listen for live pollUpdated events directly so we can update instantly
  useEffect(() => {
    if (!socket || !localPoll?._id) return;
    const handle = (updated) => {
      if (String(updated._id) === String(localPoll._id)) {
        setLocalPoll(updated);
      }
    };
    socket.on('pollUpdated', handle);
    return () => socket.off('pollUpdated', handle);
  }, [socket, localPoll?._id]);

  const p = localPoll;

  // ── Tally ───────────────────────────────────────────────────────────────────
  const { voteCounts, totalVotes, myVote, winnerRid } = useMemo(() => {
    // p may be null on first render — return safe defaults until the guard below catches it
    if (!p) return { voteCounts: {}, totalVotes: 0, myVote: null, winnerRid: null };

    const counts = {};
    p.options.forEach(o => { counts[String(o.restaurantId)] = 0; });

    // votes is a Mongoose Map → can arrive as plain object or Map
    const rawVotes = p.votes instanceof Map
      ? Object.fromEntries(p.votes)
      : (p.votes || {});

    Object.values(rawVotes).forEach(rid => {
      counts[String(rid)] = (counts[String(rid)] || 0) + 1;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const myV   = rawVotes[String(currentUser?._id)];

    let wRid = null, wMax = 0;
    Object.entries(counts).forEach(([rid, c]) => {
      if (c > wMax) { wMax = c; wRid = rid; }
    });

    return {
      voteCounts: counts,
      totalVotes: total,
      myVote: myV ? String(myV) : null,
      winnerRid: total > 0 ? wRid : null,
    };
  }, [p, currentUser]);

  // Guard AFTER all hooks — never return early before a hook call
  if (!p) return null;

  const isCreator =
    String(p.createdBy?._id || p.createdBy) === String(currentUser?._id);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const castVote = (rid) => {
    if (!socket || !p.isOpen || votingFor) return;
    if (myVote === String(rid)) return; // already voted here

    setVotingFor(rid);

    // Optimistic update
    const rawVotes = p.votes instanceof Map
      ? Object.fromEntries(p.votes)
      : { ...(p.votes || {}) };
    rawVotes[String(currentUser._id)] = String(rid);
    setLocalPoll(prev => ({ ...prev, votes: rawVotes }));

    socket.emit('castVote', { pollId: p._id, restaurantId: String(rid) });
    setTimeout(() => setVotingFor(null), 500);
  };

  const endPoll = () => {
    if (!socket || ending || !p.isOpen) return;
    setEnding(true);
    socket.emit('endPoll', { pollId: p._id });
    setTimeout(() => setEnding(false), 3000);
  };

  // Winner option (for Book Now CTA)
  const winnerOption = !p.isOpen && winnerRid
    ? p.options.find(o => String(o.restaurantId) === winnerRid)
    : null;

  // ── Styles per option ────────────────────────────────────────────────────────
  const getOptionTheme = (rid) => {
    const isWinner  = String(rid) === winnerRid;
    const isMeVoted = myVote === String(rid);
    if (!p.isOpen && isWinner) return { bg: C.greenSoft, border: C.greenBorder, bar: C.green,  label: C.green };
    if (isMeVoted)             return { bg: C.blueSoft,  border: C.blueBorder,  bar: C.blue,   label: C.blue  };
    return { bg: '#fff', border: C.border, bar: '#d1d5db', label: C.gray };
  };

  // Pulse animation keyframes injected once
  const pulseKeyframes = `
    @keyframes tmPollPulse {
      0%,100% { opacity: 1; } 50% { opacity: 0.55; }
    }
    @keyframes tmBarGrow {
      from { width: 0; } 
    }
  `;

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div style={{
        background: '#fff',
        border: `1.5px solid ${C.border}`,
        borderRadius: 20,
        padding: '16px 18px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        transition: 'box-shadow 0.2s',
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
            {/* Icon */}
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: p.isOpen
                ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                : 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: p.isOpen ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            }}>
              {p.isOpen ? '🗳️' : '🔒'}
            </div>

            <div style={{ flex: 1 }}>
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {p.isOpen ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                    textTransform: 'uppercase', color: C.blue,
                    background: C.blueSoft, padding: '2px 7px',
                    borderRadius: 4, border: `1px solid ${C.blueBorder}`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'tmPollPulse 1.5s infinite' }} />
                    Live Poll
                  </span>
                ) : (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                    textTransform: 'uppercase', color: C.gray,
                    background: '#f3f4f6', padding: '2px 7px',
                    borderRadius: 4,
                  }}>
                    Poll Ended
                  </span>
                )}
              </div>

              {/* Question */}
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.text, lineHeight: 1.35 }}>
                {p.question}
              </p>
            </div>
          </div>

          {/* Vote count */}
          <p style={{ margin: 0, fontSize: 12, color: C.textMuted, paddingLeft: 44 }}>
            <span style={{ fontWeight: 600, color: totalVotes > 0 ? C.textMid : C.textMuted }}>
              {totalVotes}
            </span>{' '}
            {totalVotes === 1 ? 'person' : 'people'} voted
            {!p.isOpen && (
              <span style={{ marginLeft: 8, color: C.amber, fontWeight: 600 }}>
                · Voting closed
              </span>
            )}
          </p>
        </div>

        {/* ── Options ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {p.options.map((option, idx) => {
            const rid        = String(option.restaurantId);
            const count      = voteCounts[rid] || 0;
            const percentage = pct(count, totalVotes);
            const isMeVoted  = myVote === rid;
            const isWinner   = rid === winnerRid;
            const isVoting   = votingFor === rid;
            const theme      = getOptionTheme(rid);
            const canVote    = p.isOpen && !isMeVoted && !votingFor;

            return (
              <div
                key={rid + idx}
                onClick={() => canVote && castVote(rid)}
                style={{
                  border: `1.5px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: theme.bg,
                  cursor: canVote ? 'pointer' : 'default',
                  transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (canVote) {
                    e.currentTarget.style.borderColor = C.blue;
                    e.currentTarget.style.background = C.blueSoft;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.background = theme.bg;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  {/* Restaurant thumbnail */}
                  {option.image ? (
                    <img
                      src={option.image}
                      alt={option.name}
                      style={{
                        width: 40, height: 40, borderRadius: 10, objectFit: 'cover',
                        flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }}>
                      🍽️
                    </div>
                  )}

                  {/* Name + tags */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{
                        margin: 0, fontSize: 13, fontWeight: 700, color: C.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}>
                        {option.name}
                      </p>
                      {/* Winning badges */}
                      {!p.isOpen && isWinner && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: C.green,
                          background: C.greenSoft, border: `1px solid ${C.greenBorder}`,
                          borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          WINNER 🏆
                        </span>
                      )}
                      {p.isOpen && isWinner && totalVotes > 0 && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: C.blue,
                          background: C.blueSoft, border: `1px solid ${C.blueBorder}`,
                          borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          LEADING 📈
                        </span>
                      )}
                      {isMeVoted && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: '#7c3aed',
                          background: '#f5f3ff', border: '1px solid #c4b5fd',
                          borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          YOUR VOTE ✓
                        </span>
                      )}
                    </div>
                    {(option.cuisine || option.rating > 0) && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textMuted }}>
                        {option.cuisine}
                        {option.cuisine && option.rating > 0 && ' · '}
                        {option.rating > 0 && `⭐ ${Number(option.rating).toFixed(1)}`}
                      </p>
                    )}
                  </div>

                  {/* Percentage + count */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: theme.label, lineHeight: 1 }}>
                      {percentage}%
                    </span>
                    <p style={{ margin: 0, fontSize: 10, color: C.textMuted, marginTop: 1 }}>
                      {count} vote{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: 6, background: '#f3f4f6', borderRadius: 99,
                  overflow: 'hidden', marginBottom: p.isOpen ? 10 : 0,
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: isVoting
                      ? `linear-gradient(90deg, ${theme.bar}, ${C.blue})`
                      : (!p.isOpen && isWinner)
                        ? `linear-gradient(90deg, ${C.green}, ${C.green2})`
                        : isMeVoted
                          ? `linear-gradient(90deg, ${C.blue}, ${C.blue2})`
                          : theme.bar,
                    borderRadius: 99,
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    minWidth: count > 0 ? 8 : 0,
                  }} />
                </div>

                {/* Vote button (only while poll is open) */}
                {p.isOpen && (
                  <button
                    onClick={e => { e.stopPropagation(); canVote && castVote(rid); }}
                    disabled={isMeVoted || !!votingFor}
                    style={{
                      width: '100%', padding: '7px 0', borderRadius: 9,
                      border: `1.5px solid ${isMeVoted ? C.blue : C.border}`,
                      background: isMeVoted ? C.blue : 'transparent',
                      color: isMeVoted ? '#fff' : C.textMid,
                      fontSize: 12, fontWeight: 600,
                      cursor: isMeVoted || votingFor ? 'default' : 'pointer',
                      transition: 'all 0.2s', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                    onMouseEnter={e => {
                      if (!isMeVoted && !votingFor) {
                        e.currentTarget.style.background = C.blue;
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.borderColor = C.blue;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isMeVoted) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = C.textMid;
                        e.currentTarget.style.borderColor = C.border;
                      }
                    }}
                  >
                    {isVoting ? (
                      <>
                        <span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'tmPollPulse 0.6s linear infinite' }} />
                        Voting…
                      </>
                    ) : isMeVoted ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Your vote
                      </>
                    ) : (
                      'Vote for this'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          {/* End Poll — creator only, poll is open */}
          {p.isOpen && isCreator && (
            <button
              onClick={endPoll}
              disabled={ending}
              style={{
                padding: '7px 14px', borderRadius: 9,
                border: `1.5px solid ${C.redBorder}`,
                background: ending ? '#f3f4f6' : C.redSoft,
                color: C.red, fontSize: 12, fontWeight: 600,
                cursor: ending ? 'wait' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: ending ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!ending) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = C.red; }
              }}
              onMouseLeave={e => {
                if (!ending) { e.currentTarget.style.background = C.redSoft; e.currentTarget.style.borderColor = C.redBorder; }
              }}
            >
              {ending ? (
                <>
                  <span style={{ width: 10, height: 10, border: '2px solid #fca5a5', borderTopColor: C.red, borderRadius: '50%', display: 'inline-block', animation: 'tmPollPulse 0.6s linear infinite' }} />
                  Ending…
                </>
              ) : (
                <>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  End Poll
                </>
              )}
            </button>
          )}

          {/* Book Now CTA — shows after poll ends with a winner */}
          {winnerOption && (
            <button
              onClick={() => navigate(`/restaurant/${winnerOption.restaurantId}`)}
              style={{
                flex: 1, padding: '9px 0',
                borderRadius: 9, border: 'none',
                background: `linear-gradient(135deg, ${C.green}, ${C.green2})`,
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 10px rgba(22,163,74,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(22,163,74,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(22,163,74,0.35)'; e.currentTarget.style.transform = 'none'; }}
            >
              <span>🎉</span>
              Book {winnerOption.name} →
            </button>
          )}

          {/* Hint for non-creators during open poll */}
          {p.isOpen && !isCreator && !myVote && (
            <p style={{ margin: 0, fontSize: 11, color: C.textMuted, flex: 1, textAlign: 'right' }}>
              Tap an option to cast your vote
            </p>
          )}

          {/* Voted hint */}
          {p.isOpen && !isCreator && myVote && (
            <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', flex: 1, textAlign: 'right', fontWeight: 600 }}>
              ✓ Vote recorded — results update live
            </p>
          )}
        </div>
      </div>
    </>
  );
}