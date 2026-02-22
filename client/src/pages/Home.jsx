import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

function Home() {
    const [sports, setSports] = useState({ day1: [], day2: [] });
    const [loading, setLoading] = useState(true);

    const loadSports = useCallback(async () => {
        try {
            const data = await api.get('/sports');
            setSports(data);
        } catch (error) {
            console.error('Error loading sports:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSports();
    }, [loadSports]);

    // Real-time updates via SSE
    useRealTimeUpdates(loadSports);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'live':
                return <span className="status-badge status-live">Live</span>;
            case 'completed':
                return <span className="status-badge status-completed">Done</span>;
            default:
                return <span className="status-badge status-upcoming">Soon</span>;
        }
    };

    if (loading) {
        return (
            <div className="loading" style={{ marginTop: '4rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // Day information
    const dayInfo = {
        day1: { date: 'Feb 18, 2026', title: 'Athletics & Team Sports' },
        day2: { date: 'Feb 19, 2026', title: 'Indoor & Esports' }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', marginTop: 'var(--space-lg)' }}>

            {/* Day 1 Scoreboard */}
            <div className="scoreboard">
                <div className="scoreboard-header">DAY 1</div>
                <div className="scoreboard-subtitle">{dayInfo.day1.date}</div>

                <div className="scoreboard-content" style={{ marginTop: 'var(--space-md)' }}>
                    {sports.day1.map(sport => (
                        <Link
                            key={sport.id}
                            to={`/sport/${sport.id}`}
                            className="scoreboard-item"
                            style={{
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span style={{ marginRight: 'var(--space-xs)' }}>{sport.icon}</span>
                            {sport.name}
                            {sport.status === 'live' && (
                                <span style={{
                                    marginLeft: 'auto',
                                    color: 'var(--live)',
                                    fontSize: '0.5rem',
                                    animation: 'blink 1s infinite'
                                }}>● LIVE</span>
                            )}
                            {sport.status === 'completed' && (
                                <span style={{
                                    marginLeft: 'auto',
                                    color: 'white',
                                    fontSize: '0.5rem',
                                    fontWeight: 'bold'
                                }}>OVER</span>
                            )}
                        </Link>
                    ))}
                </div>

            </div>

            {/* Day 2 Scoreboard */}
            <div className="scoreboard">
                <div className="scoreboard-header">DAY 2</div>
                <div className="scoreboard-subtitle">{dayInfo.day2.date}</div>

                <div className="scoreboard-content" style={{ marginTop: 'var(--space-md)' }}>
                    {sports.day2.map(sport => (
                        <Link
                            key={sport.id}
                            to={`/sport/${sport.id}`}
                            className="scoreboard-item"
                            style={{
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span style={{ marginRight: 'var(--space-xs)' }}>{sport.icon}</span>
                            {sport.name}
                            {sport.status === 'live' && (
                                <span style={{
                                    marginLeft: 'auto',
                                    color: 'var(--live)',
                                    fontSize: '0.5rem',
                                    animation: 'blink 1s infinite'
                                }}>● LIVE</span>
                            )}
                            {sport.status === 'completed' && (
                                <span style={{
                                    marginLeft: 'auto',
                                    color: 'white',
                                    fontSize: '0.5rem',
                                    fontWeight: 'bold'
                                }}>OVER</span>
                            )}
                        </Link>
                    ))}
                </div>

            </div>

            {/* Live Feed Footer */}
            <div className="live-feed" style={{
                position: 'static',
                justifyContent: 'center',
                marginTop: 'var(--space-md)',
                padding: 'var(--space-md)',
                borderTop: '1px solid var(--bg-elevated)'
            }}>
                Developed by Vaibhav Yadav
            </div>
        </div>
    );
}

export default Home;
