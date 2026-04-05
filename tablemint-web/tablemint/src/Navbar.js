import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const C = {
  bg:       "#FDFAF6",
  border:   "#E8E0D0",
  amber:    "#D4883A",
  text:     "#2C2416",
  textMid:  "#6B5B45",
  textMuted:"#A0907A",
  red:      "#D05A4A",
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const navItems = [
    { label: "Home",            path: "/" },
    { label: "Explore",         path: "/explore" },
    { label: "How It Works",    path: "/#how" },
    { label: "For Restaurants", path: "/for-restaurants" },
  ];

  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname === path;

  const handleNavClick = (item) => {
    if (item.path.startsWith("/#")) {
      navigate("/");
      setTimeout(() => document.querySelector(item.path.slice(1))?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      navigate(item.path);
    }
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  // Role-based dropdown items — NO dashboard for customers
  const dropItems = () => {
    if (!user) return [];
    if (user.role === "customer") return [
      { label: "My Account",         icon: "👤", path: "/account" },
      { label: "Browse Restaurants", icon: "🍽️", path: "/explore" },
    ];
    if (user.role === "owner")   return [{ label: "Owner Dashboard", icon: "🏢", path: "/owner/dashboard" }];
    if (user.role === "admin")   return [{ label: "Admin Dashboard", icon: "📋", path: "/admin/dashboard" }];
    if (user.role === "captain") return [{ label: "Captain Portal",  icon: "⚡", path: "/captain" }];
    return [];
  };

  const roleLabel = { customer:"Customer", owner:"Owner", admin:"Admin", captain:"Captain", superadmin:"Super Admin" }[user?.role] || "";

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      height: 64, padding: "0 6%",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: scrolled ? "rgba(253,250,246,0.97)" : "transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      borderBottom: scrolled ? `1px solid ${C.border}` : "none",
      boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.05)" : "none",
      transition: "all 0.25s ease",
    }}>

      {/* Logo */}
      <div onClick={() => navigate("/")} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
        <span style={{ fontSize:20 }}>🍽️</span>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:C.text }}>
          Table<span style={{ color:C.amber }}>Mint</span>
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display:"flex", gap:28 }}>
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <span key={item.label}
              onClick={() => handleNavClick(item)}
              onMouseEnter={e => e.target.style.color = C.amber}
              onMouseLeave={e => e.target.style.color = active ? C.amber : C.textMuted}
              style={{ color:active?C.amber:C.textMuted, fontSize:14,
                fontWeight:active?700:500, cursor:"pointer", transition:"color 0.2s" }}>
              {item.label}
            </span>
          );
        })}
      </div>

      {/* Right side */}
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        {isLoggedIn && user ? (
          <div ref={dropRef} style={{ position:"relative" }}>
            {/* Trigger button */}
            <button onClick={() => setOpen(o => !o)} style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"7px 14px", borderRadius:10,
              background: open ? C.amber+"15" : "transparent",
              border:`1.5px solid ${open ? C.amber+"50" : C.border}`,
              cursor:"pointer", transition:"all 0.2s", fontFamily:"'DM Sans',sans-serif",
            }}>
              <div style={{
                width:28, height:28, borderRadius:"50%",
                background:C.amber+"20", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:13, fontWeight:700, color:C.amber,
              }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize:14, fontWeight:600, color:C.text }}>
                {user.name?.split(" ")[0]}
              </span>
              <span style={{ fontSize:9, color:C.textMuted, transition:"transform 0.2s",
                display:"inline-block", transform:open?"rotate(180deg)":"rotate(0deg)" }}>▼</span>
            </button>

            {/* Dropdown */}
            {open && (
              <div style={{
                position:"absolute", top:"calc(100% + 8px)", right:0,
                background:"#fff", border:`1px solid ${C.border}`,
                borderRadius:14, boxShadow:"0 12px 32px rgba(44,36,22,0.12)",
                minWidth:210, overflow:"hidden", zIndex:200,
              }}>
                {/* User info */}
                <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:"#FDFAF6" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{user.name}</div>
                  <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{user.email}</div>
                  <div style={{
                    display:"inline-block", marginTop:6, padding:"2px 8px",
                    background:C.amber+"15", borderRadius:20,
                    fontSize:10, fontWeight:700, color:C.amber,
                    textTransform:"uppercase", letterSpacing:0.5,
                  }}>{roleLabel}</div>
                </div>

                {/* Links */}
                {dropItems().map(item => (
                  <div key={item.path}
                    onClick={() => { navigate(item.path); setOpen(false); }}
                    onMouseEnter={e => e.currentTarget.style.background = C.amber+"10"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    style={{ display:"flex", alignItems:"center", gap:10,
                      padding:"11px 16px", cursor:"pointer", transition:"background 0.15s",
                      fontSize:14, fontWeight:500, color:C.text }}>
                    <span style={{ fontSize:16 }}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}

                {/* Sign out */}
                <div
                  onClick={handleLogout}
                  onMouseEnter={e => e.currentTarget.style.background = "#FFF5F5"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"11px 16px", cursor:"pointer", transition:"background 0.15s",
                    fontSize:14, fontWeight:500, color:C.red,
                    borderTop:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:16 }}>🚪</span>
                  Sign Out
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <button onClick={() => navigate("/login")}
              style={{ background:"transparent", border:"none", color:C.textMid,
                fontSize:14, fontWeight:500, cursor:"pointer", padding:"7px 14px",
                fontFamily:"'DM Sans',sans-serif", transition:"color 0.2s" }}
              onMouseEnter={e => e.target.style.color = C.text}
              onMouseLeave={e => e.target.style.color = C.textMid}>
              Sign In
            </button>
            <button
              onClick={() => navigate(location.pathname === "/for-restaurants" ? "/for-restaurants" : "/register")}
              onMouseEnter={e => { e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 4px 12px rgba(212,136,58,0.4)"; }}
              onMouseLeave={e => { e.target.style.transform="translateY(0)"; e.target.style.boxShadow="none"; }}
              style={{ background:C.amber, border:"none", color:"#fff", fontSize:14,
                fontWeight:600, cursor:"pointer", padding:"8px 20px", borderRadius:10,
                fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s" }}>
              {location.pathname === "/for-restaurants" ? "Browse Restaurants" : "Get Started"}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
