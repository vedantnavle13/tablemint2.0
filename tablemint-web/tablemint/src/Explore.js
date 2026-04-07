import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import ShareToGroupModal from "./components/ShareToGroupModal";


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


function Card({ r, navigate }) {
  const [hovered, setHovered] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const lowSeats = r.seats <= 6;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.bgCard,
        border: `1.5px solid ${hovered ? C.amber + "70" : C.border}`,
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: hovered
          ? "0 12px 40px rgba(180,120,40,0.18)"
          : "0 4px 16px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
      }}
    >
      <div style={{
        height: 220,
        position: "relative",
        overflow: "hidden",
        background: C.bgSoft,
      }}>
        <div style={{
          width: "100%",
          height: "100%",
          backgroundImage: `url('${r.image}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "transform 0.3s ease",
          transform: hovered ? "scale(1.05)" : "scale(1)",
        }} />
        
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
        }} />

        <div style={{
          position:"absolute", top:14, left:14,
          background: r.tagColor,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "5px 12px",
          borderRadius: 20,
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: 0.3,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>{r.tag}</div>

        <div style={{
          position:"absolute", top:14, right:14,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          color: lowSeats ? C.red : C.green,
          fontSize: 12,
          fontWeight: 700,
          padding: "6px 14px",
          borderRadius: 20,
          fontFamily: "'DM Sans', sans-serif",
          border: `1.5px solid ${lowSeats ? C.red + "40" : C.green + "40"}`,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}>
          <span style={{ fontSize: 10 }}>🪑</span>
          {r.seats} seats
        </div>

        <div style={{
          position:"absolute",
          bottom: 12,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            📍 {r.distance}
          </div>
          <div style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            🕐 {r.hours}
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start", 
          marginBottom: 8,
          gap: 12,
        }}>
          <h3 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            margin: 0,
            lineHeight: 1.2,
          }}>{r.name}</h3>
          <div style={{
            background: C.amberSoft,
            color: C.amber,
            fontSize: 13,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 10,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            ★ {r.rating}
          </div>
        </div>

        <p style={{
          color: C.textMid,
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          margin: "0 0 10px",
          fontWeight: 500,
        }}>{r.cuisine}</p>

        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ 
            fontSize: 14, 
            color: C.amber,
            marginTop: 2,
          }}>📍</span>
          <p style={{
            color: C.textMuted,
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            margin: 0,
            lineHeight: 1.5,
            flex: 1,
          }}>{r.address}</p>
        </div>

        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.textMuted, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Reservation fee</span>
            <span style={{ color: C.amber, fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
              ₹{r.reservationFee || 0}
            </span>
          </div>
          
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
              title="Share to a group"
              style={{
                background: "transparent",
                border: `2px solid ${C.border}`,
                color: C.textMuted,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                padding: "10px 14px",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.25s ease",
                display: "flex", alignItems: "center", gap: 5,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
            >
              👥 Share
            </button>
            <button onClick={() => navigate(`/restaurant/${r.id}`)} style={{
              background: hovered ? C.amber : "transparent",
              border: `2px solid ${hovered ? C.amber : C.border}`,
              color: hovered ? "#fff" : C.textMid,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              padding: "10px 24px",
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.25s ease",
              whiteSpace: "nowrap",
            }}>
              Reserve →
            </button>
          </div>
        </div>
      </div>
      {showShareModal && (
        <ShareToGroupModal
          restaurant={{ _id: r.id, name: r.name, image: r.image, cuisine: r.cuisine, rating: r.rating, price: r.price }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || "");
  const [focused, setFocused] = useState(false);
  const [filter, setFilter] = useState("All");
  const [, setScrolled] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const filters = ["All","Nearby","Instant Book","Top Rated","Pre-Order"];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Fetch real restaurants from API
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter === "Instant Book") params.set("instantBook", "true");
    if (filter === "Top Rated") params.set("sort", "rating");

    axios.get(`/restaurants?${params.toString()}`)
      .then(res => {
        const raw = res.data.data.restaurants || [];
        // Map MongoDB fields to what Card component expects
        const mapped = raw.map(r => ({
          id: r._id,
          name: r.name,
          cuisine: Array.isArray(r.cuisine) ? r.cuisine.join(" · ") : r.cuisine || "",
          area: r.address?.area || r.address?.city || "Pune",
          address: [r.address?.street, r.address?.area, r.address?.city].filter(Boolean).join(", "),
          rating: r.avgRating || "New",
          seats: r.totalSeats || 0,
          price: r.priceRange === "budget" ? "₹" : r.priceRange === "moderate" ? "₹₹" : r.priceRange === "expensive" ? "₹₹₹" : "₹₹₹₹",
          tag: r.isFeatured ? "Featured" : r.avgRating >= 4.5 ? "Top Rated" : r.instantBookingEnabled ? "Instant Book" : "New",
          tagColor: r.isFeatured ? "#8B5CF6" : r.avgRating >= 4.5 ? C.amber : r.instantBookingEnabled ? C.green : C.blue,
          image: r.coverImage || r.images?.[0] || "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800",
          hours: r.operatingHours?.[0] ? `${r.operatingHours[0].open} - ${r.operatingHours[0].close}` : "Open Daily",
          distance: "—",
          reservationFee: r.reservationFee,
          instantBookingEnabled: r.instantBookingEnabled,
        }));
        setRestaurants(mapped);
      })
      .catch(() => setRestaurants([]))
      .finally(() => setLoadingData(false));
  }, [filter]);

  const shown = restaurants.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(search.toLowerCase()) ||
    r.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: C.bg, minHeight:"100vh", fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:#D4C4B0; border-radius:3px; }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(30px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .hero-overlay { animation: fadeIn 0.8s ease; }
        .hero-text { animation: slideUp 0.8s ease 0.2s both; }
      `}</style>

      <Navbar style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 60, padding: "0 6%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(253,250,246,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate('/')}>
          <span style={{ fontSize: 21 }}>🍽️</span>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, fontWeight: 700, color: C.text,
          }}>Table<span style={{ color: C.amber }}>Mint</span></span>
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {[
            {label: "Home", path: "/"},
            {label: "How It Works", path: "/#how"},
            {label: "For Restaurants", path: "/#restaurants"}
          ].map(item => (
            <span key={item.label} style={{
              color: C.textMuted, fontSize: 14, fontWeight: 500,
              cursor: "pointer", transition: "color 0.2s",
            }}
              onClick={() => navigate(item.path)}
              onMouseEnter={e => e.target.style.color = C.text}
              onMouseLeave={e => e.target.style.color = C.textMuted}
            >{item.label}</span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={{
            background: "transparent", border: "none",
            color: C.textMid, fontSize: 14, fontWeight: 500,
            cursor: "pointer", padding: "7px 14px",
            fontFamily: "'DM Sans', sans-serif",
          }}>Sign In</button>
          <button style={{
            background: C.amber, border: "none",
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", padding: "8px 20px", borderRadius: 10,
            fontFamily: "'DM Sans', sans-serif",
          }}>Get Started</button>
        </div>
      </Navbar>

      <section style={{
        marginTop: 60,
        height: "50vh",
        minHeight: 400,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.6)",
        }} />

        <div className="hero-overlay" style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(135deg, rgba(44,36,22,0.7), rgba(196,97,74,0.5))",
        }} />

        <div className="hero-text" style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          color: "#fff",
          padding: "0 6%",
          maxWidth: 800,
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 100,
            padding: "6px 18px",
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1.5,
              fontFamily: "'DM Sans', sans-serif",
              textTransform: "uppercase",
            }}>Curated Dining Experiences</span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 16,
            letterSpacing: -0.5,
          }}>
            Discover Pune's<br />
            <span style={{ 
              fontStyle: "italic",
              background: "linear-gradient(135deg, #F2B865, #E8A045)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Finest Tables</span>
          </h1>

          <p style={{
            fontSize: 18,
            lineHeight: 1.6,
            opacity: 0.95,
            fontFamily: "'DM Sans', sans-serif",
            maxWidth: 540,
            margin: "0 auto 32px",
            fontWeight: 400,
          }}>
            From cozy bistros to Michelin-worthy experiences. Your perfect meal is just a reservation away.
          </p>

          <div style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
          }}>
            <div style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}>
              🍽️ 120+ Restaurants
            </div>
            <div style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}>
              ⚡ Instant Booking
            </div>
            <div style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "8px 16px",
              borderRadius: 100,
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}>
              🌟 Top Rated
            </div>
          </div>
        </div>
      </section>

      <section style={{
        paddingTop: 30, paddingBottom: 20,
        paddingLeft: "6%", paddingRight: "6%",
        background: C.bg,
        position: "sticky", top: 60, zIndex: 50,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "#fff",
            border: `1.5px solid ${focused ? C.amber : C.border}`,
            borderRadius: 14,
            padding: "6px 6px 6px 16px", gap: 10,
            boxShadow: focused
              ? `0 0 0 3px ${C.amber}20, 0 6px 24px rgba(0,0,0,0.07)`
              : "0 4px 16px rgba(0,0,0,0.06)",
            transition: "all 0.25s ease",
          }}>
            <span style={{ fontSize: 17, opacity: 0.45 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search restaurant, cuisine, or area..."
              style={{
                flex: 1, border: "none", outline: "none",
                background: "transparent", color: C.text,
                fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              }}
            />
            <button style={{
              background: C.amber, border: "none",
              color: "#fff", fontWeight: 700, fontSize: 14,
              padding: "11px 20px", borderRadius: 10,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
            }}>Search</button>
          </div>
        </div>
      </section>

      <section style={{
        padding: "40px 6% 60px",
        background: C.bg,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", marginBottom: 22,
          flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <p style={{
              color: C.amber, fontSize: 11, fontWeight: 700,
              letterSpacing: 2.5, textTransform: "uppercase",
              fontFamily: "'DM Sans', sans-serif", marginBottom: 6,
            }}>📍 Near You · Pune</p>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(22px, 3vw, 34px)",
              fontWeight: 700, color: C.text,
            }}>
              {shown.length} Restaurant{shown.length !== 1 ? 's' : ''} Available
            </h2>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? C.amber : "#fff",
              border: `1.5px solid ${filter === f ? C.amber : C.border}`,
              color: filter === f ? "#fff" : C.textMid,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: filter === f ? 600 : 500,
              fontSize: 13, padding: "7px 16px",
              borderRadius: 100, cursor: "pointer",
              transition: "all 0.2s ease",
            }}>{f}</button>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 24,
        }}>
          {loadingData ? (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 0", color:C.textMuted, fontSize:15 }}>
              Loading restaurants…
            </div>
          ) : shown.length === 0 ? (
            <div style={{
              gridColumn: "1/-1", textAlign: "center",
              padding: "48px 0", color: C.textMuted,
              fontFamily: "'DM Sans', sans-serif", fontSize: 15,
            }}>
              {search ? `No restaurants found for "${search}" 🍽️` : "No restaurants available yet. Check back soon!"}
            </div>
          ) : (
            shown.map(r => <Card key={r.id} r={r} navigate={navigate} />)
          )}
        </div>
      </section>

      <footer style={{
        background: "#fff",
        borderTop: `1px solid ${C.border}`,
        padding: "40px 6% 24px",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          flexWrap: "wrap", gap: 28, marginBottom: 32,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 19 }}>🍽️</span>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 17, fontWeight: 700, color: C.text,
              }}>Table<span style={{ color: C.amber }}>Mint</span></span>
            </div>
            <p style={{
              color: C.textMuted, fontSize: 13,
              maxWidth: 210, lineHeight: 1.65,
              fontFamily: "'DM Sans', sans-serif",
            }}>The smarter way to discover and book the best tables near you.</p>
          </div>

          {[
            { title: "Product", links: ["Browse", "Instant Book", "Pre-Order", "My Bookings"] },
            { title: "Business", links: ["Partner With Us", "Captain App", "Pricing", "Support"] },
            { title: "Company", links: ["About", "Blog", "Contact", "Privacy"] },
          ].map(col => (
            <div key={col.title}>
              <p style={{
                color: C.text, fontSize: 12, fontWeight: 700,
                letterSpacing: 1, textTransform: "uppercase",
                fontFamily: "'DM Sans', sans-serif", marginBottom: 12,
              }}>{col.title}</p>
              {col.links.map(l => (
                <p key={l} style={{
                  color: C.textMuted, fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: 8, cursor: "pointer", transition: "color 0.2s",
                }}
                  onMouseEnter={e => e.target.style.color = C.amber}
                  onMouseLeave={e => e.target.style.color = C.textMuted}
                >{l}</p>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          borderTop: `1px solid ${C.border}`,
          paddingTop: 18,
          display: "flex", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ color: C.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            © 2025 TableMint. All rights reserved.
          </span>
          <span style={{ color: C.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
            Made with 🧡 for food lovers
          </span>
        </div>
      </footer>
    </div>
  );
}
