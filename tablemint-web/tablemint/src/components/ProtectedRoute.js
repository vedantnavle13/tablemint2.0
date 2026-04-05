import { Navigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isLoggedIn, user, loading } = useAuth();

  if (loading) {
    return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#FDFAF6',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 50,
              height: 50,
              border: '4px solid #E8E0D0',
              borderTop: '4px solid #D4883A',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ fontSize: 14, color: '#6B5B45' }}>Loading...</p>
          </div>
          <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        </div>
    );
  }

  if (!isLoggedIn) {
    // Redirect to appropriate login page
    if (allowedRoles.includes('owner')) {
      return <Navigate to="/owner/login" replace />;
    }
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/admin/login" replace />;
    }
    if (allowedRoles.includes('superadmin')) {
      return <Navigate to="/superadmin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on actual role
    if (user?.role === 'owner') {
      return <Navigate to="/owner/dashboard" replace />;
    }
    if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user?.role === 'customer') {
      return <Navigate to="/explore" replace />;
    }
    if (user?.role === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;