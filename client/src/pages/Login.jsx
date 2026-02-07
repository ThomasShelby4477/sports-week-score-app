import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    if (user) {
        navigate(user.role === 'admin' ? '/admin' : '/organiser');
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const loggedInUser = await login(username, password);
            navigate(loggedInUser.role === 'admin' ? '/admin' : '/organiser');
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stadium-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            {/* Stadium grass background */}
            <div className="stadium-grass"></div>

            <div className="scoreboard" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
                <div className="scoreboard-header">STAFF LOGIN</div>
                <div className="scoreboard-subtitle">Organisers & Administrators Only</div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid var(--error)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-sm) var(--space-md)',
                        color: 'var(--error)',
                        fontSize: '0.75rem',
                        marginTop: 'var(--space-md)',
                        fontFamily: 'var(--font-pixel)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-lg)' }}>
                    <div className="form-group">
                        <label className="form-label pixel-text" style={{ color: 'var(--text-yellow)' }}>USERNAME</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            autoComplete="username"
                            style={{ background: 'var(--bg-dark)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label pixel-text" style={{ color: 'var(--text-yellow)' }}>PASSWORD</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            autoComplete="current-password"
                            style={{ background: 'var(--bg-dark)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-stadium"
                        disabled={loading}
                        style={{ width: '100%', marginTop: 'var(--space-md)' }}
                    >
                        {loading ? 'LOGGING IN...' : 'LOGIN'}
                    </button>
                </form>

                <p className="pixel-text" style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'var(--space-lg)' }}>
                    Public users can view results without logging in
                </p>
            </div>

            {/* Soccer ball decoration */}
            <div className="soccer-ball" style={{ bottom: '5vh' }}>⚽</div>
        </div>
    );
}

export default Login;
