import { useState } from "react";
import { useNavigate } from "react-router-dom";

const C = {
    bg:        "#FDFAF6",
    bgSoft:    "#F5F0E8",
    bgCard:    "#FFFFFF",
    border:    "#E8E0D0",
    amber:     "#D4883A",
    amberSoft: "#FBF0E0",
    text:      "#2C2416",
    textMid:   "#6B5B45",
    textMuted: "#A0907A",
    green:     "#4A9B6F",
    red:       "#D05A4A",
};

// Clean SVG icons — no emojis
const Icon = ({ type, size = 24, color = C.amber }) => {
    const icons = {
        chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
        noshow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
        lightning: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
        analytics: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
        money: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
        user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
        menu: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2l1.5 8H19.5L21 2z"/><path d="M3 2H1"/><path d="M21 2h2"/><path d="M9 12v8"/><path d="M15 12v8"/><path d="M7 20h10"/></svg>,
        payment: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
        phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
        check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
        register: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
        list: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
        booking: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    };
    return icons[type] || null;
};

export default function ForRestaurants() {
    const navigate = useNavigate();
    const [loginType, setLoginType] = useState("owner");

    const handleLogin = () => {
        navigate(loginType === "owner" ? '/owner/login' : '/admin/login');
    };

    return (
        <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:#D4C4B0; border-radius:3px; }
      `}</style>

            {/* NAVBAR */}
            <nav style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
                height: 64, padding: "0 6%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(253,250,246,0.97)", backdropFilter: "blur(14px)",
                borderBottom: `1px solid ${C.border}`,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate('/')}>
                    <span style={{ fontSize: 20 }}>🍽️</span>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: C.text }}>
                        Table<span style={{ color: C.amber }}>Mint</span>
                    </span>
                </div>
                <div style={{ display: "flex", gap: 28 }}>
                    {[{label:"Home",path:"/"},{label:"Explore",path:"/explore"},{label:"How It Works",path:"/#how"},{label:"For Restaurants",path:"/for-restaurants"}].map(item => (
                        <span key={item.label} style={{
                            color: item.path === "/for-restaurants" ? C.amber : C.textMuted,
                            fontSize: 14, fontWeight: item.path === "/for-restaurants" ? 700 : 500,
                            cursor: "pointer", transition: "color 0.2s",
                        }}
                            onClick={() => navigate(item.path)}
                            onMouseEnter={e => e.target.style.color = C.amber}
                            onMouseLeave={e => e.target.style.color = item.path === "/for-restaurants" ? C.amber : C.textMuted}
                        >{item.label}</span>
                    ))}
                </div>
                <button onClick={() => navigate('/explore')} style={{
                    background: C.amber, border: "none", color: "#fff", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", padding: "8px 20px", borderRadius: 10,
                    fontFamily: "'DM Sans', sans-serif",
                }}>Browse Restaurants</button>
            </nav>

            {/* TWO COLUMN LAYOUT */}
            <div style={{ marginTop: 64, display: "grid", gridTemplateColumns: "1fr 420px", minHeight: "calc(100vh - 64px)" }}>

                {/* ── LEFT SIDE ─────────────────────────────────────────────── */}
                <div style={{ padding: "64px 6% 80px", overflowY: "auto" }}>

                    {/* HERO */}
                    <div style={{ marginBottom: 72 }}>
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: C.amberSoft, border: `1px solid ${C.amber}40`,
                            borderRadius: 100, padding: "6px 18px", marginBottom: 28,
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.amber }} />
                            <span style={{ color: C.amber, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>PARTNER WITH TABLEMINT</span>
                        </div>

                        <h1 style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "clamp(38px, 5vw, 58px)",
                            fontWeight: 900, color: C.text,
                            lineHeight: 1.12, marginBottom: 24, letterSpacing: -1,
                        }}>
                            Grow Your Restaurant<br />
                            <span style={{ color: C.amber, fontStyle: "italic" }}>the Smarter Way</span>
                        </h1>

                        <p style={{ fontSize: 18, color: C.textMid, lineHeight: 1.75, marginBottom: 40, maxWidth: 540 }}>
                            TableMint gives your restaurant a complete reservation system — from customer bookings and pre-orders to staff management and live analytics. All in one platform.
                        </p>

                        {/* Hero image */}
                        <div style={{
                            width: "100%", height: 380, borderRadius: 20, overflow: "hidden",
                            backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200')",
                            backgroundSize: "cover", backgroundPosition: "center",
                            border: `1px solid ${C.border}`,
                            boxShadow: "0 16px 56px rgba(44,36,22,0.12)",
                            position: "relative",
                        }}>
                            <div style={{
                                position: "absolute", inset: 0,
                                background: "linear-gradient(to top, rgba(44,36,22,0.5) 0%, transparent 50%)",
                            }} />
                            <div style={{
                                position: "absolute", bottom: 28, left: 28,
                                display: "flex", gap: 12,
                            }}>
                                {[["500+","Restaurants"],["50K+","Bookings"],["4.8★","Avg Rating"]].map(([v,l]) => (
                                    <div key={l} style={{
                                        background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
                                        border: "1px solid rgba(255,255,255,0.25)",
                                        borderRadius: 12, padding: "10px 16px", textAlign: "center",
                                    }}>
                                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#fff" }}>{v}</div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{l}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 64 }} />

                    {/* WHY PARTNER */}
                    <div style={{ marginBottom: 72 }}>
                        <div style={{ marginBottom: 40 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Why Choose Us</p>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                                Everything your restaurant needs
                            </h2>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {[
                                { icon: "chart",     title: "Increase Bookings by 40%",   desc: "Reach thousands of diners actively looking for their next dining experience in Pune." },
                                { icon: "noshow",    title: "Reduce No-Shows by 60%",      desc: "Reservation fees keep customers committed. No more last-minute empty tables." },
                                { icon: "lightning", title: "Pre-Order = Faster Service",  desc: "Customers pre-order food when booking. Their meal is ready when they walk in." },
                                { icon: "analytics", title: "Live Analytics Dashboard",    desc: "See today's bookings, revenue, and customer trends in real time." },
                                { icon: "money",     title: "Zero Setup Cost",             desc: "No monthly fees, no hardware needed. Only pay a small cut per confirmed booking." },
                            ].map(b => (
                                <div key={b.title} style={{
                                    display: "flex", gap: 20, padding: "22px 24px",
                                    background: C.bgCard, borderRadius: 14,
                                    border: `1px solid ${C.border}`, transition: "all 0.2s",
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.boxShadow = `0 6px 20px ${C.amber}18`; e.currentTarget.style.transform = "translateX(4px)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateX(0)"; }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                                        background: C.amberSoft, border: `1px solid ${C.amber}30`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Icon type={b.icon} size={22} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>{b.title}</h3>
                                        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6 }}>{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 64 }} />

                    {/* HOW IT WORKS */}
                    <div style={{ marginBottom: 72 }}>
                        <div style={{ marginBottom: 40 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>The Process</p>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: C.text }}>How it works</h2>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {[
                                { num:"01", icon:"register", title:"Register as Owner",        desc:"Create your account and fill in your restaurant details. Takes under 5 minutes." },
                                { num:"02", icon:"list",     title:"Add Menu, Tables & Staff", desc:"Upload your menu, set table capacity, and add your admin team." },
                                { num:"03", icon:"user",     title:"Our Team Visits",           desc:"A TableMint representative visits your restaurant, takes photos, and collects the OTP from you." },
                                { num:"04", icon:"booking",  title:"Go Live & Get Bookings",   desc:"Your restaurant appears on the platform. Customers can instantly book and pre-order." },
                            ].map((step, i, arr) => (
                                <div key={step.num} style={{ display: "flex", gap: 20, position: "relative" }}>
                                    {/* Vertical line */}
                                    {i < arr.length - 1 && (
                                        <div style={{ position: "absolute", left: 25, top: 52, width: 2, height: "calc(100% - 16px)", background: `linear-gradient(to bottom, ${C.amber}40, transparent)` }} />
                                    )}
                                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <div style={{
                                            width: 52, height: 52, borderRadius: "50%",
                                            background: C.amber, display: "flex", alignItems: "center", justifyContent: "center",
                                            boxShadow: `0 4px 14px ${C.amber}40`,
                                        }}>
                                            <Icon type={step.icon} size={20} color="#fff" />
                                        </div>
                                    </div>
                                    <div style={{ paddingBottom: i < arr.length-1 ? 36 : 0, flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, letterSpacing: 1.5, marginBottom: 6 }}>STEP {step.num}</div>
                                        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>{step.title}</h3>
                                        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.65 }}>{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 64 }} />

                    {/* FEATURES */}
                    <div style={{ marginBottom: 40 }}>
                        <div style={{ marginBottom: 40 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Platform Features</p>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: C.text }}>Built for modern restaurants</h2>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {[
                                { icon:"analytics", title:"Live Reservation Dashboard", desc:"See all upcoming bookings, customer details, and pre-orders in real time." },
                                { icon:"menu",      title:"Pre-Order Food System",      desc:"Customers order food at booking time. Ready on arrival, no waiting." },
                                { icon:"payment",   title:"Reservation Fee Collection", desc:"Customers pay a small fee to confirm their booking. Reduces no-shows." },
                                { icon:"phone",     title:"Captain Mobile Portal",      desc:"Floor staff look up customers by their unique 9-digit ID and manage orders." },
                                { icon:"user",      title:"Multi-Admin Management",     desc:"Add up to 3 admins per restaurant. Each manages their own shift." },
                                { icon:"chart",     title:"Revenue Tracking",           desc:"Track reservation fee income and pre-order totals per day." },
                            ].map(f => (
                                <div key={f.title} style={{
                                    padding: 24, background: C.bgCard,
                                    borderRadius: 14, border: `1px solid ${C.border}`,
                                    transition: "all 0.2s",
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber + "60"; e.currentTarget.style.boxShadow = `0 4px 16px ${C.amber}12`; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10, marginBottom: 14,
                                        background: C.amberSoft, border: `1px solid ${C.amber}25`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Icon type={f.icon} size={20} />
                                    </div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "'DM Sans',sans-serif" }}>{f.title}</h3>
                                    <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT SIDE — UNCHANGED ────────────────────────────────── */}
                <div style={{
                    background: C.bgSoft, padding: "60px 40px",
                    borderLeft: `1px solid ${C.border}`,
                    position: "sticky", top: 64,
                    height: "calc(100vh - 64px)", overflowY: "auto",
                }}>
                    <div style={{
                        background: C.bgCard, padding: 32, borderRadius: 20,
                        border: `2px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    }}>
                        <div style={{ textAlign: "center", marginBottom: 28 }}>
                            <div style={{
                                width: 64, height: 64, background: C.amberSoft, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 32, margin: "0 auto 16px",
                            }}>🍽️</div>
                            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>Restaurant Portal</h3>
                            <p style={{ fontSize: 14, color: C.textMuted }}>Select your login type</p>
                        </div>

                        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: C.bgSoft, padding: 6, borderRadius: 12 }}>
                            <button onClick={() => setLoginType("owner")} style={{
                                flex: 1, padding: "12px",
                                background: loginType === "owner" ? C.amber : "transparent",
                                border: "none", borderRadius: 8,
                                color: loginType === "owner" ? "#fff" : C.textMid,
                                fontSize: 14, fontWeight: 700, cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
                            }}>🔵 Owner</button>
                            <button onClick={() => setLoginType("admin")} style={{
                                flex: 1, padding: "12px",
                                background: loginType === "admin" ? C.green : "transparent",
                                border: "none", borderRadius: 8,
                                color: loginType === "admin" ? "#fff" : C.textMid,
                                fontSize: 14, fontWeight: 700, cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
                            }}>🟢 Admin</button>
                        </div>

                        <div style={{
                            padding: 12, borderRadius: 10, marginBottom: 24,
                            background: loginType === "owner" ? C.amberSoft : C.green + "15",
                            border: `1px solid ${loginType === "owner" ? C.amber + "30" : C.green + "30"}`,
                        }}>
                            <div style={{ fontSize: 13, color: loginType === "owner" ? C.amber : C.green, fontWeight: 600, lineHeight: 1.5 }}>
                                {loginType === "owner"
                                    ? "🔵 Owner: Manage all restaurants, add admins, view pending verifications"
                                    : "🟢 Admin: Manage assigned restaurant, reservations, and menu"}
                            </div>
                        </div>

                        <button onClick={handleLogin} style={{
                            width: "100%", padding: "16px",
                            background: loginType === "owner" ? C.amber : C.green,
                            border: "none", borderRadius: 12, color: "#fff",
                            fontSize: 16, fontWeight: 700, cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            boxShadow: `0 4px 16px ${loginType === "owner" ? C.amber : C.green}40`,
                            transition: "all 0.2s ease", marginBottom: 20,
                        }}
                            onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = `0 6px 20px ${loginType === "owner" ? C.amber : C.green}50`; }}
                            onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = `0 4px 16px ${loginType === "owner" ? C.amber : C.green}40`; }}>
                            Continue as {loginType === "owner" ? "Owner" : "Admin"} →
                        </button>

                        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 28, paddingTop: 28, textAlign: "center" }}>
                            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>New restaurant owner?</p>
                            <button onClick={() => navigate('/owner/login')} style={{
                                width: "100%", padding: "14px", background: "transparent",
                                border: `2px solid ${C.border}`, borderRadius: 12, color: C.text,
                                fontSize: 15, fontWeight: 700, cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
                            }}
                                onMouseEnter={e => { e.target.style.borderColor = C.amber; e.target.style.color = C.amber; }}
                                onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.text; }}>
                                Start Free Trial
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
