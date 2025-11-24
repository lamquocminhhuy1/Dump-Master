import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Save, ArrowLeft, Trash2, Globe, Lock, Clock, FileText, Plus, X, Check, Download, Upload, MoreVertical } from 'lucide-react';

const DumpEditor = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const isEditMode = !!id;

    const [dump, setDump] = useState(location.state?.dump || null);
    const [name, setName] = useState(dump?.name || '');
    const [isPublic, setIsPublic] = useState(dump?.isPublic || false);
    const [timeLimit, setTimeLimit] = useState(dump?.timeLimit || 0);
    const [showAnswerImmediately, setShowAnswerImmediately] = useState(dump?.showAnswerImmediately !== undefined ? dump.showAnswerImmediately : true);
    const [category, setCategory] = useState(dump?.category || 'Uncategorized');
    const [questions, setQuestions] = useState(dump?.questions || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [ownedGroups, setOwnedGroups] = useState([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [filteredList, setFilteredList] = useState(null);
    const [selectedGroups, setSelectedGroups] = useState([]);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [newQuestion, setNewQuestion] = useState({
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        correctAnswer: 'A'
    });

    // Import/Export state
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateData, setDuplicateData] = useState(null);
    const [importFile, setImportFile] = useState(null);

    useEffect(() => {
        if (isEditMode && !dump) { // Only load if in edit mode and dump data isn't already available
            loadDump();
        } else if (dump) { // If dump is already available (e.g., from location.state), initialize states
            setName(dump.name);
            setIsPublic(dump.isPublic);
            setTimeLimit(dump.timeLimit);
            setShowAnswerImmediately(dump.showAnswerImmediately !== undefined ? dump.showAnswerImmediately : true);
            setCategory(dump.category || 'Uncategorized');
            setQuestions(dump.questions);
        }
        (async () => {
            try {
                const data = await api.getGroups();
                setOwnedGroups(data.owned || []);
            } catch {
                setOwnedGroups([]);
            }
        })();
    }, [isEditMode, id, dump]);

    const loadDump = async () => {
        setLoading(true);
        setError('');
        try {
            const found = await api.getDumpById(id);
            if (found) {
                setDump(found);
                setName(found.name);
                setIsPublic(found.isPublic);
                setTimeLimit(found.timeLimit);
                setShowAnswerImmediately(found.showAnswerImmediately !== undefined ? found.showAnswerImmediately : true);
                setCategory(found.category || 'Uncategorized');
                setQuestions(found.questions || []);
                setError('');
            } else {
                setError('Dump not found');
                setDump(null);
            }
        } catch (err) {
            try {
                const all = await api.getAllDumps('', '');
                const found = all.find(d => String(d.id) === String(id));
                if (found) {
                    setDump(found);
                    setName(found.name);
                    setIsPublic(found.isPublic);
                    setTimeLimit(found.timeLimit);
                    setShowAnswerImmediately(found.showAnswerImmediately !== undefined ? found.showAnswerImmediately : true);
                    setCategory(found.category || 'Uncategorized');
                    setQuestions(found.questions || []);
                    setError('');
                } else {
                    setError(err.message || 'Failed to load dump');
                    setDump(null);
                }
            } catch (err2) {
                setError(err.message || err2.message || 'Failed to load dump');
                setDump(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name) return alert('Please enter a name');
        if (questions.length === 0) return alert('Please add at least one question');

        setLoading(true);
        setError('');
        try {
            if (isEditMode) {
                await api.updateDump(id, name, questions, isPublic, timeLimit, showAnswerImmediately, category);
            } else {
                // Assuming a saveDump function exists for creating new dumps
                await api.saveDump(name, questions, isPublic, timeLimit, showAnswerImmediately, category);
            }
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!isEditMode) return alert('Please save the dump first before exporting');
        try {
            await api.exportDump(id, name);
        } catch (err) {
            alert('Export failed: ' + err.message);
        }
    };

    const submitShareToGroups = async () => {
        if (!isEditMode) return;
        try {
            await api.setDumpGroups(id, selectedGroups.map(g => g.id));
            setShowShareModal(false);
            setSelectedGroups([]);
            setFilteredList(null);
            alert('Share settings saved');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!isEditMode) {
            alert('Please save the dump first before importing');
            return;
        }
        if (!id) {
            alert('Invalid dump ID');
            return;
        }

        setImportFile(file);
        setLoading(true);
        setError(''); // Clear any previous errors
        try {
            const result = await api.importDump(id, file);

            if (result.status === 'duplicates_found') {
                // Show duplicate modal
                setDuplicateData(result);
                setShowDuplicateModal(true);
            } else if (result.status === 'success') {
                // Import successful, reload dump to get updated questions
                await loadDump();
                // Show success message
                alert(result.message || `Import completed. Total questions: ${result.totalQuestions || questions.length}`);
            } else {
                alert('Import completed with status: ' + (result.status || 'unknown'));
                await loadDump();
            }
        } catch (err) {
            const errorMsg = err.message || 'Import failed';
            alert('Import failed: ' + errorMsg);
            setError(errorMsg);
            // Don't clear dump state on error, allow user to retry
        } finally {
            setLoading(false);
            if (e && e.target) {
                e.target.value = ''; // Reset file input
            }
        }
    };

    const handleDuplicateAction = async (action) => {
        if (!importFile) return;
        if (!id) {
            alert('Invalid dump ID');
            return;
        }

        setLoading(true);
        setError(''); // Clear any previous errors
        try {
            const result = await api.importDump(id, importFile, action);
            // Close modal first
            setShowDuplicateModal(false);
            setDuplicateData(null);
            setImportFile(null);
            
            // Reload dump to get updated questions
            await loadDump();
            
            // Show success message
            alert(result.message || `Import completed. Total questions: ${result.totalQuestions || questions.length}`);
        } catch (err) {
            const errorMsg = err.message || 'Import failed';
            alert('Import failed: ' + errorMsg);
            setError(errorMsg);
            // Keep modal open so user can try different action
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuestion = (index) => {
        if (window.confirm('Delete this question?')) {
            const newQuestions = [...questions];
            newQuestions.splice(index, 1);
            setQuestions(newQuestions);
        }
    };

    const handleEditQuestion = (index) => {
        setEditingIndex(index);
        setNewQuestion({ ...questions[index] });
        setShowAddModal(true);
    };

    const handleSaveQuestion = () => {
        if (!newQuestion.question || !newQuestion.options.A || !newQuestion.options.B) {
            alert('Please fill in the question and at least options A and B.');
            return;
        }

        const updatedQuestions = [...questions];
        if (editingIndex >= 0) {
            updatedQuestions[editingIndex] = newQuestion;
        } else {
            updatedQuestions.push(newQuestion);
        }

        setQuestions(updatedQuestions);
        setNewQuestion({
            question: '',
            options: { A: '', B: '', C: '', D: '' },
            correctAnswer: 'A'
        });
        setEditingIndex(-1);
        setShowAddModal(false);
    };

    const openAddModal = () => {
        setEditingIndex(-1);
        setNewQuestion({
            question: '',
            options: { A: '', B: '', C: '', D: '' },
            correctAnswer: 'A'
        });
        setShowAddModal(true);
    };

    if (loading && !dump && !error) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate(-1)} className="icon-btn" title="Back">
                            <ArrowLeft size={24} />
                        </button>
                        <h2>Edit Dump</h2>
                    </div>
                </div>
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    // Show error but still allow navigation
    if (error && !dump) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate(-1)} className="icon-btn" title="Back">
                            <ArrowLeft size={24} />
                        </button>
                        <h2>Edit Dump</h2>
                    </div>
                </div>
                <div className="dump-card" style={{ padding: '2rem', margin: '2rem auto', maxWidth: '600px' }}>
                    <div className="error-message" style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid #ef4444', 
                        color: '#ef4444',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <strong>Error:</strong> {error}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => navigate(-1)} className="control-button secondary">
                            Go Back
                        </button>
                        {isEditMode && (
                            <button onClick={loadDump} className="control-button primary">
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container" style={{ paddingBottom: '80px' }}>
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate(-1)} className="icon-btn" title="Back">
                        <ArrowLeft size={24} />
                    </button>
                    <h2>Edit Dump</h2>
                </div>
            </div>

            {/* Show error banner if there's an error but dump is loaded */}
            {error && dump && (
                <div className="error-message" style={{ 
                    margin: '1rem 0',
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid #ef4444', 
                    color: '#ef4444',
                    padding: '1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span><strong>Error:</strong> {error}</span>
                    <button 
                        onClick={() => setError('')} 
                        className="icon-btn" 
                        style={{ color: '#ef4444' }}
                        title="Dismiss error"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            <div className="dump-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Settings</h3>
                <div className="form-group">
                    <label>Dump Name</label>
                    <div className="input-wrapper">
                        <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter dump name"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                    <div className="form-group">
                        <label>Visibility</label>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                className={`tab-button ${!isPublic ? 'active' : ''}`}
                                onClick={() => setIsPublic(false)}
                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center' }}
                            >
                                <Lock size={16} /> Private
                            </button>
                            <button
                                type="button"
                                className={`tab-button ${isPublic ? 'active' : ''}`}
                                onClick={() => setIsPublic(true)}
                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center' }}
                            >
                                <Globe size={16} /> Public
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Category</label>
                        <div className="input-wrapper">
                            <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="select-input"
                            >
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
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Quiz Mode</label>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                className={`tab-button ${showAnswerImmediately ? 'active' : ''}`}
                                onClick={() => setShowAnswerImmediately(true)}
                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                title="Show answers immediately after each question"
                            >
                                Practice
                            </button>
                            <button
                                type="button"
                                className={`tab-button ${!showAnswerImmediately ? 'active' : ''}`}
                                onClick={() => setShowAnswerImmediately(false)}
                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                title="Show answers only at the end of the quiz"
                            >
                                Exam
                            </button>
                        </div>
                        <small style={{ color: 'var(--text-secondary)', marginTop: '8px', display: 'block', lineHeight: '1.5' }}>
                            <strong>Practice:</strong> See correct answers immediately after each question.<br />
                            <strong>Exam:</strong> Complete all questions first, then review answers at the end.
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Time Limit (Minutes)</label>
                        <div className="input-wrapper">
                            <Clock size={20} style={{ color: 'var(--text-secondary)' }} />
                            <input
                                type="number"
                                min="0"
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Set to 0 for no limit</small>
                    </div>
                </div>
            </div>

            <div className="questions-section">
                <div className="section-header">
                    <h3>Questions ({questions.length})</h3>
                    <button className="add-button" onClick={openAddModal} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                        <Plus size={18} /> Add Question
                    </button>
                </div>

                <div className="list-grid">
                    {questions.map((q, idx) => (
                        <div key={idx} className="dump-card" style={{ padding: '1.5rem', flexDirection: 'row', alignItems: 'flex-start', gap: '1rem' }}>
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleEditQuestion(idx)}>
                                <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
                                    <span style={{ color: 'var(--primary-color)', marginRight: '8px' }}>Q{idx + 1}:</span>
                                    {q.question}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    <span style={{ fontWeight: '500', color: 'var(--sn-green)' }}>Answer: {q.correctAnswer}</span>
                                    <span style={{ margin: '0 8px' }}>•</span>
                                    <span>{Object.keys(q.options).filter(k => q.options[k]).length} Options</span>
                                </div>
                            </div>
                            <button
                                className="icon-btn delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                                title="Delete Question"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {questions.length === 0 && (
                        <div className="empty-state">No questions yet. Add one to get started!</div>
                    )}
                </div>
            </div>

            {/* Sticky Action Bar - Redesigned with Better UX */}
            <div className="action-bar">
                <div className="action-bar-content">
                    {/* Left: Export/Import Actions Group */}
                    {isEditMode && (
                        <div className="action-group">
                            <button 
                                onClick={handleExport} 
                                className="control-button tertiary" 
                                disabled={loading}
                                title="Export questions to Excel file"
                            >
                                <Download size={18} />
                                <span>Export</span>
                            </button>
                            <label 
                                className={`control-button tertiary ${loading ? 'disabled' : ''}`}
                                style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                                title="Import questions from Excel file"
                            >
                                <Upload size={18} />
                                <span>Import</span>
                                <input 
                                    type="file" 
                                    accept=".xlsx,.xls" 
                                    style={{ display: 'none' }} 
                                    onChange={handleImportFile}
                                    disabled={loading}
                                />
                            </label>
                            <button 
                                onClick={async () => {
                                    try {
                                        const current = await api.getDumpGroups(id);
                                        const ownedIds = new Set(ownedGroups.map(g => g.id));
                                        const preselect = current.filter(g => ownedIds.has(g.id));
                                        setSelectedGroups(preselect);
                                    } catch {
                                        setSelectedGroups([]);
                                    }
                                    setShowShareModal(true);
                                }}
                                className="control-button tertiary"
                                disabled={loading}
                                title="Share this dump to your groups"
                            >
                                Share to Groups
                            </button>
                        </div>
                    )}
                    
                    {/* Right: Primary Actions Group */}
                    <div className="action-group">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="control-button secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="control-button primary" 
                            disabled={loading}
                        >
                            <Save size={18} />
                            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {showShareModal && (
                <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Share to Your Groups</h3>
                        <div className="input-wrapper" style={{ marginTop: '0.75rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>🔎</span>
                            <input
                                type="text"
                                placeholder="Filter groups"
                                onChange={(e) => {
                                    const q = e.target.value.toLowerCase();
                                    const all = [...ownedGroups];
                                    const filtered = all.filter(g => (g.name || '').toLowerCase().includes(q));
                                    setFilteredList(filtered);
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>{selectedGroups.length} selected</span>
                            <button className="btn-text" onClick={() => setSelectedGroups([])}>Clear selection</button>
                        </div>
                        <div style={{ maxHeight: '260px', overflow: 'auto', margin: '1rem 0' }}>
                            {(filteredList ?? ownedGroups).map(g => {
                                const checked = selectedGroups.some(s => s.id === g.id);
                                return (
                                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 8px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedGroups(prev => [...prev, g]);
                                                    else setSelectedGroups(prev => prev.filter(s => s.id !== g.id));
                                                }}
                                            />
                                            <strong>{g.name}</strong>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
                            <button className="control-button secondary" onClick={() => setShowShareModal(false)}>Cancel</button>
                            <button className="control-button secondary" onClick={async () => { try { await api.setDumpGroups(id, []); setSelectedGroups([]); setShowShareModal(false); alert('Unshared from all groups'); } catch (err) { alert(err.message); } }}>Unshare All</button>
                            <button className="control-button primary" onClick={submitShareToGroups}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Handling Modal */}
            {showDuplicateModal && duplicateData && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                        <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', maxWidth: '600px' }}>
                            <h2>Duplicate Questions Detected</h2>
                            <p>{duplicateData.message}</p>
                            <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {duplicateData.duplicates.map((dup, idx) => (
                                    <li key={idx} style={{ marginBottom: '0.5rem' }}>
                                        <strong>{dup.question}</strong>
                                        {dup.hasChanges && <span style={{ color: 'var(--warning-color)', marginLeft: '0.5rem' }}>(Changed)</span>}
                                    </li>
                                ))}
                            </ul>
                            <div className="modal-actions">
                                <button 
                                    className="control-button secondary" 
                                    onClick={() => setShowDuplicateModal(false)}
                                >
                                    Cancel
                                </button>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        className="control-button secondary" 
                                        onClick={() => handleDuplicateAction('skip')}
                                    >
                                        Skip Duplicates
                                    </button>
                                    <button 
                                        className="control-button secondary" 
                                        onClick={() => handleDuplicateAction('replace')}
                                    >
                                        Replace Duplicates
                                    </button>
                                    <button 
                                        className="control-button primary" 
                                        onClick={() => handleDuplicateAction('merge')}
                                    >
                                        Merge All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {/* Add/Edit Question Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>{editingIndex >= 0 ? 'Edit Question' : 'Add New Question'}</h3>
                        <button onClick={() => setShowAddModal(false)} className="icon-btn"><X size={24} /></button>
                    </div>

                    <div className="form-group">
                        <label>Question Text</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                value={newQuestion.question}
                                onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                                placeholder="Enter the question..."
                                autoFocus
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {['A', 'B', 'C', 'D'].map((opt) => (
                            <div key={opt} className="form-group">
                                <label>Option {opt}</label>
                                <div className="input-wrapper">
                                    <span style={{ fontWeight: 'bold', color: 'var(--primary-color)', marginRight: '8px' }}>{opt}</span>
                                    <input
                                        type="text"
                                        value={newQuestion.options[opt]}
                                        onChange={(e) => setNewQuestion({
                                            ...newQuestion,
                                            options: { ...newQuestion.options, [opt]: e.target.value }
                                        })}
                                        placeholder={`Option ${opt}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="form-group">
                        <label>Correct Answer</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {['A', 'B', 'C', 'D'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: opt })}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: newQuestion.correctAnswer === opt ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        background: newQuestion.correctAnswer === opt ? 'rgba(65, 182, 230, 0.1)' : 'var(--bg-body)',
                                        color: newQuestion.correctAnswer === opt ? 'var(--primary-color)' : 'var(--text-primary)',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                        <div className="modal-actions">
                            <button 
                                onClick={() => setShowAddModal(false)} 
                                className="control-button secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveQuestion} 
                                className="control-button primary"
                            >
                                <Check size={18} />
                                <span>{editingIndex >= 0 ? 'Update Question' : 'Add Question'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DumpEditor;
