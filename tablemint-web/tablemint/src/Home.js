import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from './Navbar';
console.log("API URL:", process.env.REACT_APP_API_URL);

const C = {
  bg:        "#FDFAF6",
  bgSoft:    "#F5F0E8",
  border:    "#E8E0D0",
  amber:     "#D4883A",
  amberSoft: "#FBF0E0",
  text:      "#2C2416",
  textMid:   "#6B5B45",
  textMuted: "#A0907A",
  terracotta: "#C4614A",
};

const steps = [
  { num:"1", icon:"📍", title:"Find Near You",   desc:"Browse restaurants by location, cuisine, or rating. See live seat availability in real time." },
  { num:"2", icon:"🪑", title:"Pick & Reserve",  desc:"Choose instant or scheduled booking. Pre-order food from the menu. Pay a small reservation fee." },
  { num:"3", icon:"✅", title:"Walk In & Enjoy", desc:"Show your Customer ID at the door. Your table and pre-ordered food are already waiting for you." },
];

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleSearch = () => {
    navigate(`/explore${search ? `?search=${search}` : ''}`);
  };

  return (
    <div style={{ background: C.bg, minHeight:"100vh", fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:#D4C4B0; border-radius:3px; }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .f1 { animation:fadeUp 0.55s ease both 0.08s; }
        .f2 { animation:fadeUp 0.55s ease both 0.2s;  }
        .f3 { animation:fadeUp 0.55s ease both 0.32s; }
        .f4 { animation:fadeUp 0.55s ease both 0.44s; }
        .float { animation: float 3s ease-in-out infinite; }
        .pulse-btn { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      {/* ── NAV ── */}
      <Navbar style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        height:60, padding:"0 6%",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background: scrolled ? "rgba(253,250,246,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${C.border}` : "none",
        transition:"all 0.3s ease",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }} onClick={() => navigate('/')}>
          <span style={{ fontSize:21 }}>🍽️</span>
          <span style={{
            fontFamily:"'Playfair Display', serif",
            fontSize:20, fontWeight:700, color:C.text,
          }}>Table<span style={{ color:C.amber }}>Mint</span></span>
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {[
            {label: "Explore", path: "/explore"},
            {label: "How It Works", path: "/#how"},
            {label: "For Restaurants", path: "/for-restaurants"}
          ].map(item => (
              <span key={item.label} style={{
                color: item.path === "/for-restaurants" ? C.amber : C.textMuted,
                fontSize: 14,
                fontWeight: item.path === "/for-restaurants" ? 700 : 500,
                cursor: "pointer",
                transition: "color 0.2s",
              }}
                    onClick={() => {
                      if (item.path.startsWith('#')) {
                        navigate('/');
                        setTimeout(() => {
                          document.querySelector(item.path)?.scrollIntoView({behavior:'smooth'});
                        }, 100);
                      } else {
                        navigate(item.path);
                      }
                    }}
                    onMouseEnter={e => e.target.style.color = C.amber}
                    onMouseLeave={e => e.target.style.color = item.path === "/for-restaurants" ? C.amber : C.textMuted}
              >{item.label}</span>
          ))}
        </div>

        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={() => navigate('/login')} style={{
            background:"transparent", border:"none",
            color:C.textMid, fontSize:14, fontWeight:500,
            cursor:"pointer", padding:"7px 14px",
            fontFamily:"'DM Sans', sans-serif",
          }}>Sign In</button>
          <button onClick={() => navigate('/login')} style={{
            background:C.amber, border:"none",
            color:"#fff", fontSize:14, fontWeight:600,
            cursor:"pointer", padding:"8px 20px", borderRadius:10,
            fontFamily:"'DM Sans', sans-serif",
          }}>Get Started</button>
        </div>
      </Navbar>

      {/* ── HERO ── */}
      <section style={{
        paddingTop:130, paddingBottom:72,
        paddingLeft:"6%", paddingRight:"6%",
        textAlign:"center",
      }}>
        <div className="f1" style={{
          display:"inline-flex", alignItems:"center", gap:7,
          background:C.amberSoft,
          border:`1px solid ${C.amber}45`,
          borderRadius:100, padding:"5px 16px", marginBottom:22,
        }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:C.amber, display:"inline-block" }} />
          <span style={{ color:C.amber, fontSize:13, fontWeight:600 }}>
            Live in Pune · 120+ restaurants
          </span>
        </div>

        <h1 className="f2" style={{
          fontFamily:"'Playfair Display', serif",
          fontSize:"clamp(34px, 5.5vw, 62px)",
          fontWeight:900, color:C.text,
          lineHeight:1.12, marginBottom:16, letterSpacing:-0.5,
        }}>
          Your perfect table,<br />
          <span style={{ color:C.amber, fontStyle:"italic" }}>reserved in seconds.</span>
        </h1>

        <p className="f3" style={{
          color:C.textMuted, fontSize:16,
          maxWidth:480, margin:"0 auto 38px",
          lineHeight:1.7, fontWeight:400,
        }}>
          Discover restaurants near you, book instantly or in advance,
          pre-order your food, and walk in like you own the place.
        </p>

        <div className="f4" style={{ maxWidth:540, margin:"0 auto" }}>
          <div style={{
            display:"flex", alignItems:"center",
            background:"#fff",
            border:`1.5px solid ${focused ? C.amber : C.border}`,
            borderRadius:14,
            padding:"6px 6px 6px 16px", gap:10,
            boxShadow: focused
              ? `0 0 0 3px ${C.amber}20, 0 6px 24px rgba(0,0,0,0.07)`
              : "0 4px 16px rgba(0,0,0,0.06)",
            transition:"all 0.25s ease",
          }}>
            <span style={{ fontSize:17, opacity:0.45 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search restaurant, cuisine, or area..."
              style={{
                flex:1, border:"none", outline:"none",
                background:"transparent", color:C.text,
                fontSize:14, fontFamily:"'DM Sans', sans-serif",
              }}
            />
            <button onClick={handleSearch} style={{
              background:C.amber, border:"none",
              color:"#fff", fontWeight:700, fontSize:14,
              padding:"11px 20px", borderRadius:10,
              cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
              whiteSpace:"nowrap",
            }}>Find Tables</button>
          </div>

          <div style={{ display:"flex", gap:8, marginTop:12, justifyContent:"center", flexWrap:"wrap" }}>
            {["🍛 Biryani","🍕 Italian","🥩 BBQ","🍣 Japanese","☕ Café"].map(t => (
              <span key={t} onClick={() => { setSearch(t.split(" ")[1]); navigate(`/explore?search=${t.split(" ")[1]}`); }} style={{
                background:"#fff", border:`1px solid ${C.border}`,
                color:C.textMuted, fontSize:12,
                padding:"5px 13px", borderRadius:100,
                cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
                transition:"all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.amber; e.currentTarget.style.color=C.amber; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textMuted; }}
              >{t}</span>
            ))}
          </div>
        </div>

        <div style={{
          display:"flex", gap:40, justifyContent:"center",
          marginTop:48, paddingTop:32,
          borderTop:`1px solid ${C.border}`,
          flexWrap:"wrap",
        }}>
          {[
            { val:"120+", label:"Restaurants"  },
            { val:"50K+", label:"Happy Diners" },
            { val:"4.8★", label:"Avg Rating"   },
            { val:"<60s", label:"To Book"      },
          ].map(s => (
            <div key={s.label} style={{ textAlign:"center" }}>
              <div style={{
                fontFamily:"'Playfair Display', serif",
                fontSize:26, fontWeight:700, color:C.amber,
              }}>{s.val}</div>
              <div style={{
                color:C.textMuted, fontSize:12, marginTop:3,
                fontFamily:"'DM Sans', sans-serif",
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BIG EXPLORE CTA SECTION ── */}
      <section style={{
        padding:"80px 6%",
        background: `linear-gradient(135deg, ${C.terracotta}15, ${C.amber}10)`,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        position:"relative",
        overflow:"hidden",
      }}>
        <div className="float" style={{
          position:"absolute", top:"15%", left:"10%",
          fontSize:48, opacity:0.3,
        }}>🍕</div>
        <div className="float" style={{
          position:"absolute", top:"60%", right:"15%",
          fontSize:52, opacity:0.25, animationDelay:"0.5s",
        }}>🍜</div>
        <div className="float" style={{
          position:"absolute", bottom:"20%", left:"20%",
          fontSize:44, opacity:0.3, animationDelay:"1s",
        }}>🥗</div>
        <div className="float" style={{
          position:"absolute", top:"40%", right:"8%",
          fontSize:50, opacity:0.2, animationDelay:"1.5s",
        }}>🍱</div>

        <div style={{
          textAlign:"center",
          position:"relative",
          zIndex:1,
        }}>
          <div style={{
            display:"inline-flex",
            alignItems:"center",
            gap:8,
            background: C.amber + "25",
            border: `1px solid ${C.amber}50`,
            borderRadius:100,
            padding:"6px 18px",
            marginBottom:24,
          }}>
            <span style={{ fontSize:16 }}>🔥</span>
            <span style={{
              color: C.amber,
              fontSize:13,
              fontWeight:700,
              letterSpacing:1,
              fontFamily:"'DM Sans', sans-serif",
            }}>READY TO DINE?</span>
          </div>

          <h2 style={{
            fontFamily:"'Playfair Display', serif",
            fontSize:"clamp(36px, 5vw, 68px)",
            fontWeight:900,
            color:C.text,
            lineHeight:1.1,
            marginBottom:20,
            letterSpacing:-1,
          }}>
            <span style={{ color:C.terracotta, fontStyle:"italic" }}>Hungry?</span><br />
            Let's find your table.
          </h2>

          <p style={{
            color:C.textMid,
            fontSize:18,
            maxWidth:520,
            margin:"0 auto 40px",
            lineHeight:1.6,
            fontFamily:"'DM Sans', sans-serif",
          }}>
            120+ restaurants waiting for you. Instant booking. Pre-order ready. Zero hassle.
          </p>

          <button className="pulse-btn" onClick={() => navigate('/explore')} style={{
            background:C.amber,
            border:"none",
            color:"#fff",
            fontSize:20,
            fontWeight:700,
            padding:"18px 48px",
            borderRadius:14,
            cursor:"pointer",
            fontFamily:"'DM Sans', sans-serif",
            boxShadow:"0 8px 32px rgba(212,136,58,0.3)",
            transition:"all 0.3s ease",
          }}
            onMouseEnter={e => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 12px 40px rgba(212,136,58,0.4)";
            }}
            onMouseLeave={e => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 8px 32px rgba(212,136,58,0.3)";
            }}
          >
            🍽️ Explore Restaurants →
          </button>

          <p style={{
            color:C.textMuted,
            fontSize:13,
            marginTop:16,
            fontFamily:"'DM Sans', sans-serif",
          }}>
            ⚡ Book in under 60 seconds
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding:"68px 6%", background:C.bg }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <p style={{
            color:C.amber, fontSize:11, fontWeight:700,
            letterSpacing:2.5, textTransform:"uppercase",
            fontFamily:"'DM Sans', sans-serif", marginBottom:10,
          }}>Simple Process</p>
          <h2 style={{
            fontFamily:"'Playfair Display', serif",
            fontSize:"clamp(22px, 3vw, 34px)",
            fontWeight:700, color:C.text,
          }}>How TableMint works</h2>
        </div>

        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          {steps.map(s => (
            <div key={s.num} style={{
              flex:1, minWidth:220,
              background:"#fff",
              border:`1.5px solid ${C.border}`,
              borderRadius:16, padding:"30px 24px",
              position:"relative", overflow:"hidden",
            }}>
              <div style={{
                position:"absolute", top:12, right:16,
                fontFamily:"'Playfair Display', serif",
                fontSize:54, fontWeight:900,
                color:C.amber + "12", lineHeight:1, userSelect:"none",
              }}>{s.num}</div>
              <div style={{ fontSize:30, marginBottom:12 }}>{s.icon}</div>
              <h3 style={{
                fontFamily:"'Playfair Display', serif",
                fontSize:18, fontWeight:700, color:C.text, marginBottom:8,
              }}>{s.title}</h3>
              <p style={{
                color:C.textMuted, fontSize:14,
                lineHeight:1.65, fontFamily:"'DM Sans', sans-serif",
              }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOOKING BANNER ── */}
      <section style={{
        padding:"56px 6%",
        background:C.bgSoft,
        borderTop:`1px solid ${C.border}`,
      }}>
        <div style={{
          background:"#fff",
          border:`1.5px solid ${C.border}`,
          borderRadius:18, padding:"44px 5%",
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          gap:28, flexWrap:"wrap",
        }}>
          <div style={{ maxWidth:500 }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background:C.amberSoft,
              border:`1px solid ${C.amber}40`,
              borderRadius:100, padding:"4px 14px", marginBottom:16,
            }}>
              <span style={{ fontSize:12 }}>⚡</span>
              <span style={{
                color:C.amber, fontSize:12, fontWeight:700,
                letterSpacing:0.8, fontFamily:"'DM Sans', sans-serif",
              }}>INSTANT BOOKING</span>
            </div>

            <h2 style={{
              fontFamily:"'Playfair Display', serif",
              fontSize:"clamp(20px, 2.8vw, 32px)",
              fontWeight:700, color:C.text,
              marginBottom:12, lineHeight:1.25,
            }}>
              Arriving within 60 minutes?<br />
              <span style={{ color:C.amber, fontStyle:"italic" }}>Your table is already waiting.</span>
            </h2>

            <p style={{
              color:C.textMuted, fontSize:14,
              lineHeight:1.7, fontFamily:"'DM Sans', sans-serif", maxWidth:440,
            }}>
              Tell us your ETA, pick your seats, pre-order from the menu, and pay
              a small reservation fee (₹100–₹500). Cancel within 30% of your window for a full refund.
            </p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:11, minWidth:200 }}>
            <button onClick={() => navigate('/explore')} style={{
              background:C.amber, border:"none",
              color:"#fff", fontWeight:700, fontSize:15,
              padding:"13px 26px", borderRadius:11,
              cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
            }}>⚡ Book Instantly</button>
            <button onClick={() => navigate('/explore')} style={{
              background:"transparent",
              border:`1.5px solid ${C.border}`,
              color:C.textMid, fontWeight:600, fontSize:14,
              padding:"12px 26px", borderRadius:11,
              cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
            }}>📅 Schedule for Later</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background:"#fff",
        borderTop:`1px solid ${C.border}`,
        padding:"40px 6% 24px",
      }}>
        <div style={{
          display:"flex", justifyContent:"space-between",
          flexWrap:"wrap", gap:28, marginBottom:32,
        }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:19 }}>🍽️</span>
              <span style={{
                fontFamily:"'Playfair Display', serif",
                fontSize:17, fontWeight:700, color:C.text,
              }}>Table<span style={{ color:C.amber }}>Mint</span></span>
            </div>
            <p style={{
              color:C.textMuted, fontSize:13,
              maxWidth:210, lineHeight:1.65,
              fontFamily:"'DM Sans', sans-serif",
            }}>The smarter way to discover and book the best tables near you.</p>
          </div>

          {[
            { title:"Product",  links:["Browse","Instant Book","Pre-Order","My Bookings"] },
            { title:"Business", links:["Partner With Us","Captain App","Pricing","Support"] },
            { title:"Company",  links:["About","Blog","Contact","Privacy"] },
          ].map(col => (
            <div key={col.title}>
              <p style={{
                color:C.text, fontSize:12, fontWeight:700,
                letterSpacing:1, textTransform:"uppercase",
                fontFamily:"'DM Sans', sans-serif", marginBottom:12,
              }}>{col.title}</p>
              {col.links.map(l => (
                <p key={l} style={{
                  color:C.textMuted, fontSize:13,
                  fontFamily:"'DM Sans', sans-serif",
                  marginBottom:8, cursor:"pointer", transition:"color 0.2s",
                }}
                  onMouseEnter={e => e.target.style.color = C.amber}
                  onMouseLeave={e => e.target.style.color = C.textMuted}
                >{l}</p>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          borderTop:`1px solid ${C.border}`,
          paddingTop:18,
          display:"flex", justifyContent:"space-between",
          flexWrap:"wrap", gap:10,
        }}>
          <span style={{ color:C.textMuted, fontSize:12, fontFamily:"'DM Sans', sans-serif" }}>
            © 2025 TableMint. All rights reserved.
          </span>
          <span style={{ color:C.textMuted, fontSize:12, fontFamily:"'DM Sans', sans-serif" }}>
            Made with 🧡 for food lovers
          </span>
        </div>
      </footer>
    </div>
  );
}
