import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Generate crowd emojis for the animated banner
const crowdFans = ['🙋', '🙋‍♂️', '🙋‍♀️', '🧑', '👨', '👩', '🧔', '👱', '👱‍♀️', '🧑‍🦰', '👨‍🦱', '👩‍🦳', '🧑‍🦲', '🤵', '👗'];
const generateCrowd = () => {
    const crowd = [];
    for (let i = 0; i < 30; i++) {
        crowd.push(crowdFans[Math.floor(Math.random() * crowdFans.length)]);
    }
    return crowd;
};

function Layout() {
    const { user, logout, isAdmin, isOrganiser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const crowd = generateCrowd();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    const getLinkStyle = (path, isGold = false) => {
        const active = isActive(path);
        if (active) {
            return {
                background: isGold ? 'var(--gold)' : 'var(--accent)',
                color: 'var(--bg-dark)',
                borderColor: isGold ? 'var(--gold-light)' : 'var(--accent-light)'
            };
        }
        return {};
    };

    // Marquee text content
    const marqueeText = "KREEDA MAHOTSAV 2.0 ★ TEAM PARAKRAM ★ NFSU DELHI ★ ";

    return (
        <div className="stadium-wrapper">
            {/* Stadium Header */}
            <header className="stadium-header">
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <h1 className="stadium-title">KREEDA MAHOTSAV</h1>
                    <p className="stadium-subtitle">- Team Parakram -</p>
                </Link>

                {/* Navigation */}
                <nav style={{ marginTop: 'var(--space-sm)', justifyContent: 'center', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <Link
                        to="/medals"
                        className="nav-arrow"
                        style={getLinkStyle('/medals', true)}
                    >
                        🏅 Medals
                    </Link>
                    {user ? (
                        <>
                            {isOrganiser && (
                                <Link
                                    to="/organiser"
                                    className="nav-arrow"
                                    style={getLinkStyle('/organiser')}
                                >
                                    📋 Panel
                                </Link>
                            )}
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="nav-arrow"
                                    style={getLinkStyle('/admin')}
                                >
                                    ⚙️ Admin
                                </Link>
                            )}
                            <button onClick={handleLogout} className="nav-arrow">
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link
                            to="/login"
                            className="nav-arrow"
                            style={getLinkStyle('/login')}
                        >
                            Login
                        </Link>
                    )}
                </nav>
            </header>

            {/* Crowd Banner */}
            <div
                className="crowd-banner-img"
                style={{
                    height: '120px',
                    backgroundImage: 'url(/images/crowd.png)',
                    backgroundRepeat: 'repeat-x',
                    backgroundSize: 'auto 100%',
                    backgroundPosition: 'center',
                    marginTop: '100px'
                }}
            ></div>

            {/* Scrolling Marquee */}
            <div className="marquee-wrapper">
                <div className="marquee-content">
                    <span>{marqueeText}</span>
                    <span>{marqueeText}</span>
                    <span>{marqueeText}</span>
                    <span>{marqueeText}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="main-content" style={{ position: 'relative', zIndex: 10, paddingBottom: '20vh' }}>
                <div className="container">
                    <Outlet />
                </div>
            </main>

            {/* Live Feed Indicator */}
            <div className="live-feed" style={{ position: 'fixed', bottom: '10px', left: '10px', zIndex: 50 }}>
                LIVE FEED // CAM 1
            </div>
        </div>
    );
}

export default Layout;
