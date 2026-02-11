import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import SportDetail from './pages/SportDetail';
import MedalTally from './pages/MedalTally';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OrganiserPanel from './pages/OrganiserPanel';
import ProtectedRoute from './components/ProtectedRoute';
import GoogleAnalyticsTracker from './components/GoogleAnalyticsTracker';
import { SpeedInsights } from "@vercel/speed-insights/react";


function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <GoogleAnalyticsTracker />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="sport/:id" element={<SportDetail />} />
                        <Route path="medals" element={<MedalTally />} />
                        <Route
                            path="admin"
                            element={
                                <ProtectedRoute requiredRole="admin">
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="organiser"
                            element={
                                <ProtectedRoute requiredRole="organiser">
                                    <OrganiserPanel />
                                </ProtectedRoute>
                            }
                        />
                    </Route>
                </Routes>
            </BrowserRouter>
            <Analytics />
            <SpeedInsights />
        </AuthProvider>
    );
}

export default App;
