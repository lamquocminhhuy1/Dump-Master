import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Calendar, Award, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HistoryPage = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadHistory = useCallback(async () => {
        try {
            const userHistory = await api.getHistory(debouncedSearch);
            setHistory(userHistory);
        } catch (err) {
            console.error("Failed to load history", err);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        if (user) {
            loadHistory();
        }
    }, [user, loadHistory]);


    const handleReview = async (attempt) => {
        if (!attempt.dumpId) return alert("Original dump not found (might be deleted).");

        try {
            // Fetch all dumps to find the one (since we don't have getDumpById public API yet)
            // Optimization: Backend should support getDumpById.
            // For now, let's try to navigate to /quiz with review mode if we can get the dump.
            // Actually, let's create a specific ReviewWrapper in App.jsx that fetches the dump.
            navigate(`/review/${attempt.dumpId}`, { state: { answers: attempt.answers } });
        } catch (err) {
            alert("Failed to load dump for review: " + (err?.message || ''));
        }
    };

    return (
        <div className="history-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Award size={32} className="text-primary" />
                    <h2>Quiz History</h2>
                </div>
                <div className="search-wrapper" style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search history..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{
                            padding: '8px 16px 8px 36px',
                            borderRadius: '20px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            width: '250px'
                        }}
                    />
                </div>
            </div>

            {/* Summary Bar */}
            <div className="dump-card" style={{ margin: '1rem 0', padding: '1rem' }}>
                {useMemo(() => {
                    if (!history || history.length === 0) return (
                        <div style={{ color: 'var(--text-secondary)' }}>No attempts yet</div>
                    );
                    const total = history.length;
                    const avg = Math.round(history.reduce((sum, a) => sum + Math.round((a.score / a.total) * 100), 0) / total);
                    const passCount = history.filter(a => Math.round((a.score / a.total) * 100) >= 70).length;
                    const passRate = Math.round((passCount / total) * 100);
                    return (
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Attempts:</span>
                                <strong>{total}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Average:</span>
                                <strong>{avg}%</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Pass rate:</span>
                                <strong style={{ color: 'var(--sn-green)' }}>{passRate}%</strong>
                            </div>
                        </div>
                    );
                }, [history])}
            </div>

            <div className="history-list" style={{ marginTop: '1rem' }}>
                {history.length === 0 ? (
                    <div className="empty-state">
                        <Award size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3>No history found</h3>
                        <p>{debouncedSearch ? 'Try a different search term.' : 'Start a quiz from the dashboard to track your progress!'}</p>
                    </div>
                ) : (
                    <div className="list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
                        {history.map(attempt => {
                            const percentage = Math.round((attempt.score / attempt.total) * 100);
                            const isPassing = percentage >= 70; // Assuming 70% is passing

                            return (
                                <div key={attempt.id} className="dump-card history-card" style={{ borderLeft: `4px solid ${isPassing ? 'var(--success)' : 'var(--error)'}` }}>
                                    <div className="card-header">
                                        <h3 className="card-title">{attempt.dumpName || 'Unknown Dump'}</h3>
                                        <span className={`badge ${isPassing ? 'badge-public' : 'badge-private'}`}>
                                            {isPassing ? 'Passed' : 'Failed'}
                                        </span>
                                    </div>

                                    <div className="card-content">
                                        <div className="score-display" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            margin: '1rem 0'
                                        }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                background: isPassing ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: isPassing ? 'var(--success)' : 'var(--error)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '800',
                                                fontSize: '1.2rem'
                                            }}>
                                                {percentage}%
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Score</div>
                                                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{attempt.score} / {attempt.total}</div>
                                            </div>
                                        </div>

                                        <div className="history-meta" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                            borderTop: '1px solid var(--border-color)',
                                            paddingTop: '1rem',
                                            marginTop: 'auto'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Calendar size={14} />
                                                {new Date(attempt.createdAt).toLocaleDateString()}
                                            </div>
                                            {attempt.answers && (
                                                <button
                                                    onClick={() => handleReview(attempt)}
                                                    className="btn-text"
                                                    style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                                                >
                                                    Review <Eye size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
