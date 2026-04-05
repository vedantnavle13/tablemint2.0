import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const C = { border:'#E8E0D0', amber:'#D4883A', text:'#2C2416', textMid:'#6B5B45', textMuted:'#A0907A', red:'#D05A4A' };

export default function OwnerLoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, logout, user, isLoggedIn } = useAuth();
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    // Detect which portal from URL path
    const isAdminLogin = location.pathname === '/admin/login';
    const portalLabel  = isAdminLogin ? 'Admin' : 'Owner';

    // Already logged in
    if (isLoggedIn && user) {
        if (user.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return null; }
        if (user.role === 'owner') { navigate('/owner/dashboard', { replace: true }); return null; }
        return (
            <div style={{ minHeight:'100vh', background:'#2C2416', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", padding:20 }}>
                <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:20, padding:'44px 36px', textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:14 }}>🔒</div>
                    <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:C.text, marginBottom:8 }}>{portalLabel} Portal Only</h2>
                    <p style={{ color:C.textMuted, fontSize:14, marginBottom:24, lineHeight:1.6 }}>
                        You're signed in as a customer (<strong>{user.email}</strong>).<br/>This portal is for {portalLabel.toLowerCase()}s only.
                    </p>
                    <button onClick={() => navigate('/explore')} style={{ width:'100%', padding:'12px', background:C.amber, border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:10 }}>
                        Continue as Customer →
                    </button>
                    <button onClick={() => logout()} style={{ width:'100%', padding:'12px', background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:10, color:C.textMid, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                        Sign Out &amp; Use Different Account
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const u = await login(email, password);

            if (isAdminLogin) {
                if (u.role !== 'admin') {
                    await logout();
                    setError(u.role === 'owner' ? 'Owner accounts must sign in at the Owner Portal.' : 'This portal is for admins only.');
                    setLoading(false); return;
                }
                navigate('/admin/dashboard', { replace: true });
            } else {
                if (u.role !== 'owner') {
                    await logout();
                    setError(u.role === 'admin' ? 'Admin accounts must sign in at the Admin Panel.' : 'This portal is for restaurant owners only.');
                    setLoading(false); return;
                }
                navigate('/owner/dashboard', { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password.');
        } finally { setLoading(false); }
    };

    const fieldStyle = { width:'100%', padding:'13px 16px', borderRadius:12, border:'1.5px solid rgba(255,255,255,0.12)', fontSize:14, color:'#fff', fontFamily:"'DM Sans',sans-serif", outline:'none', background:'rgba(255,255,255,0.06)', transition:'border .2s' };

    return (
        <div style={{ minHeight:'100vh', background:'#2C2416', display:'flex', fontFamily:"'DM Sans',sans-serif" }}>
            <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}"}</style>

            {/* Left brand panel */}
            <div style={{ flex:'0 0 420px', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 48px', borderRight:'1px solid rgba(255,255,255,0.08)' }}>
                <div onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:56, cursor:'pointer' }}>
                    <span style={{ fontSize:22 }}>🍽️</span>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#fff' }}>Table<span style={{ color:C.amber }}>Mint</span></span>
                </div>
                <div style={{ fontSize:48, marginBottom:20 }}>{isAdminLogin ? '🛠️' : '🏪'}</div>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900, color:'#fff', lineHeight:1.3, marginBottom:14 }}>
                    {portalLabel}<br/><span style={{ color:C.amber, fontStyle:'italic' }}>Portal</span>
                </h2>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14, lineHeight:1.75, marginBottom:36 }}>
                    {isAdminLogin ? 'Manage restaurants, oversee reservations, and handle system administration.' : 'Manage your restaurants, view live reservations, and grow your business.'}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {(isAdminLogin
                        ? ['View all reservations','Manage all restaurants','Create staff accounts','System administration']
                        : ['Manage menus & tables','View live bookings','Track reservations','Create captain accounts']
                    ).map(f => (
                        <div key={f} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'rgba(255,255,255,0.65)' }}>
                            <span style={{ width:20, height:20, borderRadius:'50%', background:C.amber, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>✓</span>
                            {f}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right form */}
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 48px' }}>
                <div style={{ width:'100%', maxWidth:400 }}>
                    <div style={{ cursor:'pointer', marginBottom:40 }} onClick={() => navigate('/for-restaurants')}>
                        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>← For Restaurants</span>
                    </div>
                    <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:700, color:'#fff', marginBottom:6 }}>Welcome back</h1>
                    <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, marginBottom:32 }}>Sign in to the {portalLabel} Portal</p>

                    {error && (
                        <div style={{ background:'rgba(208,90,74,0.15)', border:'1px solid rgba(208,90,74,0.4)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#FF8A7A', lineHeight:1.5 }}>
                            ⚠️ {error}
                            {error.includes('Admin Panel') && <div style={{ marginTop:8 }}><span onClick={() => navigate('/admin/login')} style={{ color:C.amber, fontWeight:700, cursor:'pointer', textDecoration:'underline' }}>Go to Admin Panel →</span></div>}
                            {error.includes('Owner Portal') && <div style={{ marginTop:8 }}><span onClick={() => navigate('/owner/login')} style={{ color:C.amber, fontWeight:700, cursor:'pointer', textDecoration:'underline' }}>Go to Owner Portal →</span></div>}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {[
                            { label:'Email', type:'email', value:email, set:setEmail, ph:'you@restaurant.com' },
                            { label:'Password', type:'password', value:password, set:setPassword, ph:'••••••••' },
                        ].map(({ label, type, value, set, ph }) => (
                            <div key={label} style={{ marginBottom:18 }}>
                                <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</label>
                                <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={ph} required style={fieldStyle}
                                       onFocus={e => e.target.style.borderColor=C.amber}
                                       onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} />
                            </div>
                        ))}
                        <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background:loading?'rgba(212,136,58,0.45)':C.amber, border:'none', borderRadius:12, color:'#fff', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', marginTop:8, boxShadow:'0 4px 20px rgba(212,136,58,0.3)' }}>
                            {loading ? 'Signing in…' : `Sign In to ${portalLabel} Portal →`}
                        </button>
                    </form>

                    {!isAdminLogin && (
                        <p style={{ textAlign:'center', marginTop:24, fontSize:14, color:'rgba(255,255,255,0.4)' }}>
                            New restaurant owner?{' '}
                            <Link to="/owner/register" style={{ color:C.amber, fontWeight:700, textDecoration:'none' }}>Register here</Link>
                        </p>
                    )}

                    <div style={{ marginTop:28, paddingTop:24, borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between' }}>
                        <span onClick={() => navigate('/login')} style={{ fontSize:12, color:'rgba(255,255,255,0.3)', cursor:'pointer' }}
                              onMouseEnter={e=>e.target.style.color=C.amber} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>
                            Customer Login →
                        </span>
                        {isAdminLogin
                            ? <span onClick={() => navigate('/owner/login')} style={{ fontSize:12, color:'rgba(255,255,255,0.3)', cursor:'pointer' }} onMouseEnter={e=>e.target.style.color=C.amber} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>Owner Portal →</span>
                            : <span onClick={() => navigate('/admin/login')} style={{ fontSize:12, color:'rgba(255,255,255,0.3)', cursor:'pointer' }} onMouseEnter={e=>e.target.style.color=C.amber} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>Admin Panel →</span>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
