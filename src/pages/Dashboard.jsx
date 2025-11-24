import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { parseExcelFile } from '../utils/excelParser';
import { Play, Trash2, Clock, Plus, Edit, Search, Loader2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

const Dashboard = () => {
    const { user } = useAuth();
    const [dumps, setDumps] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('my'); // 'my' | 'public' | 'group'
    const navigate = useNavigate();

    const [searchInput, setSearchInput] = useState('');
    const [category, setCategory] = useState('All');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        if (user) {
            loadDumps();
        }
    }, [user, activeTab, debouncedSearch, category]);

    const loadDumps = async () => {
        setLoading(true);
        setError(null);
        try {
            const userDumps = await api.getDumps(activeTab, debouncedSearch, category);
            setDumps(userDumps);
            setError(null);
        } catch (err) {
            console.error("Failed to load dumps", err);
            setError(t('errors.failedToLoadDumps'));
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file) => {
        setError(null);
        try {
            const questions = await parseExcelFile(file);
            const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            await api.saveDump(name, questions, false, 0, true, 'Uncategorized'); // Default: private, no timer, practice mode, uncategorized
            if (activeTab !== 'my') setActiveTab('my');
            else loadDumps();
            setShowUpload(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this dump?')) {
            try {
                await api.deleteDump(id);
                loadDumps();
            } catch (err) {
                alert(err.message);
            }
        }
    };

    

    

    const [showTour, setShowTour] = useState(false);

    const { t } = useI18n();
    return (
        <div className="dashboard-container">
            <div className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">{t('hero.badge')}</div>
                    <h1 className="hero-title" style={{ marginBottom: '1rem' }}>{t('hero.title')}</h1>
                    <p className="hero-subtitle">
                        {t('hero.subtitle')}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            className="add-button"
                            style={{ background: 'white', color: 'var(--sn-navy)', border: 'none' }}
                            onClick={() => setShowTour(true)}
                            aria-label="Start guided tour"
                        >
                            {t('tour.howto')}
                        </button>
                        <button
                            className="add-button"
                            style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                            onClick={() => {
                                setShowUpload(true);
                                setActiveTab('my');
                            }}
                            aria-label="Add new dump"
                        >
                            <Plus size={18} /> {t('modal.quickUpload.title')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tour Modal */}
            {showTour && (
                <div className="modal-overlay" onClick={() => setShowTour(false)}>
                    <div className="modal-content tour-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{t('tour.title')}</h2>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>{t('tour.howto')}</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        minWidth: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>1</div>
                                    <div>
                                        <strong>{t('tour.step1.title')}</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            {t('tour.step1.desc')}
                                        </p>
                                        <a
                                            href="/sample_dumps.xlsx"
                                            download
                                            className="control-button primary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                        >
                                            {t('tour.step1.cta')}
                                        </a>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        minWidth: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>2</div>
                                    <div>
                                        <strong>{t('tour.step2.title')}</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            {t('tour.step2.desc')}
                                        </p>
                                        <ul style={{ color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>
                                            <li>{t('tour.step2.listA')}</li>
                                            <li>{t('tour.step2.listB')}</li>
                                            <li>{t('tour.step2.listC')}</li>
                                        </ul>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        minWidth: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>3</div>
                                    <div>
                                        <strong>{t('tour.step3.title')}</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            {t('tour.step3.desc')}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        minWidth: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>4</div>
                                    <div>
                                        <strong>{t('tour.step4.title')}</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            {t('tour.step4.desc')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            className="control-button primary"
                            onClick={() => setShowTour(false)}
                            style={{ width: '100%' }}
                        >
                            {t('tour.close')}
                        </button>
                    </div>
                </div>
            )}

            <div className="content-wrapper">
                <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="section-title">
                            <div className="section-number">{dumps.length}</div>
                            <span>{t('section.available')}</span>
                        </div>

                        <div className="admin-tabs">
                            <button
                                className={`tab-button ${activeTab === 'my' ? 'active' : ''}`}
                                onClick={() => setActiveTab('my')}
                            >
                                {t('tabs.my')}
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'group' ? 'active' : ''}`}
                                onClick={() => setActiveTab('group')}
                            >
                                {t('tabs.group')}
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'public' ? 'active' : ''}`}
                                onClick={() => setActiveTab('public')}
                            >
                                {t('tabs.public')}
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="search-filter-group" style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        width: '100%', 
                        marginTop: '1rem',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        <div className="search-wrapper" style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
                            <Search size={18} style={{ 
                                position: 'absolute', 
                                left: '12px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: 'var(--text-secondary)',
                                pointerEvents: 'none'
                            }} />
                            <input
                                type="text"
                                placeholder={t('search.placeholder')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                aria-label="Search dumps"
                                style={{
                                    width: '100%',
                                    padding: '10px 16px 10px 40px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            />
                        </div>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            aria-label="Filter by category"
                            className="category-select"
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                minWidth: '180px',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        >
                            <option value="All">{t('filter.all')}</option>
                            <option value="Uncategorized">{t('filter.uncategorized')}</option>
                            <option value="CSA">CSA - Certified System Administrator</option>
                            <option value="CIS">CIS - Certified Implementation Specialist</option>
                            <option value="CAD">CAD - Certified Application Developer</option>
                            <option value="CTA">CTA - Certified Technical Architect</option>
                            <option value="CSM">CSM - Customer Service Management</option>
                            <option value="ITSM">ITSM - IT Service Management</option>
                            <option value="ITOM">ITOM - IT Operations Management</option>
                            <option value="SecOps">SecOps - Security Operations</option>
                            <option value="HRSD">HRSD - HR Service Delivery</option>
                            <option value="Other">Other</option>
                        </select>
                        <button 
                            className="add-button" 
                            onClick={() => setShowUpload(!showUpload)}
                            aria-label="Add new dump"
                            style={{ flexShrink: 0 }}
                        >
                            <Plus size={20} /> {t('button.addNew')}
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="error-message" style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span><strong>{t('common.errorLabel')}</strong> {error}</span>
                        <button 
                            onClick={() => setError(null)} 
                            className="icon-btn"
                            style={{ color: '#ef4444' }}
                            aria-label="Dismiss error"
                        >
                            ×
                        </button>
                    </div>
                )}

                {showUpload && (
                    <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h3>Quick Upload</h3>
                            <FileUpload onFileUpload={handleFileUpload} />
                            <div className="modal-actions">
                                <button className="control-button secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        padding: '4rem 2rem',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <Loader2 size={32} className="loading-spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>{t('dashboard.loading')}</p>
                    </div>
                )}

                {/* Dumps Grid */}
                {!loading && (
                <div className="dumps-grid">
                    {dumps.map(dump => (
                        <div key={dump.id} className="dump-card">
                            <div className="card-image">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(dump.name)}&background=random&size=400`} alt="Course Cover" />
                                <div className="card-badge">
                                    {dump.category || (dump.isPublic ? 'Public' : 'Private')}
                                </div>
                            </div>

                            <div className="card-content">
                                <h3 className="card-title">{dump.name}</h3>
                                <div className="card-meta">
                                    <Clock size={16} />
                                    <span>{dump.timeLimit > 0 ? `${dump.timeLimit}m` : t('card.selfPaced')}</span>
                                </div>

                                <div className="card-footer">
                                    <button
                                        className="btn-text"
                                        onClick={() => navigate('/quiz', { state: { dump } })}
                                    >
                                        {t('card.view')} <Play size={14} />
                                    </button>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        

                                        {/* Edit and Delete - Only for owner/admin */}
                                        {(activeTab === 'my' || user.role === 'admin') && (
                                            <>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => navigate(`/dump/${dump.id}/edit`, { state: { dump } })}
                                                    title={t('tooltip.edit')}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn delete"
                                                    onClick={() => handleDelete(dump.id)}
                                                    title={t('tooltip.delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {dumps.length === 0 && !loading && (
                        <div className="empty-state" style={{ 
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius)'
                        }}>
                            <div style={{ 
                                width: '80px', 
                                height: '80px', 
                                borderRadius: '50%', 
                                background: 'rgba(65, 182, 230, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem'
                            }}>
                                <Plus size={40} style={{ color: 'var(--primary-color)' }} />
                            </div>
                            <h3 style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: '600', 
                                marginBottom: '0.5rem',
                                color: 'var(--text-primary)'
                            }}>
                                {t('dashboard.empty')}
                            </h3>
                            <p style={{ 
                                color: 'var(--text-secondary)', 
                                marginBottom: '1.5rem',
                                maxWidth: '400px',
                                margin: '0 auto 1.5rem'
                            }}>
                                {searchInput || category !== 'All' 
                                    ? t('empty.hint.search')
                                    : activeTab === 'my'
                                    ? t('empty.hint.my')
                                    : t('empty.hint.public')}
                            </p>
                            {(!searchInput && category === 'All' && activeTab === 'my') && (
                                <button 
                                    className="add-button"
                                    onClick={() => setShowUpload(true)}
                                    style={{ marginTop: '1rem' }}
                                >
                                    <Plus size={20} /> {t('empty.createFirst')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                )}

                
            </div>
        </div>
    );
};

export default Dashboard;
