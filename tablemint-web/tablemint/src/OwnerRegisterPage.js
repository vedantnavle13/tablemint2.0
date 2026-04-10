import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const C = { border: 'rgba(255,255,255,0.12)', amber: '#D4883A', text: '#fff', textMuted: 'rgba(255,255,255,0.45)', red: '#D05A4A' };

export default function OwnerRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const fieldStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14,
    color: '#fff', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', background: 'rgba(255,255,255,0.06)',
    transition: 'border .2s',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const data = await register({ name, email, phone, password, role: 'owner' });
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#2C2416', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}"}</style>

      {/* ── Left brand panel ── */}
      <div style={{ flex: '0 0 400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56, cursor: 'pointer' }}>
          <span style={{ fontSize: 22 }}>🍽️</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>
            Table<span style={{ color: C.amber }}>Mint</span>
          </span>
        </div>

        <div style={{ fontSize: 48, marginBottom: 20 }}>🏪</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: 14 }}>
          Owner<br /><span style={{ color: C.amber, fontStyle: 'italic' }}>Portal</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.75, marginBottom: 36 }}>
          Register your restaurant on TableMint and start managing reservations, menus, and tables — all in one place.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['Manage menus & tables', 'View live bookings in real-time', 'Track reservations effortlessly', 'Create captain accounts for staff'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 48px' }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp .4s ease' }}>

          <div style={{ cursor: 'pointer', marginBottom: 40 }} onClick={() => navigate('/owner/login')}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>← Back to login</span>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Create account</h1>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 32 }}>Register as a Restaurant Owner</p>

          {error && (
            <div style={{ background: 'rgba(208,90,74,0.15)', border: '1px solid rgba(208,90,74,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#FF8A7A', lineHeight: 1.5 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {[
              { label: 'Full Name',        type: 'text',     value: name,     set: setName,     ph: 'Your full name', req: true },
              { label: 'Email',            type: 'email',    value: email,    set: setEmail,    ph: 'you@restaurant.com', req: true },
              { label: 'Phone (optional)', type: 'tel',      value: phone,    set: setPhone,    ph: '+91 98765 43210', req: false },
              { label: 'Password',         type: 'password', value: password, set: setPassword, ph: 'Min. 6 characters', req: true },
              { label: 'Confirm Password', type: 'password', value: confirm,  set: setConfirm,  ph: 'Re-enter password', req: true },
            ].map(({ label, type, value, set, ph, req }) => (
              <div key={label} style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {label}
                </label>
                <input
                  type={type} value={value} placeholder={ph} required={req}
                  onChange={e => set(e.target.value)} style={fieldStyle}
                  onFocus={e => { e.target.style.borderColor = C.amber; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>
            ))}

            <button
              type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? 'rgba(212,136,58,0.45)' : C.amber, border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8, boxShadow: '0 4px 20px rgba(212,136,58,0.3)' }}
            >
              {loading ? 'Creating account…' : 'Create Owner Account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            Already have an account?{' '}
            <Link to="/owner/login" style={{ color: C.amber, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <span
              onClick={() => navigate('/register')}
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.color = C.amber}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
            >
              Signing up as a customer instead? →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
