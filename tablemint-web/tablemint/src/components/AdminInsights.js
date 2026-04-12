import { useState, useEffect } from 'react';
import { apiCall } from '../services/api';

// ── Design tokens (matches AdminPanel palette) ────────────────────────────────
const C = {
  bg:        '#FDFAF6',
  bgSoft:    '#F5F0E8',
  bgCard:    '#FFFFFF',
  border:    '#E8E0D0',
  amber:     '#D4883A',
  amberSoft: '#FBF0E0',
  text:      '#2C2416',
  textMid:   '#6B5B45',
  textMuted: '#A0907A',
  green:     '#4A9B6F',
  greenSoft: '#E8F5EE',
  red:       '#C62828',
  redSoft:   '#FFF0F0',
  violet:    '#7C3AED',
};

// ── Mini helpers ──────────────────────────────────────────────────────────────
function Stars({ value, max = 5 }) {
  if (!value) return <span style={{ fontSize: 12, color: C.textMuted }}>—</span>;
  return (
    <span style={{ letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: 13, color: s <= Math.round(value) ? C.amber : C.border }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>{value.toFixed(1)}</span>
    </span>
  );
}

function SentimentBadge({ label }) {
  if (!label) return <span style={{ fontSize: 11, color: C.textMuted }}>Pending…</span>;
  const map = {
    POSITIVE: { bg: '#E8F5EE', color: '#2E7D52', icon: '😊' },
    NEGATIVE: { bg: '#FFF0F0', color: '#C62828', icon: '😞' },
    NEUTRAL:  { bg: '#F3F4F6', color: '#6B7280', icon: '😐' },
  };
  const m = map[label] || map.NEUTRAL;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
      background: m.bg, color: m.color, border: `1px solid ${m.color}30`,
    }}>
      {m.icon} {label.charAt(0) + label.slice(1).toLowerCase()}
    </span>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height: 7, background: C.border, borderRadius: 4, flex: 1, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 4,
        background: `linear-gradient(90deg, ${color}, ${color}bb)`,
        transition: 'width 0.9s ease',
      }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
/**
 * AdminInsights
 * Props:
 *   restaurantId  — MongoDB ID of the admin's restaurant
 *   restaurantName — display name (optional, for header)
 */
export default function AdminInsights({ restaurantId, restaurantName }) {
  const [data, setData]       = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('all'); // all | POSITIVE | NEGATIVE | NEUTRAL

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');

    Promise.all([
      apiCall(`/restaurants/${restaurantId}/insights`),
      apiCall(`/restaurants/${restaurantId}/reviews?limit=60&sort=-createdAt`),
    ])
      .then(([ins, rev]) => {
        setData(ins.data);
        setReviews(rev.data?.reviews || []);
      })
      .catch(() => setError('Failed to load review insights.'))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: C.textMuted }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: `3px solid ${C.border}`, borderTopColor: C.amber,
          animation: 'spin 0.8s linear infinite', margin: '0 auto 14px',
        }} />
        Crunching the numbers…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: C.red, fontSize: 14 }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const {
    total, processedTotal,
    positivePercent, negativePercent, neutralPercent,
    starAverages = {}, topAspects = [], negativeReviews = [],
  } = data;

  const processedPct = total > 0 ? Math.round(processedTotal / total * 100) : 0;

  // Filtered review table
  const tableRows = filter === 'all'
    ? reviews
    : reviews.filter(r => r.sentimentLabel === filter);

  return (
    <div>
      {/* ── Section 1: AI Banner ──────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1A1A2E 0%, #2D1B69 100%)',
        borderRadius: 20, padding: '24px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 44 }}>🤖</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4,
          }}>
            AI Review Insights
            {restaurantName && <span style={{ fontWeight: 400, opacity: 0.6 }}> — {restaurantName}</span>}
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            {processedTotal} ML-processed &nbsp;·&nbsp; {total - processedTotal} pending analysis
            &nbsp;·&nbsp; {processedPct}% coverage
          </p>
        </div>
        {/* Sentiment tiles */}
        {[
          ['😊 Positive', positivePercent, '#4A9B6F'],
          ['😞 Negative', negativePercent, '#C62828'],
          ['😐 Neutral',  neutralPercent,  '#9CA3AF'],
        ].map(([label, pct, color]) => (
          <div key={label} style={{
            textAlign: 'center', background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(4px)', borderRadius: 14, padding: '16px 22px',
          }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30, fontWeight: 900, color, lineHeight: 1,
            }}>{pct}%</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Section 2: Stat cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '📝', label: 'Total Reviews',   value: total,           color: C.text    },
          { icon: '🤖', label: 'AI Processed',    value: processedTotal,  color: C.violet  },
          { icon: '⭐', label: 'Avg Rating',       value: starAverages.overall ? `${starAverages.overall}/5` : '—', color: C.amber },
          { icon: '😊', label: 'Positive Rate',   value: `${positivePercent}%`, color: C.green   },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{
            background: C.bgCard, borderRadius: 16, padding: '20px 20px 16px',
            border: `1px solid ${C.border}`, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 30, fontWeight: 900, color, lineHeight: 1,
            }}>{value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Section 3: Star rating averages ──────────────────────────────── */}
      <div style={{
        background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`,
        padding: '20px 24px', marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16, letterSpacing: 0.3 }}>
          ⭐ Star Rating Averages
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { label: '🍽️ Food Quality', val: starAverages.food },
            { label: '👨‍🍳 Service',      val: starAverages.service },
            { label: '✨ Ambience',     val: starAverages.ambience },
          ].map(({ label, val }) => (
            <div key={label} style={{
              background: C.bgSoft, borderRadius: 12, padding: '14px 16px',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8 }}>{label}</div>
              <Stars value={val} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Sentiment breakdown + top aspects ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20, marginBottom: 24 }}>

        {/* Sentiment bars */}
        <div style={{ background: C.bgCard, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Sentiment Breakdown</h3>
          {[
            ['😊 Positive', positivePercent, C.green],
            ['😐 Neutral',  neutralPercent,  '#9CA3AF'],
            ['😞 Negative', negativePercent, C.red],
          ].map(([label, pct, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, width: 90, flexShrink: 0 }}>{label}</span>
              <Bar pct={pct} color={color} />
              <span style={{ fontSize: 12, fontWeight: 700, color, width: 36, textAlign: 'right' }}>{pct}%</span>
            </div>
          ))}

          {/* Star-by-star breakdown */}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 18, paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Rating Distribution
            </div>
            {[5, 4, 3, 2, 1].map(star => {
              const cnt = reviews.filter(r => Math.round(r.rating) === star).length;
              const pct = reviews.length > 0 ? Math.round((cnt / reviews.length) * 100) : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, width: 8 }}>{star}</span>
                  <span style={{ color: C.amber, fontSize: 12 }}>★</span>
                  <Bar pct={pct} color={C.amber} />
                  <span style={{ fontSize: 11, color: C.textMuted, width: 22, textAlign: 'right' }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aspect chips + areas to watch */}
        <div style={{ background: C.bgCard, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Top Mentioned Aspects</h3>
          {topAspects.length === 0 ? (
            <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', padding: '20px 0' }}>
              Not enough detailed reviews for ABSA yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {topAspects.map(({ aspect, total: t, positivePercent: pp, negativePercent: np }) => {
                const dom = pp >= 60 ? 'POSITIVE' : np >= 60 ? 'NEGATIVE' : 'NEUTRAL';
                const [bg, color] =
                  dom === 'POSITIVE' ? [C.greenSoft, C.green] :
                  dom === 'NEGATIVE' ? [C.redSoft,   C.red]   : ['#F3F4F6', '#6B7280'];
                const icon = dom === 'POSITIVE' ? '✓' : dom === 'NEGATIVE' ? '✗' : '·';
                return (
                  <span key={aspect}
                    title={`${pp}% positive · ${np}% negative · ${t} mention${t !== 1 ? 's' : ''}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, padding: '5px 13px',
                      borderRadius: 20, background: bg, color,
                      border: `1px solid ${color}30`, cursor: 'default',
                    }}>
                    {icon} {aspect}
                    <span style={{ opacity: 0.5, fontSize: 10 }}>×{t}</span>
                  </span>
                );
              })}
            </div>
          )}

          {negativeReviews.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: C.textMuted,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
              }}>
                🔴 Areas to Watch
              </div>
              {negativeReviews.map((r, i) => (
                <div key={i} style={{
                  background: C.redSoft, borderRadius: 10,
                  borderLeft: `3px solid ${C.red}`,
                  padding: '10px 14px', marginBottom: 8,
                }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
                    {r.userName}
                    {r.sentimentScore != null && (
                      <span style={{ marginLeft: 6, color: C.red, fontWeight: 700 }}>
                        {Math.round(r.sentimentScore * 100)}% confidence
                      </span>
                    )}
                    <span style={{ marginLeft: 8 }}>
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12, color: C.textMid, margin: 0, lineHeight: 1.55,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>"{r.text}"</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Section 5: Review table with filter ──────────────────────────── */}
      <div style={{ background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            All Reviews <span style={{ color: C.textMuted, fontWeight: 400 }}>({tableRows.length})</span>
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              ['all',      'All'],
              ['POSITIVE', '😊 Positive'],
              ['NEGATIVE', '😞 Negative'],
              ['NEUTRAL',  '😐 Neutral'],
            ].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilter(val)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                background: filter === val ? C.amber : '#fff',
                color:      filter === val ? '#fff'  : C.textMid,
                borderColor:filter === val ? C.amber : C.border,
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {tableRows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
            No reviews match this filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.bgSoft, borderBottom: `2px solid ${C.border}` }}>
                  {['Customer', 'Rating', 'Sentiment', 'Aspects', 'Comment', 'Date'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 700, color: C.textMuted,
                      textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map(r => (
                  <tr key={r._id}
                    style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgSoft}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Customer */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: C.amberSoft, color: C.amber,
                          fontWeight: 700, fontSize: 12, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{(r.customer?.name || 'G')[0].toUpperCase()}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.customer?.name || 'Guest'}</span>
                      </div>
                    </td>

                    {/* Stars */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 1 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: 14, color: s <= r.rating ? C.amber : C.border }}>★</span>
                        ))}
                      </div>
                    </td>

                    {/* Sentiment badge */}
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <SentimentBadge label={r.sentimentLabel} />
                    </td>

                    {/* Aspect pills */}
                    <td style={{ padding: '13px 16px', maxWidth: 180 }}>
                      {(r.aspects || []).length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {r.aspects.slice(0, 3).map((a, i) => {
                            const aColor =
                              a.sentiment === 'POSITIVE' ? C.green :
                              a.sentiment === 'NEGATIVE' ? C.red   : '#6B7280';
                            return (
                              <span key={i} style={{
                                fontSize: 10, fontWeight: 600,
                                padding: '2px 8px', borderRadius: 10,
                                background: aColor + '18', color: aColor,
                              }}>
                                {a.sentiment === 'POSITIVE' ? '✓' : a.sentiment === 'NEGATIVE' ? '✗' : '·'} {a.aspect}
                              </span>
                            );
                          })}
                          {r.aspects.length > 3 && (
                            <span style={{ fontSize: 10, color: C.textMuted }}>+{r.aspects.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* Comment */}
                    <td style={{ padding: '13px 16px', maxWidth: 240 }}>
                      {r.comment ? (
                        <p style={{
                          fontSize: 13, color: C.textMid, margin: 0, lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>"{r.comment}"</p>
                      ) : (
                        <span style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>No comment</span>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
