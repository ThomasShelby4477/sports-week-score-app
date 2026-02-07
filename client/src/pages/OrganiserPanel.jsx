import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

function OrganiserPanel() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'view'
    const [events, setEvents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [matches, setMatches] = useState([]);
    const [results, setResults] = useState([]); // New state for results
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formType, setFormType] = useState(null); // 'result', 'match', 'manual-pair', 'edit-match', 'edit-result'
    const [editingMatch, setEditingMatch] = useState(null);
    const [editingResult, setEditingResult] = useState(null); // New state for editing result

    // Form states
    const [resultForm, setResultForm] = useState({
        event_id: '', department_id: '', participant_name: '', position: 1, score: ''
    });
    const [matchForm, setMatchForm] = useState({
        event_id: '', team1_department_id: '', team2_department_id: '',
        team1_name: '', team2_name: '',
        team1_score: '', team2_score: '', winner_department_id: '', match_type: 'round1', status: 'upcoming',
        isBye: false
    });
    // Auto Pair State
    const [qualifiedTeams, setQualifiedTeams] = useState([]);
    // Manual Pair State
    const [manualPairForm, setManualPairForm] = useState({ event_id: '', from_round: 'round1', target_round: 'quarterfinal', team1_id: '', team2_id: '', isBye: false });
    const [collapsedSports, setCollapsedSports] = useState({});

    const toggleSport = (sportName) => {
        setCollapsedSports(prev => ({
            ...prev,
            [sportName]: !prev[sportName]
        }));
    };

    const loadData = useCallback(async () => {
        try {
            const [eventsData, deptsData, resultsData, matchesData] = await Promise.all([
                api.get('/admin/events'),
                api.get('/admin/departments'),
                api.get('/results'), // Fetch all results
                api.get('/admin/matches') // Fetch all matches
            ]);
            setEvents(eventsData);
            setDepartments(deptsData);
            setResults(resultsData);
            setMatches(matchesData);

            // Initialize all sports as collapsed (only on first load)
            setCollapsedSports(prev => {
                if (Object.keys(prev).length > 0) return prev;
                const sportsSet = new Set(matchesData.map(m => m.sport_name || 'Others'));
                const initialCollapsed = {};
                sportsSet.forEach(sport => {
                    initialCollapsed[sport] = true;
                });
                return initialCollapsed;
            });
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

    const handleAddResult = async (e) => {
        e.preventDefault();
        try {
            await api.post('/results', {
                ...resultForm,
                event_id: parseInt(resultForm.event_id),
                department_id: parseInt(resultForm.department_id),
                position: parseInt(resultForm.position)
            });
            alert('Result added successfully!');
            setResultForm({ event_id: '', department_id: '', participant_name: '', position: 1, score: '' });
            setFormType(null);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleAddMatch = async (e) => {
        e.preventDefault();
        try {
            await api.post('/results/match', {
                ...matchForm,
                team1_name: matchForm.team1_name || null,
                team2_name: matchForm.team2_name || (matchForm.isBye ? 'Bye' : null),
                event_id: parseInt(matchForm.event_id),
                team1_department_id: parseInt(matchForm.team1_department_id),
                team2_department_id: matchForm.isBye ? null : parseInt(matchForm.team2_department_id),
                winner_department_id: matchForm.isBye
                    ? parseInt(matchForm.team1_department_id)
                    : (matchForm.winner_department_id ? parseInt(matchForm.winner_department_id) : null),
                status: matchForm.isBye ? 'completed' : matchForm.status
            });
            alert('Match/Fixture added successfully!');
            setMatchForm({
                event_id: '', team1_department_id: '', team2_department_id: '',
                team1_name: '', team2_name: '',
                team1_score: '', team2_score: '', winner_department_id: '', match_type: 'round1', status: 'upcoming',
                isBye: false
            });
            setFormType(null);
            loadData(); // Reload to show new match
        } catch (error) {
            alert(error.message);
        }
    };

    const handleEditMatch = async (e) => {
        e.preventDefault();
        if (!editingMatch) return;

        try {
            await api.put(`/results/match/${editingMatch.id}`, {
                team1_department_id: parseInt(matchForm.team1_department_id),
                team2_department_id: matchForm.isBye ? null : parseInt(matchForm.team2_department_id),
                team1_name: matchForm.team1_name || null,
                team2_name: matchForm.team2_name || (matchForm.isBye ? 'Bye' : null),
                match_type: matchForm.match_type,
                team1_score: matchForm.team1_score,
                team2_score: matchForm.team2_score,
                winner_department_id: matchForm.isBye
                    ? parseInt(matchForm.team1_department_id)
                    : (matchForm.winner_department_id ? parseInt(matchForm.winner_department_id) : null),
                status: matchForm.isBye ? 'completed' : matchForm.status
            });
            alert('Match updated successfully!');
            setEditingMatch(null);
            setFormType(null);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    const startEditMatch = (match) => {
        setEditingMatch(match);
        setMatchForm({
            event_id: match.event_id,
            team1_department_id: match.team1_department_id,
            team2_department_id: match.team2_department_id || '',
            team1_name: match.team1_name || '',
            team2_name: match.team2_name || '',
            team1_score: match.team1_score || '',
            team2_score: match.team2_score || '',
            winner_department_id: match.winner_department_id || '',
            match_type: match.match_type,
            status: match.status,
            isBye: !match.team2_department_id
        });
        setFormType('edit-match');
    };

    const handleDeleteMatch = async () => {
        if (!editingMatch || !window.confirm('Are you sure you want to delete this fixture? This cannot be undone.')) return;

        try {
            await api.delete(`/results/match/${editingMatch.id}`);
            alert('Match deleted successfully!');
            setEditingMatch(null);
            setFormType(null);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    // Result Editing Handlers
    const startEditResult = (result) => {
        setEditingResult(result);
        setResultForm({
            event_id: result.event_id,
            department_id: result.department_id,
            participant_name: result.participant_name,
            position: result.position,
            score: result.score || ''
        });
        setFormType('edit-result');
    };

    const handleEditResult = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/results/${editingResult.id}`, resultForm);
            alert('Result updated successfully!');
            setEditingResult(null);
            setFormType(null);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteResult = async () => {
        if (!editingResult || !window.confirm('Are you sure you want to delete this result? This cannot be undone.')) return;
        try {
            await api.delete(`/results/${editingResult.id}`);
            alert('Result deleted successfully!');
            setEditingResult(null);
            setFormType(null);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleUpdateEventStatus = async (eventId, status) => {
        try {
            await api.put(`/results/event/${eventId}/status`, { status });
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    const fetchQualifiedTeams = (e) => {
        if (e) e.preventDefault();
        const { event_id, from_round } = manualPairForm;

        if (!event_id) return;

        console.log('Fetching qualified teams for:', { event_id, from_round });

        // Find matches for this event and round that are completed
        const completedMatches = matches.filter(m =>
            m.event_id == event_id &&
            (m.match_type || '').toLowerCase() === (from_round || '').toLowerCase() &&
            m.status === 'completed'
        );

        console.log('Found completed matches:', completedMatches.length);

        if (completedMatches.length === 0) {
            alert('No completed matches found for this round.');
            setQualifiedTeams([]);
            return;
        }

        // Extract teams (Winners or Losers based on target round)
        const isThirdPlace = manualPairForm.target_round === 'third_place';

        const candidates = completedMatches.map(m => {
            // Determine winner and loser IDs
            const winnerId = m.winner_department_id;
            const isTeam1Winner = winnerId == m.team1_department_id;
            const loserId = isTeam1Winner ? m.team2_department_id : m.team1_department_id;

            // For third place, we need losers. For others, we need winners.
            const targetId = isThirdPlace ? loserId : winnerId;

            if (!targetId) return null;

            const name = isThirdPlace
                ? (isTeam1Winner ? m.team2_name : m.team1_name)
                : (isTeam1Winner ? m.team1_name : m.team2_name);

            const code = isThirdPlace
                ? (isTeam1Winner ? m.team2_code : m.team1_code)
                : (m.winner_code || (isTeam1Winner ? m.team1_code : m.team2_code));

            return {
                id: targetId,
                code: code,
                name: name || code // Fallback to code if name is empty/null
            };
        }).filter(t => t && t.id); // Filter out nulls

        // Deduplicate candidates based on ID
        const uniqueCandidates = Array.from(new Map(candidates.map(item => [item.id, item])).values());

        // Filter out teams that are already in the NEXT round (or target round)
        const nextRoundMatches = matches.filter(m =>
            m.event_id == event_id &&
            (m.match_type || '').toLowerCase() === (manualPairForm.target_round || '').toLowerCase()
        );

        const alreadyPairedIds = new Set();
        nextRoundMatches.forEach(m => {
            if (m.team1_department_id) alreadyPairedIds.add(Number(m.team1_department_id));
            if (m.team2_department_id) alreadyPairedIds.add(Number(m.team2_department_id));
        });

        const available = uniqueCandidates.filter(c => !alreadyPairedIds.has(Number(c.id)));
        setQualifiedTeams(available);
    };


    const handleManualPairSubmit = async (e) => {
        e.preventDefault();
        try {
            const team1 = qualifiedTeams.find(t => t.id === parseInt(manualPairForm.team1_id));
            const team2 = manualPairForm.isBye ? null : qualifiedTeams.find(t => t.id === parseInt(manualPairForm.team2_id));

            await api.post('/results/match', {
                event_id: parseInt(manualPairForm.event_id),
                team1_department_id: parseInt(manualPairForm.team1_id),
                team2_department_id: team2 ? parseInt(manualPairForm.team2_id) : null,
                team1_name: team1?.name || null,
                team2_name: team2?.name || (manualPairForm.isBye ? 'Bye' : null),
                match_type: manualPairForm.target_round,
                // If it's a Bye, auto-complete it with Team 1 as winner
                status: manualPairForm.isBye ? 'completed' : 'upcoming',
                winner_department_id: manualPairForm.isBye ? parseInt(manualPairForm.team1_id) : null,
                team1_score: manualPairForm.isBye ? 'Walkover' : null,
                team2_score: manualPairForm.isBye ? '-' : null
            });
            alert('Match created successfully!');
            // Refresh available teams
            fetchQualifiedTeams();
            loadData();
            // Clear selections but keep event/round
            setManualPairForm(prev => ({ ...prev, team1_id: '', team2_id: '' }));
        } catch (error) {
            alert(error.message);
        }
    };

    const groupedEvents = events.reduce((acc, event) => {
        const key = event.sport_name;
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
    }, {});

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div style={{ marginTop: 'var(--space-lg)' }}>
            {/* Back Button */}
            <button
                className="nav-arrow"
                onClick={() => navigate('/')}
                style={{ marginBottom: 'var(--space-md)' }}
            >
                ← Go Back
            </button>

            {/* Header */}
            <div className="scoreboard" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="scoreboard-header">📋 ORGANISER PANEL</div>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)'
            }}>
                <button
                    className="nav-arrow"
                    onClick={() => setActiveTab('manage')}
                    style={{
                        background: activeTab === 'manage' ? 'var(--gold)' : 'var(--bg-dark)',
                        borderColor: activeTab === 'manage' ? 'var(--gold-light)' : 'var(--bg-elevated)',
                        color: activeTab === 'manage' ? 'var(--bg-dark)' : 'var(--text-primary)'
                    }}
                >
                    ✏️ Manage
                </button>
                <button
                    className="nav-arrow"
                    onClick={() => setActiveTab('view')}
                    style={{
                        background: activeTab === 'view' ? 'var(--accent)' : 'var(--bg-dark)',
                        borderColor: activeTab === 'view' ? 'var(--accent-light)' : 'var(--bg-elevated)',
                        color: activeTab === 'view' ? 'var(--bg-dark)' : 'var(--text-primary)'
                    }}
                >
                    📋 View All
                </button>
            </div>

            {/* MANAGE TAB - Add Fixture, Add Result, Pair Next Round */}
            {activeTab === 'manage' && (
                <>
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                        <button
                            className="nav-arrow"
                            onClick={() => setFormType(formType === 'result' ? null : 'result')}
                            style={{
                                background: formType === 'result' ? 'var(--accent)' : 'var(--bg-secondary)',
                                borderColor: formType === 'result' ? 'var(--accent-light)' : 'var(--bg-elevated)'
                            }}
                        >
                            🏅 Add Result
                        </button>
                        <button
                            className="nav-arrow"
                            onClick={() => setFormType(formType === 'match' ? null : 'match')}
                            style={{
                                background: formType === 'match' ? 'var(--gold)' : 'var(--bg-secondary)',
                                borderColor: formType === 'match' ? 'var(--gold-light)' : 'var(--bg-elevated)',
                                color: formType === 'match' ? 'var(--bg-dark)' : 'var(--text-primary)'
                            }}
                        >
                            ⚔️ Add Fixture
                        </button>
                        <button
                            className="nav-arrow"
                            onClick={() => setFormType(formType === 'manual-pair' ? null : 'manual-pair')}
                            style={{
                                background: formType === 'manual-pair' ? 'var(--success)' : 'var(--bg-secondary)',
                                borderColor: formType === 'manual-pair' ? 'var(--success)' : 'var(--bg-elevated)'
                            }}
                        >
                            ⚡ Pair Next Round
                        </button>
                    </div>

                    {/* Add Result Form */}
                    {formType === 'result' && (
                        <form className="card mb-md" onSubmit={handleAddResult}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Add Result (Any Event)</h3>

                            <div className="form-group">
                                <label className="form-label">Event</label>
                                <select
                                    className="form-select"
                                    value={resultForm.event_id}
                                    onChange={(e) => setResultForm({ ...resultForm, event_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Event</option>
                                    {events.map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.sport_name} - {event.name} ({event.category})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select
                                    className="form-select"
                                    value={resultForm.department_id}
                                    onChange={(e) => setResultForm({ ...resultForm, department_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.short_code} - {dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    {(() => {
                                        const selectedEvent = events.find(e => e.id == resultForm.event_id);
                                        if (selectedEvent && (selectedEvent.event_type === 'team' || selectedEvent.name.includes('Relay') || selectedEvent.name.includes('BGMI'))) {
                                            return 'Participant / Team Name';
                                        }
                                        return 'Participant Name';
                                    })()}
                                </label>
                                <input
                                    className="form-input"
                                    value={resultForm.participant_name}
                                    onChange={(e) => setResultForm({ ...resultForm, participant_name: e.target.value })}
                                    placeholder="Enter participant name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Position</label>
                                <select
                                    className="form-select"
                                    value={resultForm.position}
                                    onChange={(e) => setResultForm({ ...resultForm, position: e.target.value })}
                                    required
                                >
                                    <option value="1">🥇 Gold (1st)</option>
                                    <option value="2">🥈 Silver (2nd)</option>
                                    <option value="3">🥉 Bronze (3rd)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Score/Time (optional)</label>
                                <input
                                    className="form-input"
                                    value={resultForm.score}
                                    onChange={(e) => setResultForm({ ...resultForm, score: e.target.value })}
                                    placeholder="e.g., 10.5s or 15.2m"
                                />
                            </div>

                            <div className="flex gap-sm">
                                <button type="submit" className="btn btn-primary">Add Result</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setFormType(null)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    {/* Add Match/Fixture Form */}
                    {formType === 'match' && (
                        <form className="card mb-md" onSubmit={handleAddMatch}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Add Fixture (Knockout Match)</h3>

                            <div className="form-group">
                                <label className="form-label">Event</label>
                                <select
                                    className="form-select"
                                    value={matchForm.event_id}
                                    onChange={(e) => setMatchForm({ ...matchForm, event_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select Event</option>
                                    {events.filter(e => e.event_type === 'team').map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.sport_name} - {event.name} ({event.category})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Team 1 (Department)</label>
                                    <select
                                        className="form-select"
                                        value={matchForm.team1_department_id}
                                        onChange={(e) => setMatchForm({ ...matchForm, team1_department_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.short_code}</option>
                                        ))}
                                    </select>
                                </div>
                                {!matchForm.isBye && (
                                    <div className="form-group">
                                        <label className="form-label">Team 2 (Department)</label>
                                        <select
                                            className="form-select"
                                            value={matchForm.team2_department_id}
                                            onChange={(e) => setMatchForm({ ...matchForm, team2_department_id: e.target.value })}
                                            required={!matchForm.isBye}
                                        >
                                            <option value="">Select</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.short_code}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '25px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={matchForm.isBye}
                                            onChange={(e) => setMatchForm({ ...matchForm, isBye: e.target.checked })}
                                        />
                                        Is Bye (Auto-Advance)
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Team 1 Name (optional)</label>
                                    <input
                                        className="form-input"
                                        value={matchForm.team1_name}
                                        onChange={(e) => setMatchForm({ ...matchForm, team1_name: e.target.value })}
                                        placeholder="e.g., Tiger Squad"
                                    />
                                </div>
                                {!matchForm.isBye && (
                                    <div className="form-group">
                                        <label className="form-label">Team 2 Name (optional)</label>
                                        <input
                                            className="form-input"
                                            value={matchForm.team2_name}
                                            onChange={(e) => setMatchForm({ ...matchForm, team2_name: e.target.value })}
                                            placeholder="e.g., Eagle Squad"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Round</label>
                                <select
                                    className="form-select"
                                    value={matchForm.match_type}
                                    onChange={(e) => setMatchForm({ ...matchForm, match_type: e.target.value })}
                                >
                                    <option value="round1">Round 1</option>
                                    <option value="round2">Round 2</option>
                                    <option value="round3">Round 3</option>
                                    <option value="round4">Round 4</option>
                                    <option value="quarterfinal">Quarter-final</option>
                                    <option value="semifinal">Semi-final</option>
                                    <option value="third_place">Third Place</option>
                                    <option value="final">Final</option>
                                </select>
                            </div>

                            <div className="flex gap-sm">
                                <button type="submit" className="btn btn-gold">Add Fixture</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setFormType(null)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    {/* Manual Pair Form */}
                    {formType === 'manual-pair' && (
                        <div className="card mb-md">
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>⚡ Manual Pair - Next Round</h3>
                            <p className="text-muted mb-md">Select winners from a previous round to pair them for the next round.</p>

                            <div className="form-group">
                                <label className="form-label">Select Event</label>
                                <select
                                    className="form-select"
                                    value={manualPairForm.event_id}
                                    onChange={(e) => {
                                        setManualPairForm({ ...manualPairForm, event_id: e.target.value });
                                        setQualifiedTeams([]);
                                    }}
                                >
                                    <option value="">Select Event</option>
                                    {events.filter(e => e.event_type === 'team').map(event => (
                                        <option key={event.id} value={event.id}>
                                            {event.sport_name} - {event.name} ({event.category})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Winners From (Previous Round)</label>
                                    <select
                                        className="form-select"
                                        value={manualPairForm.from_round}
                                        onChange={(e) => setManualPairForm({ ...manualPairForm, from_round: e.target.value })}
                                    >
                                        <option value="round1">Round 1</option>
                                        <option value="round2">Round 2</option>
                                        <option value="round3">Round 3</option>
                                        <option value="round4">Round 4</option>
                                        <option value="quarterfinal">Quarter-finals</option>
                                        <option value="semifinal">Semi-finals</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Create Match For (Target Round)</label>
                                    <select
                                        className="form-select"
                                        value={manualPairForm.target_round}
                                        onChange={(e) => setManualPairForm({ ...manualPairForm, target_round: e.target.value })}
                                    >
                                        <option value="round2">Round 2</option>
                                        <option value="round3">Round 3</option>
                                        <option value="round4">Round 4</option>
                                        <option value="quarterfinal">Quarter-finals</option>
                                        <option value="semifinal">Semi-finals</option>
                                        <option value="third_place">Third Place</option>
                                        <option value="final">Final</option>
                                    </select>
                                </div>
                            </div>

                            <button className="btn btn-secondary mb-md" onClick={fetchQualifiedTeams}>
                                🔍 Find Qualified Teams
                            </button>

                            {qualifiedTeams.length > 0 ? (
                                <form onSubmit={handleManualPairSubmit} style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-dark)' }}>
                                    <h4>Create Match</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: manualPairForm.isBye ? '1fr 0.5fr 1fr' : '1fr 0.2fr 1fr', gap: 'var(--space-md)', alignItems: 'center' }}>
                                        <div className="form-group">
                                            <label className="form-label">Team 1</label>
                                            <select
                                                className="form-select"
                                                value={manualPairForm.team1_id}
                                                onChange={(e) => setManualPairForm({ ...manualPairForm, team1_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Team</option>
                                                {qualifiedTeams.filter(t => t.id !== parseInt(manualPairForm.team2_id)).map(t => (
                                                    <option key={t.id} value={t.id}>{t.name || t.code}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                            {manualPairForm.isBye ? '➡️' : 'VS'}
                                        </div>

                                        {manualPairForm.isBye ? (
                                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '24px' }}>
                                                <span className="badge badge-success" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Walkover / Bye</span>
                                            </div>
                                        ) : (
                                            <div className="form-group">
                                                <label className="form-label">Team 2</label>
                                                <select
                                                    className="form-select"
                                                    value={manualPairForm.team2_id}
                                                    onChange={(e) => setManualPairForm({ ...manualPairForm, team2_id: e.target.value })}
                                                    required={!manualPairForm.isBye}
                                                >
                                                    <option value="">Select Team</option>
                                                    {qualifiedTeams.filter(t => t.id !== parseInt(manualPairForm.team1_id)).map(t => (
                                                        <option key={t.id} value={t.id}>{t.name || t.code}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group mt-sm">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={manualPairForm.isBye}
                                                onChange={(e) => setManualPairForm({ ...manualPairForm, isBye: e.target.checked })}
                                            />
                                            <strong>This is a Bye (Direct Qualification)</strong>
                                        </label>
                                        <p className="text-muted text-sm ml-lg">
                                            Use this if there is an odd number of teams (e.g., 5 winners). The selected team will automatically advance to the next round.
                                        </p>
                                    </div>

                                    <button type="submit" className="btn btn-gold mt-sm">Create Match</button>
                                </form>
                            ) : (
                                manualPairForm.event_id && <p className="text-muted">No qualified teams found for selection. Check if previous round matches are completed.</p>
                            )}

                            <button className="btn btn-secondary mt-md" onClick={() => setFormType(null)}>Close</button>
                        </div>
                    )}


                </>
            )}

            {/* VIEW TAB - Results, Fixtures, Events Lists */}
            {activeTab === 'view' && (
                <>
                    {/* Individual Results List */}
                    {results.length > 0 && (
                        <div className="scoreboard" style={{ marginBottom: 'var(--space-md)' }}>
                            <div className="scoreboard-header">SUBMITTED RESULTS</div>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                {results.map(result => (
                                    <div key={result.id}>
                                        {/* Result Card */}
                                        <div
                                            className="card mb-sm card-clickable"
                                            onClick={() => {
                                                if (editingResult?.id === result.id) {
                                                    setEditingResult(null);
                                                    setFormType(null);
                                                } else {
                                                    startEditResult(result);
                                                }
                                            }}
                                            style={{
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderColor: editingResult?.id === result.id ? 'var(--accent)' : undefined
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 700 }}>
                                                    {result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : '🥉'} {result.participant_name} ({result.dept_code})
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {result.sport_name} • {result.event_name} • {result.category}
                                                </div>
                                                {result.score && <div className="text-muted" style={{ fontSize: '0.75rem' }}>Score: {result.score}</div>}
                                            </div>
                                            <button className="btn btn-sm btn-secondary">
                                                {editingResult?.id === result.id ? '▲ Close' : '✏️ Edit'}
                                            </button>
                                        </div>

                                        {/* Inline Edit Form */}
                                        {editingResult?.id === result.id && formType === 'edit-result' && (
                                            <form
                                                className="card"
                                                onSubmit={handleEditResult}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    marginTop: '-0.5rem',
                                                    marginBottom: 'var(--space-sm)',
                                                    background: 'var(--bg-secondary)',
                                                    borderTop: 'none',
                                                    borderTopLeftRadius: 0,
                                                    borderTopRightRadius: 0
                                                }}
                                            >
                                                {/* Event Selector */}
                                                <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                                    <label className="form-label">Event</label>
                                                    <select
                                                        className="form-select"
                                                        value={resultForm.event_id}
                                                        onChange={(e) => setResultForm({ ...resultForm, event_id: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Select Event</option>
                                                        {events.map(ev => (
                                                            <option key={ev.id} value={ev.id}>
                                                                {ev.sport_name} • {ev.name} • {ev.category}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                                    <div className="form-group">
                                                        <label className="form-label">Department</label>
                                                        <select
                                                            className="form-select"
                                                            value={resultForm.department_id}
                                                            onChange={(e) => setResultForm({ ...resultForm, department_id: e.target.value })}
                                                            required
                                                        >
                                                            <option value="">Select</option>
                                                            {departments.map(dept => (
                                                                <option key={dept.id} value={dept.id}>{dept.short_code}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Position</label>
                                                        <select
                                                            className="form-select"
                                                            value={resultForm.position}
                                                            onChange={(e) => setResultForm({ ...resultForm, position: e.target.value })}
                                                            required
                                                        >
                                                            <option value="1">🥇 Gold</option>
                                                            <option value="2">🥈 Silver</option>
                                                            <option value="3">🥉 Bronze</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Participant Name</label>
                                                    <input
                                                        className="form-input"
                                                        value={resultForm.participant_name}
                                                        onChange={(e) => setResultForm({ ...resultForm, participant_name: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Score/Time</label>
                                                    <input
                                                        className="form-input"
                                                        value={resultForm.score}
                                                        onChange={(e) => setResultForm({ ...resultForm, score: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex gap-sm">
                                                    <button type="submit" className="btn btn-primary btn-sm">💾 Save</button>
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFormType(null); setEditingResult(null); }}>Cancel</button>
                                                    <button type="button" className="btn btn-sm" style={{ backgroundColor: 'var(--error)', color: 'white', marginLeft: 'auto' }} onClick={handleDeleteResult}>🗑️ Delete</button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                    }

                    {/* Fixtures List - Grouped by Sport */}
                    <div className="panel-section">
                        <div className="panel-section-title">Current Fixtures (Grouped by Sport)</div>
                        {matches.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📅</div>
                                <p>No fixtures scheduled yet.</p>
                            </div>
                        ) : (
                            Object.entries(matches.reduce((acc, match) => {
                                const key = match.sport_name || 'Others';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(match);
                                return acc;
                            }, {})).map(([sportName, sportMatches]) => (
                                <div key={sportName} style={{ marginBottom: 'var(--space-lg)' }}>
                                    <h4
                                        onClick={() => toggleSport(sportName)}
                                        style={{
                                            color: 'var(--gold)',
                                            borderBottom: '1px solid var(--bg-elevated)',
                                            paddingBottom: 'var(--space-xs)',
                                            marginBottom: 'var(--space-md)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {sportName}
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {collapsedSports[sportName] ? '▼ Show' : '▲ Hide'}
                                        </span>
                                    </h4>
                                    {!collapsedSports[sportName] && (
                                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                            {sportMatches.map(match => (
                                                <div key={match.id}>
                                                    {/* Match Card */}
                                                    <div
                                                        className="card mb-sm card-clickable"
                                                        onClick={() => {
                                                            if (editingMatch?.id === match.id) {
                                                                setEditingMatch(null);
                                                                setFormType(null);
                                                            } else {
                                                                startEditMatch(match);
                                                            }
                                                        }}
                                                        style={{
                                                            cursor: 'pointer',
                                                            borderColor: editingMatch?.id === match.id ? 'var(--gold)' : undefined
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                                                                    {match.team1_name || match.team1_code} {match.team1_score || '-'} vs {match.team2_score || '-'} {match.team2_department_id ? (match.team2_name || match.team2_code) : 'BYE'}
                                                                </div>
                                                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                    {match.event_name} • {match.match_type}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                                                {match.status === 'live' && <span className="status-badge status-live">LIVE</span>}
                                                                {match.status === 'completed' && <span className="status-badge status-completed">Done</span>}
                                                                {match.status === 'upcoming' && <span className="status-badge status-upcoming">Upcoming</span>}
                                                                <button className="btn btn-sm btn-secondary">
                                                                    {editingMatch?.id === match.id ? '▲' : '✏️'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Inline Edit Form */}
                                                    {editingMatch?.id === match.id && formType === 'edit-match' && (
                                                        <form
                                                            className="card"
                                                            onSubmit={handleEditMatch}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                marginTop: '-0.5rem',
                                                                marginBottom: 'var(--space-sm)',
                                                                background: 'var(--bg-secondary)',
                                                                borderTop: 'none',
                                                                borderTopLeftRadius: 0,
                                                                borderTopRightRadius: 0
                                                            }}
                                                        >
                                                            {/* Event Selector */}
                                                            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                                                <label className="form-label">Event</label>
                                                                <select
                                                                    className="form-select"
                                                                    value={matchForm.event_id}
                                                                    onChange={(e) => setMatchForm({ ...matchForm, event_id: e.target.value })}
                                                                    required
                                                                >
                                                                    <option value="">Select Event</option>
                                                                    {events.filter(ev => ev.event_type === 'team').map(ev => (
                                                                        <option key={ev.id} value={ev.id}>
                                                                            {ev.sport_name} • {ev.name} • {ev.category}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                                                <div className="form-group">
                                                                    <label className="form-label">Team 1 Dept</label>
                                                                    <select
                                                                        className="form-select"
                                                                        value={matchForm.team1_department_id}
                                                                        onChange={(e) => setMatchForm({ ...matchForm, team1_department_id: e.target.value })}
                                                                        required
                                                                    >
                                                                        <option value="">Select</option>
                                                                        {departments.map(dept => (
                                                                            <option key={dept.id} value={dept.id}>{dept.short_code}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                {!matchForm.isBye && (
                                                                    <div className="form-group">
                                                                        <label className="form-label">Team 2 Dept</label>
                                                                        <select
                                                                            className="form-select"
                                                                            value={matchForm.team2_department_id}
                                                                            onChange={(e) => setMatchForm({ ...matchForm, team2_department_id: e.target.value })}
                                                                            required={!matchForm.isBye}
                                                                        >
                                                                            <option value="">Select</option>
                                                                            {departments.map(dept => (
                                                                                <option key={dept.id} value={dept.id}>{dept.short_code}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '25px' }}>
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={matchForm.isBye}
                                                                            onChange={(e) => setMatchForm({ ...matchForm, isBye: e.target.checked })}
                                                                        />
                                                                        Is Bye
                                                                    </label>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                                                <div className="form-group">
                                                                    <label className="form-label">Team 1 Name</label>
                                                                    <input
                                                                        className="form-input"
                                                                        value={matchForm.team1_name}
                                                                        onChange={(e) => setMatchForm({ ...matchForm, team1_name: e.target.value })}
                                                                        placeholder="Custom Name"
                                                                    />
                                                                </div>
                                                                {(!matchForm.isBye) && (
                                                                    <div className="form-group">
                                                                        <label className="form-label">Team 2 Name</label>
                                                                        <input
                                                                            className="form-input"
                                                                            value={matchForm.team2_name}
                                                                            onChange={(e) => setMatchForm({ ...matchForm, team2_name: e.target.value })}
                                                                            placeholder="Custom Name"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                                                <div className="form-group">
                                                                    <label className="form-label">Team 1 Score</label>
                                                                    <input
                                                                        className="form-input"
                                                                        value={matchForm.team1_score}
                                                                        onChange={(e) => setMatchForm({ ...matchForm, team1_score: e.target.value })}
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label className="form-label">Team 2 Score</label>
                                                                    <input
                                                                        className="form-input"
                                                                        value={matchForm.team2_score}
                                                                        onChange={(e) => setMatchForm({ ...matchForm, team2_score: e.target.value })}
                                                                        placeholder="0"
                                                                        disabled={matchForm.isBye}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                                                <div className="form-group">
                                                                    <label className="form-label">Winner</label>
                                                                    <select
                                                                        className="form-select"
                                                                        value={matchForm.winner_department_id}
                                                                        onChange={(e) => setMatchForm({ ...matchForm, winner_department_id: e.target.value })}
                                                                    >
                                                                        <option value="">Not decided</option>
                                                                        {matchForm.team1_department_id && (
                                                                            <option value={matchForm.team1_department_id}>
                                                                                {departments.find(d => d.id === parseInt(matchForm.team1_department_id))?.short_code || 'Team 1'}
                                                                            </option>
                                                                        )}
                                                                        {!matchForm.isBye && matchForm.team2_department_id && (
                                                                            <option value={matchForm.team2_department_id}>
                                                                                {departments.find(d => d.id === parseInt(matchForm.team2_department_id))?.short_code || 'Team 2'}
                                                                            </option>
                                                                        )}
                                                                    </select>
                                                                </div>
                                                                <div className="form-group">
                                                                    <label className="form-label">Status</label>
                                                                    <select
                                                                        className="form-select"
                                                                        value={matchForm.status}
                                                                        onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value })}
                                                                    >
                                                                        <option value="upcoming">Upcoming</option>
                                                                        <option value="live">🔴 LIVE</option>
                                                                        <option value="completed">Completed</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-sm">
                                                                <button type="submit" className="btn btn-primary btn-sm">💾 Save</button>
                                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFormType(null); setEditingMatch(null); }}>Cancel</button>
                                                                <button type="button" className="btn btn-sm" style={{ backgroundColor: 'var(--error)', color: 'white', marginLeft: 'auto' }} onClick={handleDeleteMatch}>🗑️ Delete</button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Events List */}
                    <div className="panel-section">
                        <div className="panel-section-title">All Events</div>
                        {Object.entries(groupedEvents).map(([sportName, sportEvents]) => (
                            <div key={sportName} className="mb-md">
                                <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--gold)' }}>{sportName}</h4>
                                {sportEvents.map(event => (
                                    <div key={event.id} className="card mb-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{event.name}</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {event.category} • {event.event_type}
                                            </div>
                                        </div>
                                        <div className="flex gap-sm">
                                            <select
                                                className="form-select"
                                                value={event.status}
                                                onChange={(e) => handleUpdateEventStatus(event.id, e.target.value)}
                                                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            >
                                                <option value="upcoming">Upcoming</option>
                                                <option value="live">Live</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default OrganiserPanel;
