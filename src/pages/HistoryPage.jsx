import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Calendar, Award, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

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
        if (!attempt.dumpId) return alert(t('errors.originalDumpMissing'));

        try {
            // Fetch all dumps to find the one (since we don't have getDumpById public API yet)
            // Optimization: Backend should support getDumpById.
            // For now, let's try to navigate to /quiz with review mode if we can get the dump.
            // Actually, let's create a specific ReviewWrapper in App.jsx that fetches the dump.
            navigate(`/review/${attempt.dumpId}`, { state: { answers: attempt.answers } });
        } catch (err) {
            alert(t('errors.failedReviewLoad') + (err?.message ? ': ' + err.message : ''));
        }
    };

    const { t } = useI18n();
    return (
        <div className="history-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Award size={32} className="text-primary" />
                    <h2>{t('history.title')}</h2>
                </div>
                <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder={t('history.searchPlaceholder')}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        style={{
                            padding: '8px 16px 8px 36px',
                            borderRadius: '20px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            width: '100%'
                        }}
                    />
                </div>
            </div>

            {/* Summary Bar */}
            <div className="dump-card" style={{ margin: '1rem 0', padding: '1rem' }}>
                {(!history || history.length === 0) ? (
                    <div style={{ color: 'var(--text-secondary)' }}>{t('history.empty.noAttempts')}</div>
                ) : (
                    (() => {
                        const total = history.length;
                        const avg = Math.round(history.reduce((sum, a) => sum + Math.round((a.score / a.total) * 100), 0) / total);
                        const passCount = history.filter(a => Math.round((a.score / a.total) * 100) >= 70).length;
                        const passRate = Math.round((passCount / total) * 100);
                        return (
                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{t('history.summary.attempts')}</span>
                                    <strong>{total}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{t('history.summary.average')}</span>
                                    <strong>{avg}%</strong>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{t('history.summary.passRate')}</span>
                                    <strong style={{ color: 'var(--sn-green)' }}>{passRate}%</strong>
                                </div>
                            </div>
                        );
                    })()
                )}
            </div>

            <div className="history-list" style={{ marginTop: '1rem' }}>
                {history.length === 0 ? (
                    <div className="empty-state">
                        <Award size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3>{t('history.empty.noHistory')}</h3>
                        <p>{debouncedSearch ? t('history.empty.tryDifferent') : t('history.empty.startFromDashboard')}</p>
                    </div>
                ) : (
                    <div className="history-grid">
                        {history.map(attempt => {
                            const percentage = Math.round((attempt.score / attempt.total) * 100);
                            const isPassing = percentage >= 70; // Assuming 70% is passing

                            return (
                                <div key={attempt.id} className={`history-card ${isPassing ? 'pass' : 'fail'}`}>
                                    <div className="result-header">
                                        <h3 className="card-title">{attempt.dumpName || t('history.unknownDump')}</h3>
                                        <span className={`result-badge ${isPassing ? 'pass' : 'fail'}`}>
                                            {isPassing ? t('history.badge.passed') : t('history.badge.failed')}
                                        </span>
                                    </div>

                                    <div className="history-content">
                                        <div className="score-display">
                                            <div className={`score-pill ${isPassing ? 'pass' : 'fail'}`}>{percentage}%</div>
                                            <div className="score-info" style={{ flex: 1 }}>
                                                <div className="score-label">{t('history.score')}</div>
                                                <div className="score-value">{attempt.score} / {attempt.total}</div>
                                                <div className="score-bar">
                                                    <div className={`score-fill ${isPassing ? 'pass' : 'fail'}`} style={{ width: `${percentage}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="history-meta">
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
                                                    {t('history.review')} <Eye size={14} />
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
