import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import Navbar from "./Navbar";


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

const restaurantsData = [
  { 
    id: 1,
    name: "Ember & Oak",
    cuisine: "Contemporary Indian",
    area: "Koregaon Park",
    address: "Lane 5, North Main Road, Koregaon Park, Pune - 411001",
    rating: 4.8,
    totalReviews: 234,
    seats: 12,
    price: "₹₹₹",
    priceRange: "₹800 - ₹1500",
    reservationFee: 300,
    hours: "11:00 AM - 11:00 PM",
    phone: "+91 98765 43210",
    email: "reservations@emberoak.com",
    distance: "2.3 km",
    description: "Ember & Oak brings together the authentic flavors of contemporary Indian cuisine with a modern twist. Our chefs blend traditional recipes with innovative techniques to create unforgettable dining experiences.",
    specialties: "Tandoori Platter, Butter Chicken, Dal Makhani, Naan Varieties",
    dietaryOptions: "Vegetarian, Vegan Options, Gluten-Free Available",
    features: "Live Music Weekends, Outdoor Seating, Private Dining Room, Bar Available",
    images: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
    ],
    menu: [
      { id: 1, name: "Tandoori Chicken Platter", price: 650, description: "Succulent chicken marinated in yogurt and spices", category: "Main Course", veg: false, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400" },
      { id: 2, name: "Paneer Tikka Masala", price: 480, description: "Cottage cheese in rich tomato gravy", category: "Main Course", veg: true, image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400" },
      { id: 3, name: "Butter Chicken", price: 550, description: "Tender chicken in creamy tomato sauce", category: "Main Course", veg: false, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400" },
      { id: 4, name: "Dal Makhani", price: 320, description: "Creamy black lentils slow-cooked overnight", category: "Main Course", veg: true, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400" },
      { id: 5, name: "Vegetable Biryani", price: 380, description: "Fragrant rice with mixed vegetables", category: "Main Course", veg: true, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400" },
      { id: 6, name: "Butter Naan", price: 80, description: "Soft fluffy bread with butter", category: "Breads", veg: true, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" },
      { id: 7, name: "Garlic Naan", price: 90, description: "Naan topped with garlic", category: "Breads", veg: true, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" },
      { id: 8, name: "Roti", price: 40, description: "Whole wheat flatbread", category: "Breads", veg: true, image: "https://images.unsplash.com/photo-1624871103993-f833f89df15b?w=400" },
      { id: 9, name: "Gulab Jamun", price: 150, description: "Milk dumplings in sugar syrup", category: "Desserts", veg: true, image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400" },
      { id: 10, name: "Kulfi Falooda", price: 180, description: "Ice cream with vermicelli", category: "Desserts", veg: true, image: "https://images.unsplash.com/photo-1588195538326-c5b1e5b80c4b?w=400" },
      { id: 11, name: "Rasmalai", price: 160, description: "Cheese patties in sweet milk", category: "Desserts", veg: true, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400" },
      { id: 12, name: "Masala Chai", price: 80, description: "Spiced Indian tea", category: "Beverages", veg: true, image: "https://images.unsplash.com/photo-1597318112093-ba7c5e3bea25?w=400" },
      { id: 13, name: "Mango Lassi", price: 120, description: "Yogurt drink with mango", category: "Beverages", veg: true, image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400" },
      { id: 14, name: "Fresh Lime Soda", price: 90, description: "Lime juice with soda", category: "Beverages", veg: true, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400" },
    ],
    reviews: [
      { id: 1, name: "Priya Sharma", rating: 5, date: "2 days ago", comment: "Absolutely loved the ambiance and food quality!", helpful: 24 },
      { id: 2, name: "Rajesh Kumar", rating: 4, date: "1 week ago", comment: "Great food and service. Dal Makhani is a must-try.", helpful: 18 },
      { id: 3, name: "Anjali Desai", rating: 5, date: "2 weeks ago", comment: "Perfect spot for romantic dinner. Highly recommended!", helpful: 31 },
    ]
  },
];

export default function RestaurantDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isLoggedIn } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState("");

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Fetch restaurant from API
  useEffect(() => {
    axios.get(`/restaurants/${id}`)
      .then(res => {
        const r = res.data.data.restaurant;
        setRestaurant({
          ...r,
          id: r._id,
          area: r.address?.area || r.address?.city || 'Pune',
          address: [r.address?.street, r.address?.area, r.address?.city].filter(Boolean).join(', '),
          rating: r.avgRating || 0,
          totalReviews: r.totalReviews || 0,
          hours: r.operatingHours?.[0] ? `${r.operatingHours[0].open} - ${r.operatingHours[0].close}` : 'Open Daily',
          images: r.images?.length ? r.images : r.coverImage ? [r.coverImage] : ['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'],
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

  const [bookingMode, setBookingMode] = useState("instant");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [arrivalTime, setArrivalTime] = useState(30);
  const [preOrderItems, setPreOrderItems] = useState([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  useEffect(() => {
    if (bookingMode === "instant") {
      setSelectedDate(getTodayDate());
      setSelectedTime("");
    }
  }, [bookingMode]);

  if (loadingRestaurant) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background: C.bg }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:48, height:48, border:`4px solid ${C.border}`, borderTop:`4px solid ${C.amber}`,
            borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
          <p style={{ color:C.textMuted, fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>Loading restaurant…</p>
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
    } catch(err) {
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
                  <span>📍</span>
                  <span style={{ fontSize: 14, color: C.textMuted }}>{restaurant.distance} away</span>
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
              <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>📍 {restaurant.address}</p>
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

            <div>
              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 20,
              }}>Customer Reviews ({restaurant.totalReviews})</h3>
              {restaurant.reviews.map(review => (
                <div key={review.id} style={{
                  background: C.bgCard, padding: 20, borderRadius: 12,
                  border: `1px solid ${C.border}`, marginBottom: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{review.name}</div>
                      <div style={{ fontSize: 13, color: C.textMuted }}>{review.date}</div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{ color: i < review.rating ? C.amber : C.border, fontSize: 16 }}>★</span>
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6, marginBottom: 10 }}>{review.comment}</p>
                  <div style={{ fontSize: 12, color: C.textMuted }}>👍 {review.helpful} people found this helpful</div>
                </div>
              ))}
            </div>
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
                <div style={{ background:"#E8F5EE", border:"1px solid #4A9B6F40", borderRadius:12,
                  padding:16, marginBottom:16 }}>
                  <div style={{ fontSize:16, fontWeight:700, color:"#4A9B6F", marginBottom:8 }}>
                    ✅ Booking Confirmed!
                  </div>
                  <div style={{ fontSize:13, color:C.textMid, lineHeight:1.7 }}>
                    <div>Confirmation Code: <strong style={{fontFamily:"monospace", color:C.amber}}>#{bookingSuccess.confirmationCode}</strong></div>
                    <div>Date: {new Date(bookingSuccess.scheduledAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                    <div>Guests: {bookingSuccess.numberOfGuests}</div>
                    <div>Reservation Fee: ₹{bookingSuccess.reservationFee}</div>
                    {bookingSuccess.preOrderTotal > 0 && <div>Pre-Order Total: ₹{bookingSuccess.preOrderTotal} (pay at restaurant)</div>}
                  </div>
                  <button onClick={() => navigate('/account')} style={{ marginTop:10, width:"100%",
                    padding:"10px", background:C.amber, border:"none", borderRadius:8,
                    color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    View My Bookings →
                  </button>
                </div>
              )}

              {/* Booking error */}
              {bookingError && (
                <div style={{ background:"#FFF5F5", border:"1px solid #D05A4A30", borderRadius:10,
                  padding:"12px 14px", marginBottom:16, fontSize:13, color:C.red }}>
                  ⚠️ {bookingError}
                  {!isLoggedIn && (
                    <div style={{ marginTop:8 }}>
                      <span onClick={() => navigate('/login')} style={{ color:C.amber, fontWeight:700, cursor:"pointer" }}>
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
                  const label = { main:"Main Course", starter:"Starters", dessert:"Desserts", beverage:"Beverages", special:"Chef's Special" }[category] || category;
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
    </div>
  );
}
