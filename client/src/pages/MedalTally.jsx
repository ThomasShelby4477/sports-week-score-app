import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

function MedalTally() {
    const navigate = useNavigate();
    const [medals, setMedals] = useState([]);
    const [winners, setWinners] = useState({ gold: [], silver: [], bronze: [] });
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('gold');
    const [activeView, setActiveView] = useState('tally'); // 'tally' or 'winners'
    const [medalFilter, setMedalFilter] = useState('gold'); // 'gold', 'silver', 'bronze'

    const loadData = useCallback(async () => {
        try {
            const [medalsData, winnersData] = await Promise.all([
                api.get('/medals'),
                api.get('/medals/winners')
            ]);
            setMedals(medalsData);
            setWinners(winnersData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Real-time updates via SSE
    useRealTimeUpdates(loadData);

    const sortedMedals = [...medals].sort((a, b) => {
        if (sortBy === 'total') {
            return b.total - a.total || b.gold - a.gold;
        }
        return b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze;
    });

    const currentWinners = winners[medalFilter] || [];

    if (loading) {
        return (
            <div className="loading" style={{ marginTop: '4rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

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

            {/* Medal Tally Scoreboard */}
            <div className="scoreboard">
                <div className="scoreboard-header">🏅 MEDAL TALLY</div>
                <div className="scoreboard-subtitle">Department Rankings & Winners</div>

                {/* View Tabs - Tally vs Winners */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    justifyContent: 'center',
                    marginTop: 'var(--space-md)',
                    marginBottom: 'var(--space-sm)'
                }}>
                    <button
                        className="nav-arrow"
                        onClick={() => setActiveView('tally')}
                        style={{
                            background: activeView === 'tally' ? 'var(--accent)' : 'var(--bg-dark)',
                            borderColor: activeView === 'tally' ? 'var(--accent-light)' : 'var(--bg-elevated)',
                            color: activeView === 'tally' ? 'var(--bg-dark)' : 'var(--text-primary)'
                        }}
                    >
                        📊 Tally
                    </button>
                    <button
                        className="nav-arrow"
                        onClick={() => setActiveView('winners')}
                        style={{
                            background: activeView === 'winners' ? 'var(--gold)' : 'var(--bg-dark)',
                            borderColor: activeView === 'winners' ? 'var(--gold-light)' : 'var(--bg-elevated)',
                            color: activeView === 'winners' ? 'var(--bg-dark)' : 'var(--text-primary)'
                        }}
                    >
                        🏆 Winners
                    </button>
                </div>

                {/* Tally View */}


                {/* Winners View - Medal Type Filter */}
                {activeView === 'winners' && (
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-sm)',
                        justifyContent: 'center',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <button
                            className="nav-arrow"
                            onClick={() => setMedalFilter('gold')}
                            style={{
                                background: medalFilter === 'gold' ? 'var(--gold)' : 'var(--bg-dark)',
                                borderColor: 'var(--gold)',
                                color: medalFilter === 'gold' ? 'var(--bg-dark)' : 'var(--gold)'
                            }}
                        >
                            🥇 Gold ({winners.gold?.length || 0})
                        </button>
                        <button
                            className="nav-arrow"
                            onClick={() => setMedalFilter('silver')}
                            style={{
                                background: medalFilter === 'silver' ? 'var(--silver)' : 'var(--bg-dark)',
                                borderColor: 'var(--silver)',
                                color: medalFilter === 'silver' ? 'var(--bg-dark)' : 'var(--silver)'
                            }}
                        >
                            🥈 Silver ({winners.silver?.length || 0})
                        </button>
                        <button
                            className="nav-arrow"
                            onClick={() => setMedalFilter('bronze')}
                            style={{
                                background: medalFilter === 'bronze' ? 'var(--bronze)' : 'var(--bg-dark)',
                                borderColor: 'var(--bronze)',
                                color: medalFilter === 'bronze' ? 'var(--bg-dark)' : 'var(--bronze)'
                            }}
                        >
                            🥉 Bronze ({winners.bronze?.length || 0})
                        </button>
                    </div>
                )}

                {/* Medal Table - Tally View */}
                {activeView === 'tally' && (
                    <div className="medal-table-container" style={{ marginTop: 'var(--space-md)' }}>
                        <table className="medal-table" style={{ background: 'var(--bg-dark)' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ color: 'var(--text-cyan)', fontFamily: 'var(--font-pixel)', fontSize: '0.5rem' }}>DEPT</th>
                                    <th style={{ color: 'var(--gold)' }}>🥇</th>
                                    <th style={{ color: 'var(--silver)' }}>🥈</th>
                                    <th style={{ color: 'var(--bronze)' }}>🥉</th>
                                    <th style={{ color: 'var(--text-cyan)' }}>SUM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMedals.map((dept, index) => (
                                    <tr
                                        key={dept.id}
                                        style={{
                                            borderBottom: '1px solid var(--bg-elevated)',
                                            background: index === 0 ? 'rgba(251, 191, 36, 0.1)' : 'transparent'
                                        }}
                                    >
                                        <td style={{ textAlign: 'left', padding: 'var(--space-sm)' }}>
                                            <div style={{
                                                fontWeight: '700',
                                                color: index === 0 ? 'var(--gold)' : 'var(--text-cyan)',
                                                fontSize: '0.875rem'
                                            }}>
                                                {index === 0 && '👑 '}{dept.short_code}
                                            </div>
                                            <div style={{
                                                fontSize: '0.625rem',
                                                color: 'var(--text-muted)',
                                                marginTop: '2px'
                                            }}>
                                                {dept.name}
                                            </div>
                                        </td>
                                        <td style={{
                                            color: 'var(--gold)',
                                            fontWeight: '700',
                                            fontSize: '1rem'
                                        }}>{dept.gold}</td>
                                        <td style={{
                                            color: 'var(--silver)',
                                            fontWeight: '600'
                                        }}>{dept.silver}</td>
                                        <td style={{
                                            color: 'var(--bronze)',
                                            fontWeight: '600'
                                        }}>{dept.bronze}</td>
                                        <td style={{
                                            color: 'var(--text-primary)',
                                            fontWeight: '800',
                                            fontSize: '1.125rem'
                                        }}>{dept.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {medals.length === 0 && (
                            <div className="empty-state" style={{ color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>
                                <div className="empty-icon">🏅</div>
                                <p className="pixel-text">No medals awarded yet</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Winners Tiles Grid - Winners View */}
                {activeView === 'winners' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 'var(--space-sm)',
                        marginTop: 'var(--space-md)'
                    }}>
                        {currentWinners.length === 0 ? (
                            <div className="empty-state" style={{ color: 'var(--text-muted)', gridColumn: '1/-1', padding: 'var(--space-lg)' }}>
                                <div className="empty-icon">{medalFilter === 'gold' ? '🥇' : medalFilter === 'silver' ? '🥈' : '🥉'}</div>
                                <p className="pixel-text">No {medalFilter} medals awarded yet</p>
                            </div>
                        ) : (
                            currentWinners.map((winner, index) => (
                                <div
                                    key={`${winner.id}-${index}`}
                                    style={{
                                        background: 'var(--bg-dark)',
                                        border: `2px solid ${medalFilter === 'gold' ? 'var(--gold)' : medalFilter === 'silver' ? 'var(--silver)' : 'var(--bronze)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--space-sm)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-xs)'
                                    }}
                                >
                                    {/* Winner Name */}
                                    <div style={{
                                        fontWeight: '700',
                                        fontSize: '0.875rem',
                                        color: medalFilter === 'gold' ? 'var(--gold)' : medalFilter === 'silver' ? 'var(--silver)' : 'var(--bronze)'
                                    }}>
                                        {medalFilter === 'gold' ? '🥇' : medalFilter === 'silver' ? '🥈' : '🥉'} {winner.participant_name}
                                    </div>

                                    {/* Department */}
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-cyan)',
                                        fontWeight: '600'
                                    }}>
                                        {winner.dept_code} • {winner.dept_name}
                                    </div>

                                    {/* Sport & Event */}
                                    <div style={{
                                        fontSize: '0.7rem',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderTop: '1px solid var(--bg-elevated)',
                                        paddingTop: 'var(--space-xs)',
                                        marginTop: 'var(--space-xs)'
                                    }}>
                                        <span>{winner.sport_icon || '🏆'} {winner.sport_name}</span>
                                        <span style={{
                                            background: 'var(--bg-secondary)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.5rem'
                                        }}>
                                            {winner.event_name} • {winner.category}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
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

export default MedalTally;
