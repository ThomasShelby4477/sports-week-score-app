import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requiredRole }) {
    const { user, loading, isAdmin, isOrganiser } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole === 'admin' && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    if (requiredRole === 'organiser' && !isOrganiser) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
