import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { parseExcelFile } from '../utils/excelParser';
import { Play, Trash2, Clock, Plus, Edit, Search, Loader2, Share2, Check } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const [dumps, setDumps] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('my'); // 'my' or 'public'
    const navigate = useNavigate();

    const [searchInput, setSearchInput] = useState('');
    const [category, setCategory] = useState('All');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sharedDumpId, setSharedDumpId] = useState(null);

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
            setError("Failed to load dumps: " + err.message);
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

    const handleShare = async (dump) => {
        try {
            // If dump is private, make it public first
            if (!dump.isPublic) {
                await api.updateDump(
                    dump.id,
                    dump.name,
                    dump.questions,
                    true, // Make it public
                    dump.timeLimit,
                    dump.showAnswerImmediately,
                    dump.category
                );
                // Update local state
                setDumps(prevDumps => 
                    prevDumps.map(d => 
                        d.id === dump.id ? { ...d, isPublic: true } : d
                    )
                );
            }

            // Generate shareable link
            const shareUrl = `${window.location.origin}/shared/${dump.id}`;
            
            // Copy to clipboard
            try {
                await navigator.clipboard.writeText(shareUrl);
                setSharedDumpId(dump.id);
                setTimeout(() => setSharedDumpId(null), 3000);
            } catch {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setSharedDumpId(dump.id);
                setTimeout(() => setSharedDumpId(null), 3000);
            }
        } catch {
            alert('Failed to share dump');
        }
    };

    const [showTour, setShowTour] = useState(false);

    return (
        <div className="dashboard-container">
            <div className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">Exam Practice Platform</div>
                    <h1 className="hero-title" style={{ marginBottom: '1rem' }}>Your Exam Practice Hub</h1>
                    <p className="hero-subtitle">
                        Practice with exam dumps, upload your own questions, and explore the public library. Master your certification exams with interactive quizzes.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            className="add-button"
                            style={{ background: 'white', color: 'var(--sn-navy)', border: 'none' }}
                            onClick={() => setShowTour(true)}
                            aria-label="Start guided tour"
                        >
                            Start Tour
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
                            <Plus size={18} /> Quick Upload
                        </button>
                    </div>
                </div>
            </div>

            {/* Tour Modal */}
            {showTour && (
                <div className="modal-overlay" onClick={() => setShowTour(false)}>
                    <div className="modal-content tour-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Welcome to Dumps Master! 🎓</h2>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>How to Use This App:</h3>

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
                                        <strong>Download Sample File</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            Download our sample dumps file to see the correct format.
                                        </p>
                                        <a
                                            href="/sample_dumps.xlsx"
                                            download
                                            className="control-button primary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                        >
                                            📥 Download Sample File
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
                                        <strong>Edit Your Dumps</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            Open the CSV file in Excel or Google Sheets. Add your own questions following the same format:
                                        </p>
                                        <ul style={{ color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>
                                            <li>Column A: Question text</li>
                                            <li>Columns B-E: Answer options (A, B, C, D)</li>
                                            <li>Column F: Correct answer (A, B, C, or D)</li>
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
                                        <strong>Upload Your Dump</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            Click the "Add New" button below and upload your edited CSV file. You can set it as public or private.
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
                                        <strong>Start Practicing!</strong>
                                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                                            Click "View" on any dump to start taking the quiz. You can also explore the Public Library to practice with dumps shared by others.
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
                            Got it, Let's Start!
                        </button>
                    </div>
                </div>
            )}

            <div className="content-wrapper">
                <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="section-title">
                            <div className="section-number">{dumps.length}</div>
                            <span>Available Exam Dumps</span>
                        </div>

                        <div className="admin-tabs">
                            <button
                                className={`tab-button ${activeTab === 'my' ? 'active' : ''}`}
                                onClick={() => setActiveTab('my')}
                            >
                                My Dumps
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'public' ? 'active' : ''}`}
                                onClick={() => setActiveTab('public')}
                            >
                                Public Library
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
                                placeholder="Search dumps by name..."
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
                            <option value="All">All Categories</option>
                            <option value="Uncategorized">Uncategorized</option>
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
                            <Plus size={20} /> Add New
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
                        <span><strong>Error:</strong> {error}</span>
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
                        <p style={{ color: 'var(--text-secondary)' }}>Loading dumps...</p>
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
                                    <span>{dump.timeLimit > 0 ? `${dump.timeLimit}m` : 'Self-paced'}</span>
                                </div>

                                <div className="card-footer">
                                    <button
                                        className="btn-text"
                                        onClick={() => navigate('/quiz', { state: { dump } })}
                                    >
                                        View <Play size={14} />
                                    </button>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {/* Share Button - Show for all dumps */}
                                        <button
                                            className="icon-btn"
                                            onClick={() => handleShare(dump)}
                                            title={dump.isPublic ? "Copy share link" : "Share (will make public)"}
                                            style={{ 
                                                color: sharedDumpId === dump.id ? 'var(--sn-green)' : 'var(--text-secondary)'
                                            }}
                                        >
                                            {sharedDumpId === dump.id ? <Check size={16} /> : <Share2 size={16} />}
                                        </button>

                                        {/* Edit and Delete - Only for owner/admin */}
                                        {(activeTab === 'my' || user.role === 'admin') && (
                                            <>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => navigate(`/dump/${dump.id}/edit`, { state: { dump } })}
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn delete"
                                                    onClick={() => handleDelete(dump.id)}
                                                    title="Delete"
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
                                No dumps found
                            </h3>
                            <p style={{ 
                                color: 'var(--text-secondary)', 
                                marginBottom: '1.5rem',
                                maxWidth: '400px',
                                margin: '0 auto 1.5rem'
                            }}>
                                {searchInput || category !== 'All' 
                                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                                    : activeTab === 'my'
                                    ? 'Get started by uploading your first exam dump using the "Add New" button above.'
                                    : 'No public dumps available yet. Check back later or create your own!'}
                            </p>
                            {(!searchInput && category === 'All' && activeTab === 'my') && (
                                <button 
                                    className="add-button"
                                    onClick={() => setShowUpload(true)}
                                    style={{ marginTop: '1rem' }}
                                >
                                    <Plus size={20} /> Create Your First Dump
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
