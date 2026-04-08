import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './Home';
import Explore from './Explore';
import RestaurantDetail from './RestaurantDetail';
import ForRestaurants from './ForRestaurants';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import OwnerLoginPage from './OwnerLoginPage';
import Dashboard from './Dashboard';
import OwnerDashboard from './OwnerDashboard';
import AccountPage from './AccountPage';
import CaptainPage from './CaptainPage';
import SuperAdminPortal from './SuperAdminPortal';
import SuperAdminLogin from './SuperAdminLogin';
import GroupsPage from './pages/GroupsPage';
import GroupRoomPage from './pages/GroupRoomPage';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/" element={<Home />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/for-restaurants" element={<ForRestaurants />} />

                    {/* Customer auth */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Owner / Admin auth */}
                    <Route path="/owner/login" element={<OwnerLoginPage />} />
                    <Route path="/admin/login" element={<OwnerLoginPage />} />

                    {/* Super Admin */}
                    <Route path="/superadmin/login" element={<SuperAdminLogin />} />
                    <Route path="/superadmin" element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <SuperAdminPortal />
                        </ProtectedRoute>
                    } />

                    {/* Customer account */}
                    <Route path="/account" element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <AccountPage />
                        </ProtectedRoute>
                    } />

                    {/* Captain portal */}
                    <Route path="/captain" element={
                        <ProtectedRoute allowedRoles={['captain', 'admin']}>
                            <CaptainPage />
                        </ProtectedRoute>
                    } />

                    {/* Admin dashboard */}
                    <Route path="/admin/dashboard" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/restaurant-portal/dashboard" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    {/* Owner dashboard */}
                    <Route path="/owner/dashboard" element={
                        <ProtectedRoute allowedRoles={['owner']}>
                            <OwnerDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/owner-portal/dashboard" element={
                        <ProtectedRoute allowedRoles={['owner']}>
                            <OwnerDashboard />
                        </ProtectedRoute>
                    } />

                    {/* ── Group Planning (customers only) ── */}
                    <Route path="/groups" element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <GroupsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/groups/:id" element={
                        <ProtectedRoute allowedRoles={['customer']}>
                            <GroupRoomPage />
                        </ProtectedRoute>
                    } />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
