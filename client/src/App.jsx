import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import SportDetail from './pages/SportDetail';
import MedalTally from './pages/MedalTally';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OrganiserPanel from './pages/OrganiserPanel';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
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
        </AuthProvider>
    );
}

export default App;
