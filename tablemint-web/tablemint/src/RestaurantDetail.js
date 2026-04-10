import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import Navbar from "./Navbar";
import ShareToGroupModal from "./components/ShareToGroupModal";


const C = {
  bg: "#FDFAF6",
  bgSoft: "#F5F0E8",
  bgCard: "#FFFFFF",
  border: "#E8E0D0",
  amber: "#D4883A",
  amberSoft: "#FBF0E0",
  text: "#2C2416",
  textMid: "#6B5B45",
  textMuted: "#A0907A",
  green: "#4A9B6F",
  red: "#D05A4A",
};


export default function RestaurantDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isLoggedIn } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState("");

  // ── User location + distance ──────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState(null);   // { lat, lng }
  const [distanceKm, setDistanceKm] = useState(null);       // number | null
  const [geoStatus, setGeoStatus] = useState("idle");       // "idle" | "loading" | "ok" | "denied"

  // Haversine formula (straight-line km between two lat/lng points)
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Silently detect user location on mount
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus("denied"); return; }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Fetch restaurant from API
  useEffect(() => {
    axios.get(`/restaurants/${id}`)
      .then(res => {
        const r = res.data.data.restaurant;
        // Build image array: cover first, then gallery
        const coverUrl = r.coverImage?.url || null;
        const galleryUrls = (r.gallery || []).map(g => g.url).filter(Boolean);
        const allImages = [
          ...(coverUrl ? [coverUrl] : []),
          ...galleryUrls,
        ];
        if (allImages.length === 0) allImages.push('https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800');

        setRestaurant({
          ...r,
          id: r._id,
          area: r.address?.area || r.address?.city || 'Pune',
          address: [r.address?.street, r.address?.area, r.address?.city].filter(Boolean).join(', '),
          rating: r.avgRating || 0,
          totalReviews: r.totalReviews || 0,
          hours: r.operatingHours?.[0] ? `${r.operatingHours[0].open} - ${r.operatingHours[0].close}` : 'Open Daily',
          images: allImages,
          galleryImages: galleryUrls,
          // Store GeoJSON coordinates for distance + Maps link
          lat: r.location?.coordinates?.[1] ?? null,
          lng: r.location?.coordinates?.[0] ?? null,
          menu: (r.menu || []).map(item => ({
            id: item._id,
            name: item.name,
            price: item.price,
            description: item.description || '',
            category: item.category,
            veg: item.isVeg,
            image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
          })),
          reviews: [],
          specialties: r.specialties?.join(', ') || '',
          dietaryOptions: r.dietaryOptions?.join(', ') || '',
          features: r.features?.join(', ') || '',
        });
      })
      .catch(() => setRestaurant(null))
      .finally(() => setLoadingRestaurant(false));
  }, [id]);

  // ── Reviews ───────────────────────────────────────────────────────────────
  const [reviews, setReviews]               = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTotal, setReviewsTotal]     = useState(0);
  const [reviewsHasMore, setReviewsHasMore] = useState(false);
  const [reviewsPage, setReviewsPage]       = useState(1);
  const [lightboxImg, setLightboxImg]       = useState(null);

  // Fetch reviews (independent of restaurant data)
  useEffect(() => {
    setReviewsLoading(true);
    setReviews([]);
    axios.get(`/restaurants/${id}/reviews?limit=8&sort=-createdAt`)
      .then(res => {
        setReviews(res.data.data?.reviews || []);
        setReviewsTotal(res.data.total || 0);
        setReviewsHasMore((res.data.totalPages || 1) > 1);
        setReviewsPage(1);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [id]);

  const loadMoreReviews = () => {
    const next = reviewsPage + 1;
    axios.get(`/restaurants/${id}/reviews?page=${next}&limit=8&sort=-createdAt`)
      .then(res => {
        setReviews(p => [...p, ...(res.data.data?.reviews || [])]);
        setReviewsHasMore(next < (res.data.totalPages || 1));
        setReviewsPage(next);
      })
      .catch(() => {});
  };

  // Recompute distance whenever userLocation or restaurant changes
  useEffect(() => {
    if (!userLocation || !restaurant?.lat || !restaurant?.lng) return;
    const km = haversineKm(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng);
    setDistanceKm(Math.round(km * 10) / 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, restaurant]);

  const [bookingMode, setBookingMode] = useState("instant");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [arrivalTime, setArrivalTime] = useState(30);
  const [preOrderItems, setPreOrderItems] = useState([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (bookingMode === "instant") {
      setSelectedDate(getTodayDate());
      setSelectedTime("");
    }
  }, [bookingMode]);

  if (loadingRestaurant) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, border: `4px solid ${C.border}`, borderTop: `4px solid ${C.amber}`,
            borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px"
          }} />
          <p style={{ color: C.textMuted, fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>Loading restaurant…</p>
          <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <h2>Restaurant not found</h2>
        <button onClick={() => navigate('/explore')} style={{
          marginTop: 20, padding: "12px 24px", background: C.amber,
          border: "none", borderRadius: 10, color: "#fff",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>Back to Explore</button>
      </div>
    );
  }

  const togglePreOrder = (item) => {
    if (preOrderItems.find(i => i.id === item.id)) {
      setPreOrderItems(preOrderItems.filter(i => i.id !== item.id));
    } else {
      setPreOrderItems([...preOrderItems, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, change) => {
    setPreOrderItems(preOrderItems.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(1, item.quantity + change) } : item
    ));
  };

  const totalPreOrderCost = preOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleReservation = async () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: { pathname: `/restaurant/${id}` } } });
      return;
    }

    setBookingLoading(true);
    setBookingError("");
    setBookingSuccess(null);

    try {
      let scheduledAt;
      if (bookingMode === "instant") {
        scheduledAt = new Date(Date.now() + arrivalTime * 60 * 1000).toISOString();
      } else {
        scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      }

      const payload = {
        restaurantId: restaurant._id,
        type: bookingMode === "instant" ? "instant" : "scheduled",
        scheduledAt,
        arrivalInMinutes: bookingMode === "instant" ? parseInt(arrivalTime) : null,
        numberOfGuests: guestCount,
        preOrderItems: preOrderItems.map(item => ({
          menuItem: item.id,
          quantity: item.quantity,
        })),
      };

      const res = await axios.post('/reservations', payload);
      const reservation = res.data.data.reservation;
      setBookingSuccess({
        confirmationCode: reservation.confirmationCode,
        scheduledAt: reservation.scheduledAt,
        numberOfGuests: reservation.numberOfGuests,
        reservationFee: reservation.reservationFee,
        preOrderTotal: reservation.preOrderTotal,
      });
      setPreOrderItems([]);
    } catch (err) {
      setBookingError(err.response?.data?.message || err.message || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const isFormValid = bookingMode === "instant" || (selectedDate && selectedTime);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:8px; }
        ::-webkit-scrollbar-thumb { background:#D4C4B0; border-radius:4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Navbar style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 60, padding: "0 6%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(253,250,246,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate('/')}>
          <span style={{ fontSize: 21 }}>🍽️</span>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, fontWeight: 700, color: C.text,
          }}>Table<span style={{ color: C.amber }}>Mint</span></span>
        </div>
        <button onClick={() => navigate('/explore')} style={{
          background: "transparent", border: `1.5px solid ${C.border}`,
          color: C.textMid, fontSize: 14, fontWeight: 600,
          padding: "8px 20px", borderRadius: 10, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
        }}>← Back to Explore</button>
      </Navbar>

      <section style={{ marginTop: 60, height: "60vh", minHeight: 450, position: "relative" }}>
        <div style={{
          width: "100%", height: "100%",
          backgroundImage: `url('${restaurant.images[currentImage]}')`,
          backgroundSize: "cover", backgroundPosition: "center",
          transition: "background-image 0.5s ease",
        }} />
        <div style={{
          position: "absolute", bottom: 20, left: "50%",
          transform: "translateX(-50%)", display: "flex", gap: 10,
        }}>
          {restaurant.images.map((_, idx) => (
            <div key={idx} onClick={() => setCurrentImage(idx)} style={{
              width: currentImage === idx ? 32 : 8, height: 8, borderRadius: 4,
              background: currentImage === idx ? C.amber : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "all 0.3s ease",
            }} />
          ))}
        </div>
      </section>

      <div style={{ padding: "40px 6% 60px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 40 }}>
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 42, fontWeight: 900, color: C.text, marginBottom: 12,
              }}>{restaurant.name}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18, color: C.amber }}>★</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{restaurant.rating}</span>
                  <span style={{ fontSize: 14, color: C.textMuted }}>({restaurant.totalReviews} reviews)</span>
                </div>
                <span style={{ color: C.textMuted }}>•</span>
                <span style={{ fontSize: 15, color: C.textMid, fontWeight: 500 }}>{restaurant.cuisine}</span>
                <span style={{ color: C.textMuted }}>•</span>
                <span style={{ fontSize: 15, color: C.textMid }}>{restaurant.priceRange}</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📅</span>
                  <span style={{ fontSize: 14, color: C.textMuted }}>{restaurant.area}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🕐</span>
                  <span style={{ fontSize: 14, color: C.textMuted }}>{restaurant.hours}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📞</span>
                  <span style={{ fontSize: 14, color: C.textMuted }}>{restaurant.phone}</span>
                </div>
              </div>

              {/* Distance from user + Google Maps link */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
                {/* Distance badge */}
                {geoStatus === "loading" && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 20,
                    background: C.bgSoft, border: `1px solid ${C.border}`,
                    fontSize: 13, color: C.textMuted, fontWeight: 600
                  }}>
                    <span style={{
                      display: "inline-block", width: 10, height: 10,
                      border: `2px solid ${C.border}`, borderTopColor: C.amber,
                      borderRadius: "50%", animation: "spin 0.7s linear infinite"
                    }} />
                    Detecting your location…
                  </div>
                )}
                {distanceKm !== null && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 20,
                    background: C.green + "15", border: `1.5px solid ${C.green}40`,
                    fontSize: 13, color: C.green, fontWeight: 700,
                  }}>
                    📍 {distanceKm} km away from you
                  </div>
                )}

                {/* Google Maps link */}
                {restaurant.lat && restaurant.lng && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${restaurant.lat},${restaurant.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 20,
                      background: "#EAF4FF", border: "1.5px solid #1a73e840",
                      fontSize: 13, color: "#1a73e8", fontWeight: 600,
                      textDecoration: "none", transition: "all 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                    onMouseLeave={e => e.currentTarget.style.background = "#EAF4FF"}
                  >
                    🗺️ View on Google Maps
                  </a>
                )}
              </div>

              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>📍 {restaurant.address}</p>

              {/* Share to Group button */}
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px', borderRadius: 12,
                  background: '#eff6ff', border: '1.5px solid #bfdbfe',
                  color: '#2563eb', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share to Group
              </button>
            </div>

            <div style={{
              background: C.bgCard, padding: 24, borderRadius: 16,
              border: `1px solid ${C.border}`, marginBottom: 32,
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12,
              }}>About</h3>
              <p style={{ fontSize: 15, color: C.textMid, lineHeight: 1.7, marginBottom: 20 }}>{restaurant.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: C.amber, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>SPECIALTIES</div>
                  <div style={{ fontSize: 14, color: C.textMid }}>{restaurant.specialties}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.amber, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>DIETARY OPTIONS</div>
                  <div style={{ fontSize: 14, color: C.textMid }}>{restaurant.dietaryOptions}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: C.amber, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>FEATURES</div>
                  <div style={{ fontSize: 14, color: C.textMid }}>{restaurant.features}</div>
                </div>
              </div>
            </div>

            {/* GALLERY GRID */}
            {restaurant.galleryImages?.length > 0 && (
              <div style={{
                background: C.bgCard, padding: 24, borderRadius: 16,
                border: `1px solid ${C.border}`, marginBottom: 32,
              }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 16,
                }}>📸 Photo Gallery</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 10,
                }}>
                  {restaurant.galleryImages.map((url, idx) => (
                    <div key={idx} style={{
                      height: 150,
                      borderRadius: 12,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: `1.5px solid ${C.border}`,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                      onClick={() => setCurrentImage(restaurant.images.indexOf(url) !== -1 ? restaurant.images.indexOf(url) : 0)}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <img
                        src={url}
                        alt={`${restaurant.name} gallery ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400'; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BEAUTIFUL PRE-ORDER BOX */}
            <div style={{
              background: "linear-gradient(135deg, #FFF9F0 0%, #FFF5E6 100%)",
              padding: 32, borderRadius: 20,
              border: `2px solid ${C.amber}40`,
              marginBottom: 32, position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -30, right: -30,
                width: 140, height: 140,
                background: C.amber + "15",
                borderRadius: "50%", filter: "blur(50px)",
              }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: C.amber + "20",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28,
                  }}>🍽️</div>
                  <div>
                    <h3 style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 26, fontWeight: 700, color: C.text, margin: 0,
                    }}>Pre-Order Your Food</h3>
                    <p style={{ fontSize: 14, color: C.textMid, margin: 0 }}>
                      Save time — your food ready when you arrive!
                    </p>
                  </div>
                </div>

                {preOrderItems.length > 0 && (
                  <div style={{
                    background: "#fff", padding: 20, borderRadius: 14,
                    marginBottom: 20, border: `1px solid ${C.border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 16,
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                        {preOrderItems.length} item{preOrderItems.length !== 1 ? 's' : ''} added
                      </span>
                      <button onClick={() => setIsMenuModalOpen(true)} style={{
                        background: "transparent", border: "none",
                        color: C.amber, fontSize: 14, fontWeight: 600,
                        cursor: "pointer", textDecoration: "underline",
                      }}>Edit</button>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      {preOrderItems.slice(0, 3).map(item => (
                        <div key={item.id} style={{
                          display: "flex", justifyContent: "space-between",
                          fontSize: 14, color: C.textMid, marginBottom: 8,
                        }}>
                          <span>{item.name} × {item.quantity}</span>
                          <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      {preOrderItems.length > 3 && (
                        <div style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic" }}>
                          +{preOrderItems.length - 3} more item{preOrderItems.length - 3 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div style={{
                      borderTop: `2px solid ${C.border}`,
                      paddingTop: 14, display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Pre-Order Total</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: C.amber, fontFamily: "'Playfair Display', serif" }}>
                        ₹{totalPreOrderCost}
                      </span>
                    </div>
                    <div style={{
                      marginTop: 14, padding: 12,
                      background: C.green + "15",
                      borderRadius: 10, border: `1px solid ${C.green}30`,
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{ fontSize: 18 }}>💳</span>
                      <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>
                        Pay at restaurant — Not charged now
                      </span>
                    </div>
                  </div>
                )}

                <button onClick={() => setIsMenuModalOpen(true)} style={{
                  width: "100%", padding: "18px 32px",
                  background: C.amber, border: "none", borderRadius: 14,
                  color: "#fff", fontSize: 17, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 10, boxShadow: "0 6px 20px rgba(212, 136, 58, 0.35)",
                  transition: "all 0.2s ease",
                }}
                  onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
                >
                  <span style={{ fontSize: 22 }}>📋</span>
                  {preOrderItems.length > 0 ? "View & Edit Menu" : "Browse Menu & Add Items"}
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                  REVIEWS SECTION
            ═══════════════════════════════════════════════════════════ */}
            <div>
              {/* ── Section heading ─────────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 28, fontWeight: 700, color: C.text, margin: 0,
                }}>Customer Reviews</h3>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: C.textMuted,
                  background: C.bgSoft, padding: "5px 14px", borderRadius: 20,
                  border: `1px solid ${C.border}`,
                }}>
                  {reviewsTotal} review{reviewsTotal !== 1 ? "s" : ""}
                </span>
              </div>

              {/* ── Rating summary banner ───────────────────────────── */}
              {restaurant.totalReviews > 0 && (
                <div style={{
                  background: "linear-gradient(135deg, #FFF9F0 0%, #FFF5E6 100%)",
                  border: `2px solid ${C.amber}30`,
                  borderRadius: 18, padding: "24px 28px",
                  marginBottom: 28, display: "flex", gap: 32, alignItems: "center",
                  flexWrap: "wrap",
                }}>
                  {/* Big number */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 56, fontWeight: 900, color: C.amber, lineHeight: 1,
                    }}>{(restaurant.avgRating || restaurant.rating || 0).toFixed(1)}</div>
                    <div style={{ display: "flex", gap: 3, justifyContent: "center", margin: "8px 0" }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{
                          fontSize: 20,
                          color: s <= Math.round(restaurant.avgRating || restaurant.rating || 0) ? C.amber : C.border,
                        }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>
                      {restaurant.totalReviews} verified review{restaurant.totalReviews !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Star breakdown bars */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    {[5,4,3,2,1].map(star => {
                      const count = reviews.filter(r => Math.round(r.rating) === star).length;
                      const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                      return (
                        <div key={star} style={{
                          display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
                        }}>
                          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, width: 14, textAlign: "right" }}>{star}</span>
                          <span style={{ color: C.amber, fontSize: 13 }}>★</span>
                          <div style={{
                            flex: 1, height: 7, background: C.border, borderRadius: 4, overflow: "hidden",
                          }}>
                            <div style={{
                              width: `${pct}%`, height: "100%",
                              background: `linear-gradient(90deg, ${C.amber}, #E8A050)`,
                              borderRadius: 4, transition: "width 0.5s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: C.textMuted, width: 28 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── All review photos grid ──────────────────────────── */}
              {reviews.some(r => r.media?.length > 0) && (() => {
                const allPhotos = reviews.flatMap(r =>
                  (r.media || []).filter(m => m.resourceType !== "video").map(m => ({ url: m.url, reviewer: r.customer?.name || "Guest" }))
                );
                if (!allPhotos.length) return null;
                return (
                  <div style={{
                    background: C.bgCard, padding: 24, borderRadius: 16,
                    border: `1px solid ${C.border}`, marginBottom: 28,
                  }}>
                    <h4 style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16,
                    }}>📸 Guest Photos ({allPhotos.length})</h4>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                      gap: 8,
                    }}>
                      {allPhotos.slice(0, 12).map((ph, idx) => (
                        <div key={idx}
                          onClick={() => setLightboxImg(ph.url)}
                          style={{
                            height: 110, borderRadius: 10, overflow: "hidden",
                            cursor: "pointer", border: `1.5px solid ${C.border}`,
                            transition: "transform 0.2s, box-shadow 0.2s",
                            position: "relative",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.18)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          <img src={ph.url} alt={ph.reviewer}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            onError={e => { e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"; }}
                          />
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)",
                            opacity: 0, transition: "opacity 0.2s",
                          }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── Individual reviews ──────────────────────────────── */}
              {reviewsLoading && reviews.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: C.textMuted }}>
                  <div style={{
                    width: 36, height: 36, margin: "0 auto 12px",
                    border: `3px solid ${C.border}`, borderTopColor: C.amber,
                    borderRadius: "50%", animation: "spin 0.8s linear infinite",
                  }} />
                  Loading reviews…
                </div>
              ) : reviews.length === 0 ? (
                <div style={{
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: "40px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>No reviews yet</p>
                  <p style={{ fontSize: 13, color: C.textMuted }}>Be the first to share your experience!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {reviews.map(review => (
                    <div key={review._id} style={{
                      background: C.bgCard, padding: 22, borderRadius: 14,
                      border: `1px solid ${C.border}`,
                      transition: "box-shadow 0.2s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                    >
                      {/* Row 1: User info + stars */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: "50%",
                            background: C.amber + "20",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "'Playfair Display', serif",
                            fontSize: 17, fontWeight: 700, color: C.amber, flexShrink: 0,
                          }}>
                            {(review.customer?.name || "G")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                              {review.customer?.name || "Guest"}
                            </div>
                            <div style={{ fontSize: 12, color: C.textMuted }}>
                              {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <div style={{ display: "flex", gap: 2 }}>
                            {[1,2,3,4,5].map(i => (
                              <span key={i} style={{
                                color: i <= review.rating ? C.amber : C.border,
                                fontSize: 16,
                              }}>★</span>
                            ))}
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "2px 10px",
                            background: C.amber + "15", color: C.amber,
                            borderRadius: 10, border: `1px solid ${C.amber}30`,
                          }}>{review.rating}/5</span>
                        </div>
                      </div>

                      {/* Review title */}
                      {review.title && (
                        <p style={{
                          fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6,
                        }}>{review.title}</p>
                      )}

                      {/* Comment */}
                      {review.comment && (
                        <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7, marginBottom: 12 }}>
                          {review.comment}
                        </p>
                      )}

                      {/* Sub-ratings */}
                      {(review.foodRating || review.serviceRating || review.ambienceRating) && (
                        <div style={{
                          display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap",
                        }}>
                          {review.foodRating && (
                            <span style={{
                              fontSize: 12, padding: "4px 10px", borderRadius: 20,
                              background: "#FFF9F0", border: `1px solid ${C.amber}30`,
                              color: C.amber, fontWeight: 600,
                            }}>🍽️ Food {review.foodRating}/5</span>
                          )}
                          {review.serviceRating && (
                            <span style={{
                              fontSize: 12, padding: "4px 10px", borderRadius: 20,
                              background: "#F0F9FF", border: "1px solid #90CAF930",
                              color: "#1565C0", fontWeight: 600,
                            }}>👨‍🍳 Service {review.serviceRating}/5</span>
                          )}
                          {review.ambienceRating && (
                            <span style={{
                              fontSize: 12, padding: "4px 10px", borderRadius: 20,
                              background: C.green + "10", border: `1px solid ${C.green}30`,
                              color: C.green, fontWeight: 600,
                            }}>✨ Ambience {review.ambienceRating}/5</span>
                          )}
                        </div>
                      )}

                      {/* Review photos */}
                      {review.media?.filter(m => m.resourceType !== "video").length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {review.media.filter(m => m.resourceType !== "video").map((m, mi) => (
                            <div key={mi}
                              onClick={() => setLightboxImg(m.url)}
                              style={{
                                width: 72, height: 72, borderRadius: 8,
                                overflow: "hidden", cursor: "pointer",
                                border: `1.5px solid ${C.border}`,
                                transition: "transform 0.15s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.07)"}
                              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                              <img src={m.url} alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                onError={e => { e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200"; }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Restaurant response */}
                      {review.restaurantResponse?.text && (
                        <div style={{
                          marginTop: 14, padding: "12px 16px",
                          background: C.bgSoft, borderRadius: 10,
                          borderLeft: `3px solid ${C.amber}`,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            🍽️ Restaurant Response
                          </div>
                          <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, margin: 0 }}>
                            {review.restaurantResponse.text}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Load more */}
                  {reviewsHasMore && (
                    <button
                      onClick={loadMoreReviews}
                      style={{
                        width: "100%", padding: "13px",
                        background: "transparent",
                        border: `1.5px solid ${C.border}`,
                        borderRadius: 12, color: C.textMid,
                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; e.currentTarget.style.color = C.amber; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
                    >
                      Load more reviews…
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Lightbox ───────────────────────────────────────────── */}
            {lightboxImg && (
              <div
                onClick={() => setLightboxImg(null)}
                style={{
                  position: "fixed", inset: 0,
                  background: "rgba(0,0,0,0.88)",
                  zIndex: 3000,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 24, cursor: "zoom-out",
                }}
              >
                <img
                  src={lightboxImg} alt="Review photo"
                  onClick={e => e.stopPropagation()}
                  style={{
                    maxWidth: "90vw", maxHeight: "88vh",
                    borderRadius: 16, objectFit: "contain",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                    cursor: "default",
                  }}
                />
                <button
                  onClick={() => setLightboxImg(null)}
                  style={{
                    position: "absolute", top: 20, right: 24,
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff", fontSize: 20, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >×</button>
              </div>
            )}
          </div>

          {/* RESERVATION SIDEBAR */}
          <div style={{ position: "sticky", top: 80, height: "fit-content" }}>
            <div style={{
              background: C.bgCard, padding: 32, borderRadius: 20,
              border: `2px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 24,
              }}>Reserve Your Table</h3>

              <div style={{
                display: "flex", gap: 8, marginBottom: 24,
                background: C.bgSoft, padding: 6, borderRadius: 12,
              }}>
                <button onClick={() => setBookingMode("instant")} style={{
                  flex: 1, padding: "12px",
                  background: bookingMode === "instant" ? C.amber : "transparent",
                  border: "none", borderRadius: 8,
                  color: bookingMode === "instant" ? "#fff" : C.textMid,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span>⚡</span> Instant
                </button>
                <button onClick={() => setBookingMode("schedule")} style={{
                  flex: 1, padding: "12px",
                  background: bookingMode === "schedule" ? C.amber : "transparent",
                  border: "none", borderRadius: 8,
                  color: bookingMode === "schedule" ? "#fff" : C.textMid,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span>📅</span> Schedule
                </button>
              </div>

              {bookingMode === "instant" ? (
                <>
                  <div style={{
                    background: C.amberSoft, padding: 14, borderRadius: 10,
                    marginBottom: 20, border: `1px solid ${C.amber}30`,
                  }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 4 }}>
                      ⚡ Instant Booking
                    </div>
                    <div style={{ fontSize: 12, color: C.textMid }}>
                      Coming in the next 60 minutes
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12, display: "block" }}>
                      When will you arrive?
                    </label>
                    <div style={{
                      background: C.bgSoft, padding: "16px 20px",
                      borderRadius: 12, border: `1.5px solid ${C.border}`,
                    }}>
                      <input type="range" min="10" max="60" value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        style={{ width: "100%", marginBottom: 10 }} />
                      <div style={{
                        textAlign: "center", fontSize: 20,
                        color: C.amber, fontWeight: 700,
                        fontFamily: "'Playfair Display', serif",
                      }}>{arrivalTime} minutes</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10, display: "block" }}>Date</label>
                    <input type="date" value={selectedDate} min={getTodayDate()}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        border: `2px solid ${C.border}`, fontSize: 15,
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: C.text,
                      }} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10, display: "block" }}>Time</label>
                    <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 12,
                        border: `2px solid ${C.border}`, fontSize: 15,
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                        color: selectedTime ? C.text : C.textMuted,
                      }}>
                      <option value="">Select time</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="19:00">7:00 PM</option>
                      <option value="20:00">8:00 PM</option>
                      <option value="21:00">9:00 PM</option>
                      <option value="22:00">10:00 PM</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10, display: "block" }}>
                  Number of Guests
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
                  <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} style={{
                    width: 44, height: 44, borderRadius: "50%",
                    border: `2px solid ${C.border}`, background: "#fff",
                    cursor: "pointer", fontWeight: 700, fontSize: 20, color: C.text,
                  }}>−</button>
                  <span style={{
                    fontSize: 24, fontWeight: 700, minWidth: 40, textAlign: "center",
                    fontFamily: "'Playfair Display', serif", color: C.amber,
                  }}>{guestCount}</span>
                  <button onClick={() => setGuestCount(guestCount + 1)} style={{
                    width: 44, height: 44, borderRadius: "50%",
                    border: `2px solid ${C.border}`, background: "#fff",
                    cursor: "pointer", fontWeight: 700, fontSize: 20, color: C.text,
                  }}>+</button>
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 8 }}>
                  {restaurant.seats} seats available
                </div>
              </div>

              <div style={{ background: C.bgSoft, padding: 18, borderRadius: 14, marginBottom: 20 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 15, color: C.text, marginBottom: 8, fontWeight: 600,
                }}>
                  <span>Reservation Fee</span>
                  <span>₹{restaurant.reservationFee}</span>
                </div>
                {preOrderItems.length > 0 && (
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 14, color: C.textMid, marginBottom: 4,
                  }}>
                    <span>Pre-Order (pay later)</span>
                    <span>₹{totalPreOrderCost}</span>
                  </div>
                )}
                <div style={{
                  borderTop: `2px solid ${C.border}`,
                  marginTop: 14, paddingTop: 14,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 2 }}>Pay Now</div>
                    <div style={{
                      fontSize: 22, fontWeight: 700, color: C.amber,
                      fontFamily: "'Playfair Display', serif",
                    }}>₹{restaurant.reservationFee}</div>
                  </div>
                  {preOrderItems.length > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Pay Later</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>₹{totalPreOrderCost}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking success */}
              {bookingSuccess && (
                <div style={{
                  background: "#E8F5EE", border: "1px solid #4A9B6F40", borderRadius: 12,
                  padding: 16, marginBottom: 16
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#4A9B6F", marginBottom: 8 }}>
                    ✅ Booking Confirmed!
                  </div>
                  <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>
                    <div>Confirmation Code: <strong style={{ fontFamily: "monospace", color: C.amber }}>#{bookingSuccess.confirmationCode}</strong></div>
                    <div>Date: {new Date(bookingSuccess.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    <div>Guests: {bookingSuccess.numberOfGuests}</div>
                    <div>Reservation Fee: ₹{bookingSuccess.reservationFee}</div>
                    {bookingSuccess.preOrderTotal > 0 && <div>Pre-Order Total: ₹{bookingSuccess.preOrderTotal} (pay at restaurant)</div>}
                  </div>
                  <button onClick={() => navigate('/account')} style={{
                    marginTop: 10, width: "100%",
                    padding: "10px", background: C.amber, border: "none", borderRadius: 8,
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>
                    View My Bookings →
                  </button>
                </div>
              )}

              {/* Booking error */}
              {bookingError && (
                <div style={{
                  background: "#FFF5F5", border: "1px solid #D05A4A30", borderRadius: 10,
                  padding: "12px 14px", marginBottom: 16, fontSize: 13, color: C.red
                }}>
                  ⚠️ {bookingError}
                  {!isLoggedIn && (
                    <div style={{ marginTop: 8 }}>
                      <span onClick={() => navigate('/login')} style={{ color: C.amber, fontWeight: 700, cursor: "pointer" }}>
                        Sign in to book →
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleReservation} disabled={!isFormValid || bookingLoading || !!bookingSuccess} style={{
                width: "100%", padding: "18px",
                background: !isFormValid ? C.border : C.amber,
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: 17, fontWeight: 700,
                cursor: !isFormValid ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s ease",
                boxShadow: isFormValid ? "0 4px 16px rgba(212, 136, 58, 0.3)" : "none",
              }}>
                Complete Reservation
              </button>

              <p style={{
                fontSize: 11, color: C.textMuted, textAlign: "center",
                marginTop: 14, lineHeight: 1.5,
              }}>Cancel within 30% of arrival for full refund</p>
            </div>
          </div>
        </div>
      </div>

      {isMenuModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setIsMenuModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: C.bg, borderRadius: 20, maxWidth: 1200, width: "100%",
            maxHeight: "90vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{
              padding: "24px 32px", borderBottom: `2px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 28, fontWeight: 900, color: C.text, margin: 0,
                }}>Full Menu</h2>
                <p style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Select items for pre-order
                </p>
              </div>
              <button onClick={() => setIsMenuModalOpen(false)} style={{
                width: 40, height: 40, borderRadius: "50%",
                border: `1.5px solid ${C.border}`, background: "#fff",
                cursor: "pointer", fontSize: 20, color: C.textMuted,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 320px", flex: 1, overflow: "hidden",
            }}>
              <div style={{ padding: 32, overflowY: "auto", borderRight: `1px solid ${C.border}` }}>
                {/* Group by actual category values from DB */}
                {[...new Set(restaurant.menu.map(i => i.category))].map(category => {
                  const items = restaurant.menu.filter(item => item.category === category);
                  if (items.length === 0) return null;
                  const label = { main: "Main Course", starter: "Starters", dessert: "Desserts", beverage: "Beverages", special: "Chef's Special" }[category] || category;
                  return (
                    <div key={category} style={{ marginBottom: 40 }}>
                      <h3 style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 24, fontWeight: 700, color: C.text,
                        marginBottom: 20, paddingBottom: 12,
                        borderBottom: `2px solid ${C.border}`,
                      }}>{label}</h3>

                      <div style={{ display: "grid", gap: 16 }}>
                        {items.map(item => {
                          const isSelected = preOrderItems.find(i => i.id === item.id);
                          return (
                            <div key={item.id} style={{
                              background: C.bgCard,
                              border: `1.5px solid ${isSelected ? C.amber : C.border}`,
                              borderRadius: 12, padding: 16,
                              display: "flex", gap: 16, transition: "all 0.2s ease",
                            }}>
                              <img src={item.image} alt={item.name} style={{
                                width: 100, height: 100, objectFit: "cover", borderRadius: 10,
                              }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <h5 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{item.name}</h5>
                                    {item.veg && <span style={{
                                      fontSize: 9, padding: "2px 6px",
                                      background: C.green + "20", color: C.green,
                                      borderRadius: 4, fontWeight: 700, border: `1px solid ${C.green}`,
                                    }}>● VEG</span>}
                                  </div>
                                </div>
                                <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 10px", lineHeight: 1.5 }}>
                                  {item.description}
                                </p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>₹{item.price}</span>
                                  {!isSelected ? (
                                    <button onClick={() => togglePreOrder(item)} style={{
                                      padding: "8px 20px", background: C.amber,
                                      border: "none", borderRadius: 8, color: "#fff",
                                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                                      fontFamily: "'DM Sans', sans-serif",
                                    }}>+ ADD</button>
                                  ) : (
                                    <div style={{
                                      display: "flex", alignItems: "center", gap: 12,
                                      background: C.amberSoft, borderRadius: 8, padding: "6px 10px",
                                    }}>
                                      <button onClick={() => updateQuantity(item.id, -1)} style={{
                                        width: 28, height: 28, borderRadius: "50%",
                                        border: "none", background: C.amber, color: "#fff",
                                        cursor: "pointer", fontSize: 16, fontWeight: 700,
                                      }}>−</button>
                                      <span style={{ fontSize: 15, fontWeight: 700, color: C.text, minWidth: 25, textAlign: "center" }}>
                                        {preOrderItems.find(i => i.id === item.id).quantity}
                                      </span>
                                      <button onClick={() => updateQuantity(item.id, 1)} style={{
                                        width: 28, height: 28, borderRadius: "50%",
                                        border: "none", background: C.amber, color: "#fff",
                                        cursor: "pointer", fontSize: 16, fontWeight: 700,
                                      }}>+</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: 24, background: C.bgSoft, display: "flex", flexDirection: "column" }}>
                <h3 style={{
                  fontSize: 18, fontWeight: 700, color: C.text,
                  marginBottom: 16, fontFamily: "'DM Sans', sans-serif",
                }}>Your Cart ({preOrderItems.length})</h3>
                <div style={{ flex: 1, overflowY: "auto", marginBottom: 20 }}>
                  {preOrderItems.length === 0 ? (
                    <div style={{
                      textAlign: "center", padding: "40px 20px",
                      color: C.textMuted, fontSize: 14,
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                      Your cart is empty<br />Add items from menu
                    </div>
                  ) : (
                    preOrderItems.map(item => (
                      <div key={item.id} style={{
                        background: C.bgCard, padding: 12, borderRadius: 10,
                        marginBottom: 10, border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{item.name}</div>
                          <button onClick={() => togglePreOrder(item)} style={{
                            background: "transparent", border: "none",
                            color: C.red, cursor: "pointer", fontSize: 16,
                            padding: 0, marginLeft: 8,
                          }}>×</button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => updateQuantity(item.id, -1)} style={{
                              width: 24, height: 24, borderRadius: "50%",
                              border: `1px solid ${C.border}`, background: "#fff",
                              cursor: "pointer", fontSize: 14, fontWeight: 700,
                            }}>−</button>
                            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                              {item.quantity}
                            </span>
                            <button onClick={() => updateQuantity(item.id, 1)} style={{
                              width: 24, height: 24, borderRadius: "50%",
                              border: `1px solid ${C.border}`, background: "#fff",
                              cursor: "pointer", fontSize: 14, fontWeight: 700,
                            }}>+</button>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: "16px 0", borderTop: `2px solid ${C.border}` }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16,
                  }}>
                    <span>Total</span>
                    <span style={{ color: C.amber }}>₹{totalPreOrderCost}</span>
                  </div>
                  <button onClick={() => setIsMenuModalOpen(false)} style={{
                    width: "100%", padding: "14px", background: C.amber,
                    border: "none", borderRadius: 10, color: "#fff",
                    fontSize: 15, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>Done</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareToGroupModal
          restaurant={{
            _id: restaurant._id || restaurant.id,
            name: restaurant.name,
            image: restaurant.images?.[0] || '',
            cuisine: Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine || '',
            rating: restaurant.rating || 0,
            price: restaurant.priceRange || '',
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
