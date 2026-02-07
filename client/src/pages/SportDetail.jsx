import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BracketView from '../components/BracketView';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

function SportDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('boys');

    const loadSportData = useCallback(async () => {
        try {
            const result = await api.get(`/sports/${id}`);
            setData(result);

            // Auto-select first available tab
            if (result.events.boys.length === 0 && result.events.girls.length > 0) {
                setActiveTab('girls');
            } else if (result.events.mixed.length > 0 && result.events.boys.length === 0) {
                setActiveTab('mixed');
            }
        } catch (error) {
            console.error('Error loading sport:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadSportData();
    }, [loadSportData]);

    // Real-time updates via SSE
    useRealTimeUpdates(loadSportData);

    const getMedalIcon = (position) => {
        switch (position) {
            case 1: return <span className="medal medal-gold">🥇</span>;
            case 2: return <span className="medal medal-silver">🥈</span>;
            case 3: return <span className="medal medal-bronze">🥉</span>;
            default: return null;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'live':
                return <span className="status-badge status-live">Live</span>;
            case 'completed':
                return <span className="status-badge status-completed">Done</span>;
            default:
                return <span className="status-badge status-upcoming">Upcoming</span>;
        }
    };

    if (loading) {
        return (
            <div className="loading" style={{ marginTop: '4rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="scoreboard" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="scoreboard-header">ERROR</div>
                <div className="empty-state" style={{ color: 'var(--text-muted)' }}>
                    <div className="empty-icon">❌</div>
                    <p className="pixel-text">Sport not found</p>
                </div>
            </div>
        );
    }

    const { sport, events } = data;

    // Determine which tabs to show
    const showBoys = events.boys.length > 0 || sport.has_gender_categories === 1;
    const showGirls = events.girls.length > 0 || sport.has_gender_categories === 1;
    const showMixed = events.mixed.length > 0;

    // Only show tabs if we have multiple categories
    const activeCategoriesCount = [showBoys, showGirls, showMixed].filter(Boolean).length;
    const hasTabs = activeCategoriesCount > 1;

    const currentEvents = events[activeTab] || [];

    const renderEventResults = (event) => (
        <div key={event.id} className="scoreboard" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                <span style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '0.75rem',
                    color: 'var(--text-cyan)'
                }}>
                    {event.name}
                    {event.results.length >= 3 && ' 🏅'}
                </span>
                {getStatusBadge(event.status)}
            </div>

            {/* Individual Results */}
            {event.results.length > 0 && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                    {event.results.map(result => (
                        <div
                            key={result.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-md)',
                                padding: 'var(--space-sm) 0',
                                borderBottom: '1px solid var(--bg-elevated)'
                            }}
                        >
                            <div style={{ flexShrink: 0 }}>
                                {getMedalIcon(result.position)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {result.participant_name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {result.department_name}
                                </div>
                            </div>
                            {result.score && (
                                <div style={{
                                    color: 'var(--text-cyan)',
                                    fontFamily: 'var(--font-pixel)',
                                    fontSize: '0.5rem'
                                }}>
                                    {result.score}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Team Match Results - Visual Bracket */}
            {event.event_type === 'team' && (
                <BracketView matches={event.matches} eventName={event.name} />
            )}

            {event.results.length === 0 && event.matches.length === 0 && event.event_type !== 'team' && (
                <div className="pixel-text" style={{ padding: '1rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Results will be updated soon...
                </div>
            )}
        </div>
    );

    return (
        <div style={{ marginTop: 'var(--space-lg)' }}>
            {/* Back Button */}
            <button
                className="nav-arrow"
                onClick={() => navigate(-1)}
                style={{ marginBottom: 'var(--space-md)' }}
            >
                ← Go Back
            </button>

            {/* Sport Header */}
            <div className="scoreboard" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="scoreboard-header">
                    {sport.icon} {sport.name.toUpperCase()}
                </div>
            </div>

            {/* Category Tabs */}
            {hasTabs && (
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                    flexWrap: 'wrap'
                }}>
                    {showBoys && (
                        <button
                            className="nav-arrow"
                            onClick={() => setActiveTab('boys')}
                            style={{
                                background: activeTab === 'boys' ? 'var(--accent)' : 'var(--bg-dark)',
                                borderColor: activeTab === 'boys' ? 'var(--accent-light)' : 'var(--bg-elevated)',
                                color: activeTab === 'boys' ? 'var(--bg-dark)' : 'var(--text-primary)'
                            }}
                        >
                            👦 Boys
                        </button>
                    )}
                    {showGirls && (
                        <button
                            className="nav-arrow"
                            onClick={() => setActiveTab('girls')}
                            style={{
                                background: activeTab === 'girls' ? 'var(--accent)' : 'var(--bg-dark)',
                                borderColor: activeTab === 'girls' ? 'var(--accent-light)' : 'var(--bg-elevated)',
                                color: activeTab === 'girls' ? 'var(--bg-dark)' : 'var(--text-primary)'
                            }}
                        >
                            👧 Girls
                        </button>
                    )}
                    {showMixed && (
                        <button
                            className="nav-arrow"
                            onClick={() => setActiveTab('mixed')}
                            style={{
                                background: activeTab === 'mixed' ? 'var(--accent)' : 'var(--bg-dark)',
                                borderColor: activeTab === 'mixed' ? 'var(--accent-light)' : 'var(--bg-elevated)',
                                color: activeTab === 'mixed' ? 'var(--bg-dark)' : 'var(--text-primary)'
                            }}
                        >
                            🎯 Open
                        </button>
                    )}
                </div>
            )}

            {/* Events List */}
            <div>
                {currentEvents.length > 0 ? (
                    currentEvents.map(renderEventResults)
                ) : (
                    <div className="scoreboard">
                        <div className="empty-state" style={{ color: 'var(--text-muted)' }}>
                            <div className="empty-icon">📋</div>
                            <p className="pixel-text">No events in this category</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Live Feed Footer */}
            <div className="live-feed" style={{
                position: 'static',
                justifyContent: 'center',
                marginTop: 'var(--space-lg)'
            }}>
                Developed by Vaibhav Yadav
            </div>
        </div>
    );
}

export default SportDetail;
