import React, { useEffect, useState } from 'react';
import axios from 'axios';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  amber:     '#D4883A',
  amberSoft: '#FFF5E6',
  green:     '#2E7D52',
  greenSoft: '#EEF7F2',
  red:       '#C62828',
  redSoft:   '#FFF0F0',
  gray:      '#6B7280',
  graySoft:  '#F3F4F6',
  text:      '#1A1A2E',
  textMid:   '#4A4A6A',
  textMuted: '#8B8BA7',
  border:    '#E8E8F0',
  bgCard:    '#FFFFFF',
  bgSoft:    '#F8F8FC',
};

// ── Star row ──────────────────────────────────────────────────────────────────
function StarRow({ label, value }) {
  const rounded = value ? Math.round(value * 10) / 10 : null;
  const filled  = value ? Math.round(value) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, width: 90, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{ fontSize: 14, color: s <= filled ? C.amber : '#E0DDD8' }}>★</span>
        ))}
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.text, marginLeft: 2 }}>
        {rounded ? rounded.toFixed(1) : '—'}
      </span>
    </div>
  );
}

// ── Sentiment dot ─────────────────────────────────────────────────────────────
function SentimentDot({ sentiment }) {
  const colour =
    sentiment === 'POSITIVE' ? C.green :
    sentiment === 'NEGATIVE' ? C.red   : C.gray;
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7,
      borderRadius: '50%', background: colour,
      flexShrink: 0, marginRight: 4,
    }} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RestaurantInsights({ restaurantId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    axios
      .get(`/restaurants/${restaurantId}/insights`)
      .then(res => { setData(res.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <div style={{
        background: C.bgCard, borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: '20px 24px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: `2px solid ${C.border}`, borderTopColor: C.amber,
          animation: 'spin 0.8s linear infinite', flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, color: C.textMuted }}>Loading review insights…</span>
      </div>
    );
  }

  if (!data || data.total === 0) return null;

  const {
    topAspects = [], total = 0,
    starAverages = {},
  } = data;

  return (
    <div style={{
      background: C.bgCard, borderRadius: 16,
      border: `1px solid ${C.border}`,
      marginBottom: 28, overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
          Review Insights
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          color: C.textMuted, background: C.bgSoft,
          padding: '3px 9px', borderRadius: 20, border: `1px solid ${C.border}`,
        }}>
          {total} AI-analysed review{total !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ padding: '20px 20px' }}>

        {/* ── Star Averages ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: topAspects.length > 0 ? 20 : 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.textMuted,
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
          }}>
            Rating Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StarRow label="Overall"    value={starAverages.overall} />
            <StarRow label="🍽️ Food"    value={starAverages.food} />
            <StarRow label="👨‍🍳 Service" value={starAverages.service} />
            <StarRow label="✨ Ambience" value={starAverages.ambience} />
          </div>
        </div>

        {/* ── Top mentioned aspects ───────────────────────────────────────── */}
        {topAspects.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.textMuted,
              textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
            }}>
              What guests mention
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {topAspects.map(({ aspect, positivePercent: pp, negativePercent: np, total: t }) => {
                const dom = pp >= 60 ? 'POSITIVE' : np >= 60 ? 'NEGATIVE' : 'NEUTRAL';
                const bg    = dom === 'POSITIVE' ? C.greenSoft : dom === 'NEGATIVE' ? C.redSoft : C.graySoft;
                const color = dom === 'POSITIVE' ? C.green     : dom === 'NEGATIVE' ? C.red     : C.gray;
                return (
                  <span key={aspect}
                    title={`${pp}% positive · ${np}% negative · ${t} mention${t !== 1 ? 's' : ''}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      fontSize: 12, fontWeight: 600, padding: '5px 11px',
                      borderRadius: 20, background: bg, color,
                      border: `1px solid ${color}25`, cursor: 'default',
                    }}>
                    <SentimentDot sentiment={dom} />
                    {aspect}
                    <span style={{ marginLeft: 4, opacity: 0.5, fontWeight: 400, fontSize: 10 }}>×{t}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
