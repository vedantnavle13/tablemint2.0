import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const C = {
  bg: '#FDFAF6',
  border: '#E8E0D0',
  amber: '#D4883A',
  dark: '#2C2416',
  mid: '#6B5B45',
  muted: '#A0907A',
  red: '#D05A4A',
};

const OTP_EXPIRY_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN = 60;     // 1 minute cooldown before resend

export default function OtpVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyOtp, resendOtp } = useAuth();

  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef([]);

  // ── Main countdown (OTP expiry) ─────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  // ── Resend cooldown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // ── Redirect if no email param ──────────────────────────────────────────
  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Handle digit input ──────────────────────────────────────────────────
  const handleDigitChange = (index, value) => {
    // Allow only numbers
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);
    setError('');

    // Auto-focus next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (cleaned && index === 5) {
      const allFilled = newDigits.every(d => d !== '');
      if (allFilled) handleVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();

    if (pasted.length === 6) handleVerify(pasted);
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────
  const handleVerify = useCallback(async (otpCode) => {
    const code = otpCode || digits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await verifyOtp(email, code);
      setSuccess('Email verified! Redirecting…');
      setTimeout(() => {
        if (user.role === 'owner') navigate('/owner/dashboard', { replace: true });
        else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
        else navigate('/explore', { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [digits, email, navigate, verifyOtp]);

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError('');
    try {
      await resendOtp(email);
      setSuccess('A new code has been sent to your email!');
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const isExpired = timeLeft <= 0;
  const canResend = resendCooldown <= 0 && !resending;

  const digitBoxStyle = (i) => ({
    width: 52,
    height: 60,
    borderRadius: 12,
    border: `2px solid ${error ? C.red + '80' : digits[i] ? C.amber : C.border}`,
    fontSize: 26,
    fontWeight: 700,
    textAlign: 'center',
    color: C.dark,
    fontFamily: "'DM Sans', sans-serif",
    background: digits[i] ? C.amber + '10' : '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    caretColor: C.amber,
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
      `}</style>

      {/* ── Left form panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp .5s ease' }}>

          {/* Logo */}
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 48 }}>
            <span style={{ fontSize: 21 }}>🍽️</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.dark }}>
              Table<span style={{ color: C.amber }}>Mint</span>
            </span>
          </div>

          {/* Heading */}
          <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>📬</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: C.dark, marginBottom: 8, textAlign: 'center' }}>
            Check your email
          </h1>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 6, textAlign: 'center', lineHeight: 1.6 }}>
            We sent a 6-digit code to
          </p>
          <p style={{ color: C.amber, fontSize: 14, fontWeight: 700, marginBottom: 32, textAlign: 'center', wordBreak: 'break-all' }}>
            {email}
          </p>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{
              padding: '6px 16px', borderRadius: 20,
              background: isExpired ? '#FFF5F5' : C.amber + '15',
              border: `1px solid ${isExpired ? C.red + '40' : C.amber + '40'}`,
              fontSize: 13, fontWeight: 700,
              color: isExpired ? C.red : C.amber,
              animation: timeLeft <= 60 && !isExpired ? 'pulse 1s infinite' : 'none',
            }}>
              ⏱ {isExpired ? 'Code expired' : `Expires in ${formatTime(timeLeft)}`}
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ background: '#FFF5F5', border: `1px solid ${C.red}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: C.red, lineHeight: 1.6 }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#F0FFF4', border: '1px solid #68D39130', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#2D6A4F', lineHeight: 1.6 }}>
              ✅ {success}
            </div>
          )}

          {/* OTP digit inputs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                id={`otp-digit-${i + 1}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={loading || isExpired || !!success}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={digitBoxStyle(i)}
                onFocus={e => {
                  e.target.style.borderColor = C.amber;
                  e.target.style.boxShadow = `0 0 0 3px ${C.amber}20`;
                }}
                onBlur={e => {
                  e.target.style.borderColor = digits[i] ? C.amber : C.border;
                  e.target.style.boxShadow = 'none';
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            onClick={() => handleVerify()}
            disabled={loading || digits.join('').length < 6 || isExpired || !!success}
            style={{
              width: '100%', padding: '14px', background: loading || isExpired ? C.border : C.amber,
              border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: loading || isExpired ? 'not-allowed' : 'pointer',
              boxShadow: `0 4px 16px ${C.amber}40`, transition: 'all .2s',
            }}
          >
            {loading ? 'Verifying…' : success ? 'Redirecting…' : 'Verify Email →'}
          </button>

          {/* Resend */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: 14, color: C.muted }}>Didn't receive it? </span>
            <button
              onClick={handleResend}
              disabled={!canResend}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: canResend ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700,
                color: canResend ? C.amber : C.muted,
                textDecoration: canResend ? 'underline' : 'none',
              }}
            >
              {resending
                ? 'Sending…'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend code'}
            </button>
          </div>

          {/* Back link */}
          <div style={{ textAlign: 'center', marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
            <span
              onClick={() => navigate('/register')}
              style={{ fontSize: 13, color: C.muted, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to registration
            </span>
          </div>
        </div>
      </div>

      {/* ── Right decorative panel ── */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #2C2416, #6B5B45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: 200, height: 200, background: C.amber + '20', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '5%', width: 150, height: 150, background: '#6B5B4520', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>✉️</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 900, color: '#fff', marginBottom: 16, lineHeight: 1.3 }}>
            One step<br /><span style={{ color: C.amber, fontStyle: 'italic' }}>away.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 15, lineHeight: 1.75, maxWidth: 280 }}>
            Check your inbox for the 6-digit code. It may take a moment to arrive.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 36, textAlign: 'left' }}>
            {[
              { icon: '📧', text: 'Check your spam/junk folder if you don\'t see it' },
              { icon: '⏱', text: 'The code expires in 10 minutes' },
              { icon: '🔒', text: 'Never share your code with anyone' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
