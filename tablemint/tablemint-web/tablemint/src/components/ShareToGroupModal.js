import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../services/api';

// ── Mini restaurant preview inside the modal ──────────────────────────────────
function RestaurantPreview({ restaurant }) {
    return (
        <div style={{
            display: 'flex', gap: 12, padding: '12px 14px',
            background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb',
            marginBottom: 16,
        }}>
            {restaurant.image && (
                <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin: 0, fontWeight: 700, fontSize: 14, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {restaurant.name}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>
                    {restaurant.cuisine}
                    {restaurant.cuisine && restaurant.price && ' · '}
                    {restaurant.price && <span style={{ color: '#D4883A', fontWeight: 600 }}>{restaurant.price}</span>}
                    {restaurant.rating > 0 && (
                        <span style={{ marginLeft: 4 }}>· ⭐ {Number(restaurant.rating).toFixed(1)}</span>
                    )}
                </p>
            </div>
        </div>
    );
}

/**
 * ShareToGroupModal
 * Props:
 *   restaurant: { _id?, id?, name, image, cuisine, rating, price }
 *   onClose: () => void
 */
export default function ShareToGroupModal({ restaurant, onClose }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(null);   // groupId currently being sent
    const [shared, setShared] = useState({});        // { [groupId]: true }
    const [errors, setErrors] = useState({});        // { [groupId]: errorMessage }
    const [fetchError, setFetchError] = useState('');
    const overlayRef = useRef();

    // ── Normalise the restaurant ID regardless of source ──────────────────────
    // Explore passes { _id: r.id } where r.id = r._id (string)
    // RestaurantDetail passes { _id: restaurant._id } (also string or ObjectId)
    const restaurantId = String(restaurant._id || restaurant.id || '');
    const restaurantPayload = {
        restaurantId,
        name: restaurant.name || '',
        image: restaurant.image || '',
        rating: Number(restaurant.rating) || 0,
        cuisine: restaurant.cuisine || '',
        price: restaurant.price || '',
    };

    useEffect(() => {
        apiCall('/groups')
            .then(res => setGroups(Array.isArray(res.data) ? res.data : []))
            .catch(() => setFetchError('Could not load your groups. Make sure you are logged in.'))
            .finally(() => setLoading(false));
    }, []);

    const handleShare = async (group) => {
        if (sharing || shared[group._id]) return;
        setSharing(group._id);
        setErrors(prev => ({ ...prev, [group._id]: '' }));

        try {
            await apiCall(`/groups/${group._id}/share-restaurant`, {
                method: 'POST',
                body: JSON.stringify({ restaurantData: restaurantPayload }),
            });
            setShared(prev => ({ ...prev, [group._id]: true }));
        } catch (err) {
            setErrors(prev => ({
                ...prev,
                [group._id]: err.message || 'Failed to share. Please try again.',
            }));
        } finally {
            setSharing(null);
        }
    };

    const anyShared = Object.values(shared).some(Boolean);

    return (
        <div
            ref={overlayRef}
            onClick={e => { if (e.target === overlayRef.current) onClose(); }}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.55)',
                zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
                fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                    display: 'flex', flexDirection: 'column', maxHeight: '88vh', overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                            Share to Group
                        </h2>
                        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6b7280' }}>
                            Pick a group to send this restaurant to
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: '50%', border: 'none',
                            background: '#f3f4f6', cursor: 'pointer', fontSize: 18,
                            color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    <RestaurantPreview restaurant={restaurant} />

                    {fetchError && (
                        <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>⚠️ {fetchError}</p>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                border: '3px solid #e5e7eb', borderTopColor: '#3b82f6',
                                animation: 'spin 0.7s linear infinite',
                                margin: '0 auto 10px',
                            }} />
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                            Loading your groups...
                        </div>
                    ) : groups.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '28px 0', color: '#9ca3af', fontSize: 14 }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                            You have no groups yet.<br />
                            <span
                                onClick={onClose}
                                style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 13, marginTop: 6, display: 'inline-block' }}
                            >
                                Create one first →
                            </span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {groups.map(g => {
                                const isShared = !!shared[g._id];
                                const isSending = sharing === g._id;
                                const errMsg = errors[g._id];

                                return (
                                    <div key={g._id}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '11px 14px', borderRadius: 12,
                                            border: `1.5px solid ${isShared ? '#86efac' : '#e5e7eb'}`,
                                            background: isShared ? '#f0fdf4' : '#fff',
                                            transition: 'all 0.2s',
                                        }}>
                                            {/* Group avatar */}
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontWeight: 700, fontSize: 15,
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                            }}>
                                                {g.name.charAt(0).toUpperCase()}
                                            </div>

                                            {/* Group info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    margin: 0, fontWeight: 600, fontSize: 14, color: '#111827',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {g.name}
                                                </p>
                                                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>
                                                    {g.members?.length || 0} member{g.members?.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>

                                            {/* Share button */}
                                            <button
                                                onClick={() => handleShare(g)}
                                                disabled={isSending || isShared}
                                                style={{
                                                    padding: '7px 16px', borderRadius: 10, border: 'none',
                                                    background: isShared ? '#22c55e' : isSending ? '#e5e7eb' : '#2563eb',
                                                    color: '#fff',
                                                    fontSize: 13, fontWeight: 600,
                                                    cursor: isShared ? 'default' : isSending ? 'wait' : 'pointer',
                                                    flexShrink: 0, transition: 'all 0.2s',
                                                    opacity: isSending ? 0.75 : 1,
                                                    fontFamily: 'inherit',
                                                }}
                                            >
                                                {isShared ? '✓ Sent!' : isSending ? 'Sharing...' : 'Share'}
                                            </button>
                                        </div>

                                        {/* Inline error per group */}
                                        {errMsg && (
                                            <p style={{
                                                margin: '4px 0 0 14px', fontSize: 12,
                                                color: '#ef4444',
                                            }}>
                                                ⚠️ {errMsg}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: '#6b7280',
                            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                        }}
                    >
                        {anyShared ? '✓ Done' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
