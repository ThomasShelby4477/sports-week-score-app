import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

function AdminDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('visibility');
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sports, setSports] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserForm, setShowUserForm] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'organiser', display_name: '' });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeSection === 'users') {
                const data = await api.get('/admin/users');
                setUsers(data);
            } else if (activeSection === 'departments') {
                const data = await api.get('/admin/departments');
                setDepartments(data);
            } else if (activeSection === 'logs') {
                const data = await api.get('/admin/logs');
                setLogs(data);
            } else if (activeSection === 'visibility') {
                const data = await api.get('/admin/sports');
                setSports(data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [activeSection]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Real-time updates via SSE
    useRealTimeUpdates(loadData);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/users', newUser);
            setNewUser({ username: '', password: '', role: 'organiser', display_name: '' });
            setShowUserForm(false);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleToggleVisibility = async (sportId, currentVisible) => {
        try {
            await api.put(`/admin/sports/${sportId}/visibility`, { visible: !currentVisible });
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

    const ROUNDS = [
        { id: 'round1', label: 'R1' },
        { id: 'round2', label: 'R2' },
        { id: 'round3', label: 'R3' },
        { id: 'round4', label: 'R4' },
        { id: 'quarterfinal', label: 'QF' },
        { id: 'semifinal', label: 'SF' },
        { id: 'third_place', label: '3rd' },
        { id: 'final', label: 'Final' }
    ];

    const handleRoundToggle = async (sport, roundId) => {
        try {
            let currentRounds = sport.visible_rounds
                ? sport.visible_rounds.split(',')
                : []; // Default to none if null

            if (currentRounds.includes(roundId)) {
                currentRounds = currentRounds.filter(r => r !== roundId);
            } else {
                currentRounds.push(roundId);
            }

            // If empty, logically means none. If all present, could set to null or keep string.
            // Let's keep string for consistency.

            await api.put(`/admin/sports/${sport.id}/visibility`, { visible_rounds: currentRounds.join(',') });
            loadData();
        } catch (error) {
            alert(error.message);
        }
    };

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
                <div className="scoreboard-header">⚙️ ADMIN DASHBOARD</div>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)',
                flexWrap: 'wrap'
            }}>
                <button
                    className="nav-arrow"
                    onClick={() => setActiveSection('visibility')}
                    style={{
                        background: activeSection === 'visibility' ? 'var(--gold)' : 'var(--bg-dark)',
                        borderColor: activeSection === 'visibility' ? 'var(--gold-light)' : 'var(--bg-elevated)',
                        color: activeSection === 'visibility' ? 'var(--bg-dark)' : 'var(--text-primary)'
                    }}
                >
                    👁️ Visibility
                </button>
                <button
                    className="nav-arrow"
                    onClick={() => setActiveSection('users')}
                    style={{
                        background: activeSection === 'users' ? 'var(--gold)' : 'var(--bg-dark)',
                        borderColor: activeSection === 'users' ? 'var(--gold-light)' : 'var(--bg-elevated)',
                        color: activeSection === 'users' ? 'var(--bg-dark)' : 'var(--text-primary)'
                    }}
                >
                    👥 Users
                </button>
                <button
                    className="nav-arrow"
                    onClick={() => setActiveSection('departments')}
                    style={{
                        background: activeSection === 'departments' ? 'var(--gold)' : 'var(--bg-dark)',
                        borderColor: activeSection === 'departments' ? 'var(--gold-light)' : 'var(--bg-elevated)',
                        color: activeSection === 'departments' ? 'var(--bg-dark)' : 'var(--text-primary)'
                    }}
                >
                    🏢 Departments
                </button>
                <button
                    className="nav-arrow"
                    onClick={() => setActiveSection('logs')}
                    style={{
                        background: activeSection === 'logs' ? 'var(--gold)' : 'var(--bg-dark)',
                        borderColor: activeSection === 'logs' ? 'var(--gold-light)' : 'var(--bg-elevated)',
                        color: activeSection === 'logs' ? 'var(--bg-dark)' : 'var(--text-primary)'
                    }}
                >
                    📜 Logs
                </button>
            </div>

            {loading ? (
                <div className="loading" style={{ marginTop: '2rem' }}><div className="spinner"></div></div>
            ) : (
                <>
                    {/* Sports Visibility Section */}
                    {activeSection === 'visibility' && (
                        <div className="scoreboard">
                            <div className="scoreboard-header">FIXTURES VISIBILITY</div>
                            <div className="scoreboard-subtitle">Control when fixtures are shown to public</div>

                            <div style={{ marginTop: 'var(--space-md)' }}>
                                {[1, 2].map(day => (
                                    <div key={day} style={{ marginBottom: 'var(--space-md)' }}>
                                        <div style={{
                                            fontFamily: 'var(--font-pixel)',
                                            fontSize: '0.625rem',
                                            color: 'var(--text-yellow)',
                                            marginBottom: 'var(--space-sm)'
                                        }}>DAY {day}</div>

                                        {sports.filter(s => s.day === day).map(sport => (
                                            <div key={sport.id} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                padding: 'var(--space-sm)',
                                                background: 'var(--bg-dark)', // using bg-dark for card feel
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--bg-elevated)',
                                                marginBottom: 'var(--space-sm)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                        <span style={{ fontSize: '1.5rem' }}>{sport.icon}</span>
                                                        <strong>{sport.name}</strong>
                                                    </div>
                                                    <button
                                                        className="nav-arrow"
                                                        onClick={() => handleToggleVisibility(sport.id, sport.fixtures_visible)}
                                                        style={{
                                                            background: sport.fixtures_visible ? 'var(--success)' : 'var(--error)',
                                                            borderColor: sport.fixtures_visible ? 'var(--success)' : 'var(--error)',
                                                            color: 'white',
                                                            padding: 'var(--space-xs) var(--space-sm)',
                                                            fontSize: '0.75rem',
                                                            minWidth: '80px'
                                                        }}
                                                    >
                                                        {sport.fixtures_visible ? '✓ ON' : '✗ OFF'}
                                                    </button>
                                                </div>

                                                {sport.fixtures_visible && (
                                                    <div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--bg-elevated)' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>VISIBLE ROUNDS:</div>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {ROUNDS.map(round => {
                                                                const isVisible = sport.visible_rounds && sport.visible_rounds.split(',').includes(round.id);
                                                                return (
                                                                    <button
                                                                        key={round.id}
                                                                        onClick={() => handleRoundToggle(sport, round.id)}
                                                                        style={{
                                                                            padding: '2px 8px',
                                                                            fontSize: '0.75rem',
                                                                            borderRadius: '12px',
                                                                            border: isVisible ? '1px solid var(--accent)' : '1px solid var(--bg-elevated)',
                                                                            background: isVisible ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                                                                            color: isVisible ? 'var(--accent)' : 'var(--text-muted)',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {round.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Users Section */}
                    {
                        activeSection === 'users' && (
                            <div className="scoreboard">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                    <div className="scoreboard-header" style={{ margin: 0 }}>USER MANAGEMENT</div>
                                    <button className="nav-arrow" onClick={() => setShowUserForm(!showUserForm)}>
                                        + Add
                                    </button>
                                </div>

                                {showUserForm && (
                                    <form style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }} onSubmit={handleCreateUser}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ color: 'var(--text-yellow)' }}>Username</label>
                                            <input
                                                className="form-input"
                                                value={newUser.username}
                                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                                required
                                                style={{ background: 'var(--bg-dark)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ color: 'var(--text-yellow)' }}>Password</label>
                                            <input
                                                className="form-input"
                                                type="password"
                                                value={newUser.password}
                                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                                required
                                                style={{ background: 'var(--bg-dark)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ color: 'var(--text-yellow)' }}>Display Name</label>
                                            <input
                                                className="form-input"
                                                value={newUser.display_name}
                                                onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                                                style={{ background: 'var(--bg-dark)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ color: 'var(--text-yellow)' }}>Role</label>
                                            <select
                                                className="form-select"
                                                value={newUser.role}
                                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                                style={{ background: 'var(--bg-dark)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="organiser">Organiser</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            <button type="submit" className="btn-stadium">Create</button>
                                            <button type="button" className="nav-arrow" onClick={() => setShowUserForm(false)}>Cancel</button>
                                        </div>
                                    </form>
                                )}

                                {users.map(u => (
                                    <div key={u.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: 'var(--space-sm)',
                                        borderBottom: '1px solid var(--bg-elevated)'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.display_name || u.username}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username} • {u.role}</div>
                                        </div>
                                        {u.id !== user.id && (
                                            <button className="nav-arrow" style={{ background: 'var(--error)', borderColor: 'var(--error)', color: 'white' }} onClick={() => handleDeleteUser(u.id)}>Del</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    {/* Departments Section */}
                    {
                        activeSection === 'departments' && (
                            <div className="scoreboard">
                                <div className="scoreboard-header">DEPARTMENTS</div>
                                {departments.map(dept => (
                                    <div key={dept.id} style={{
                                        padding: 'var(--space-sm)',
                                        borderBottom: '1px solid var(--bg-elevated)'
                                    }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-cyan)' }}>{dept.short_code}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dept.name}</div>
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    {/* Activity Logs Section */}
                    {
                        activeSection === 'logs' && (
                            <div className="scoreboard">
                                <div className="scoreboard-header">ACTIVITY LOGS</div>
                                {logs.slice(0, 50).map(log => (
                                    <div key={log.id} style={{
                                        padding: 'var(--space-sm)',
                                        borderBottom: '1px solid var(--bg-elevated)',
                                        fontSize: '0.875rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)' }}>{log.details}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-cyan)' }}>by {log.username}</div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </>
            )}
        </div >
    );
}

export default AdminDashboard;
