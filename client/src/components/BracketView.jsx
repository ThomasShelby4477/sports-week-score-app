import { useState } from 'react';

function BracketView({ matches, eventName }) {
    // Group matches by round type
    const rounds = matches.reduce((acc, match) => {
        if (!acc[match.match_type]) acc[match.match_type] = [];
        acc[match.match_type].push(match);
        return acc;
    }, {});

    const roundOrder = ['round1', 'round2', 'round3', 'round4', 'quarterfinal', 'semifinal', 'final'];

    // Sort rounds
    const sortedRoundKeys = Object.keys(rounds).sort((a, b) => {
        const indexA = roundOrder.indexOf(a);
        const indexB = roundOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const getRoundLabel = (type) => {
        if (type === 'round1') return 'Round 1';
        if (type === 'round2') return 'Round 2';
        if (type === 'round3') return 'Round 3';
        if (type === 'quarterfinal') return 'Quarter-Finals';
        if (type === 'semifinal') return 'Semi-Finals';
        if (type === 'final') return 'Final';
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    if (sortedRoundKeys.length === 0) {
        return (
            <div className="bracket-empty">
                <p className="text-muted">No fixtures added yet</p>
            </div>
        );
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'live': return 'match-live';
            case 'completed': return 'match-completed';
            default: return 'match-upcoming';
        }
    };

    const getWinnerClass = (match, teamId) => {
        if (match.status === 'completed' && match.winner_department_id === teamId) {
            return 'team-winner';
        }
        return '';
    };

    return (
        <div className="bracket-container">
            <div className="bracket-scroll">
                {sortedRoundKeys.map(roundKey => (
                    <div key={roundKey} className="bracket-round">
                        <div className="round-header">{getRoundLabel(roundKey)}</div>
                        <div className="round-matches">
                            {rounds[roundKey].map(match => (
                                <div key={match.id} className={`bracket-match ${getStatusClass(match.status)}`}>
                                    {/* Team 1 */}
                                    <div className={`bracket-team ${getWinnerClass(match, match.team1_department_id)}`}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                {match.team1_name || match.team1_code}
                                            </span>
                                            {match.team1_name && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {match.team1_code}
                                                </span>
                                            )}
                                        </div>
                                        <span className="team-score">
                                            {match.team1_score !== null && match.team1_score !== ''
                                                ? match.team1_score
                                                : '-'}
                                        </span>
                                    </div>

                                    {/* VS divider */}
                                    <div className="bracket-vs">
                                        {match.status === 'live' && <span className="live-dot"></span>}
                                        VS
                                    </div>

                                    {/* Team 2 */}
                                    <div className={`bracket-team ${getWinnerClass(match, match.team2_department_id)} ${!match.team2_department_id ? 'team-bye' : ''}`}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                {match.team2_department_id ? (match.team2_name || match.team2_code) : 'BYE'}
                                            </span>
                                            {match.team2_name && match.team2_department_id && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {match.team2_code}
                                                </span>
                                            )}
                                        </div>
                                        <span className="team-score">
                                            {match.team2_score !== null && match.team2_score !== ''
                                                ? match.team2_score
                                                : '-'}
                                        </span>
                                    </div>

                                    {/* Status badge */}
                                    <div className="bracket-status">
                                        {match.status === 'live' && <span className="status-badge status-live">LIVE</span>}
                                        {match.status === 'completed' && <span className="status-badge status-completed">Done</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BracketView;
