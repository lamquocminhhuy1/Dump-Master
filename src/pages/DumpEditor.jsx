import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../context/I18nContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { Save, ArrowLeft, Trash2, Globe, Lock, Clock, FileText, Plus, X, Check, Download, Upload, MoreVertical } from 'lucide-react';
import HtmlEditor from '../components/HtmlEditor';

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
    const [coverImage, setCoverImage] = useState(dump?.coverImage || '');
    const [coverUploading, setCoverUploading] = useState(false);
    const coverFileInputRef = useRef(null);
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
        type: 'multiple_choice_single',
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        correctAnswer: 'A',
        correctAnswers: [],
        acceptedAnswers: [],
        isHtml: false
    });
    const [dragIndex, setDragIndex] = useState(-1);
    const [dragImport, setDragImport] = useState(false);
    const [dragType, setDragType] = useState(null);
    const [hoverIndex, setHoverIndex] = useState(-1);
    const [leftTab, setLeftTab] = useState('settings');

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
            setCoverImage(dump.coverImage || '');
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
                setCoverImage(found.coverImage || '');
                setQuestions(found.questions || []);
                setError('');
            } else {
                setError(t('errors.dumpNotFound'));
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
                    setCoverImage(found.coverImage || '');
                    setQuestions(found.questions || []);
                    setError('');
                } else {
                    setError(err.message || t('errors.failedToLoadDump'));
                    setDump(null);
                }
            } catch (err2) {
                setError(err.message || err2.message || t('errors.failedToLoadDump'));
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
                await api.updateDump(id, name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage);
            } else {
                await api.saveDump(name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage);
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
        await processImportFile(file);
    };

    const processImportFile = async (file) => {
        if (!file) return;
        if (!isEditMode) {
            alert('Please save the dump first before importing');
            return;
        }
        if (!id) {
            alert(t('errors.invalidDumpId'));
            return;
        }
        setImportFile(file);
        setLoading(true);
        setError('');
        try {
            const result = await api.importDump(id, file);
            if (result.status === 'duplicates_found') {
                setDuplicateData(result);
                setShowDuplicateModal(true);
            } else if (result.status === 'success') {
                await loadDump();
                alert(result.message || `Import completed. Total questions: ${result.totalQuestions || questions.length}`);
            } else {
                alert('Import completed with status: ' + (result.status || 'unknown'));
                await loadDump();
            }
        } catch (err) {
            const errorMsg = err.message || 'Import failed';
            alert('Import failed: ' + errorMsg);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicateAction = async (action) => {
        if (!importFile) return;
        if (!id) {
            alert(t('errors.invalidDumpId'));
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
        const q = questions[index] || {};
        const corrects = Array.isArray(q.correctAnswers)
            ? q.correctAnswers
            : (q.correctAnswer ? [q.correctAnswer] : []);
        let baseType = q.type || (corrects.length > 1 ? 'multiple_choice_multiple' : 'multiple_choice_single');
        if (q.type === 'html_field') {
            baseType = 'html_field';
        } else if (!q.options || Object.keys(q.options || {}).length === 0 || q.acceptedAnswers) {
            baseType = 'short_answer';
        } else if ((q.options?.A === 'True' && q.options?.B === 'False') || (q.options?.A === 'Đúng' && q.options?.B === 'Sai')) {
            baseType = 'true_false';
        }
        let normalizedOptions = q.options;
        if (baseType === 'short_answer' || baseType === 'html_field') {
            normalizedOptions = {};
        } else if (baseType === 'true_false') {
            normalizedOptions = { A: 'True', B: 'False' };
        } else {
            normalizedOptions = {
                A: q.options?.A ?? '',
                B: q.options?.B ?? '',
                C: q.options?.C ?? '',
                D: q.options?.D ?? ''
            };
        }
        setNewQuestion({ type: baseType, ...q, options: normalizedOptions, correctAnswers: corrects, acceptedAnswers: q.acceptedAnswers || [], isHtml: !!q.isHtml });
        setShowAddModal(true);
    };

    const handleSaveQuestion = () => {
        if (!newQuestion.question) {
            alert('Please fill in the question.');
            return;
        }
        const toSave = { ...newQuestion };
        const selectedCorrects = Array.isArray(newQuestion.correctAnswers)
            ? newQuestion.correctAnswers
            : (newQuestion.correctAnswer ? [newQuestion.correctAnswer] : []);

        if (newQuestion.type === 'short_answer') {
            toSave.options = {};
            toSave.correctAnswer = undefined;
            toSave.correctAnswers = undefined;
            toSave.acceptedAnswers = (newQuestion.acceptedAnswers || [])
                .map(x => (x || '').trim())
                .filter(x => x !== '');
            if (toSave.acceptedAnswers.length === 0) {
                alert('Please add at least one accepted answer.');
                return;
            }
        } else if (newQuestion.type === 'html_field') {
            toSave.options = {};
            toSave.correctAnswer = undefined;
            toSave.correctAnswers = undefined;
            toSave.acceptedAnswers = undefined;
        } else if (newQuestion.type === 'true_false') {
            toSave.options = { A: 'True', B: 'False' };
            if (selectedCorrects.length === 0) {
                alert('Please select the correct answer.');
                return;
            }
            toSave.correctAnswer = selectedCorrects[0] || 'A';
            toSave.correctAnswers = [toSave.correctAnswer];
        } else if (newQuestion.type === 'multiple_choice_multiple') {
            if (!newQuestion.options.A || !newQuestion.options.B) {
                alert('Please fill at least options A and B.');
                return;
            }
            if (selectedCorrects.length === 0) {
                alert('Please select at least one correct answer.');
                return;
            }
            toSave.correctAnswers = selectedCorrects;
            toSave.correctAnswer = selectedCorrects[0];
        } else {
            if (!newQuestion.options.A || !newQuestion.options.B) {
                alert('Please fill at least options A and B.');
                return;
            }
            if (selectedCorrects.length === 0) {
                alert('Please select the correct answer.');
                return;
            }
            toSave.correctAnswer = selectedCorrects[0];
            toSave.correctAnswers = [toSave.correctAnswer];
        }

        toSave.isHtml = true;

        const updatedQuestions = [...questions];
        if (editingIndex >= 0) {
            updatedQuestions[editingIndex] = toSave;
        } else {
            updatedQuestions.push(toSave);
        }

        setQuestions(updatedQuestions);
        setNewQuestion({
            type: 'multiple_choice_single',
            question: '',
            options: { A: '', B: '', C: '', D: '' },
            correctAnswer: 'A',
            correctAnswers: [],
            acceptedAnswers: [],
            isHtml: false
        });
        setEditingIndex(-1);
        setShowAddModal(false);
    };

    const openAddModal = () => {
        setEditingIndex(-1);
        setNewQuestion({
            type: 'multiple_choice_single',
            question: '',
            options: { A: '', B: '', C: '', D: '' },
            correctAnswer: 'A',
            correctAnswers: [],
            acceptedAnswers: [],
            isHtml: false
        });
        setShowAddModal(true);
    };

    const { t } = useI18n();
    if (loading && !dump && !error) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate(-1)} className="icon-btn" title="Back">
                            <ArrowLeft size={24} />
                        </button>
                        <h2>{t('editor.title')}</h2>
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
                        <h2>{t('editor.title')}</h2>
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
                        <strong>{t('common.errorLabel')}</strong> {error}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => navigate(-1)} className="control-button secondary">
                            {t('common.cancel')}
                        </button>
                        {isEditMode && (
                            <button onClick={loadDump} className="control-button primary">
                                {t('common.loading')}
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
                    <h2>{t('editor.title')}</h2>
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
                    <span><strong>{t('common.errorLabel')}</strong> {error}</span>
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

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{ width: '320px', minWidth: '320px', boxSizing: 'border-box', flexShrink: 0, position: 'sticky', top: '80px', alignSelf: 'flex-start' }}>
                <div className="dump-card" style={{ marginBottom: '1rem', padding: '1.25rem', maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button type="button" className={`tab-button ${leftTab === 'settings' ? 'active' : ''}`} onClick={() => setLeftTab('settings')} style={{ flex: 1 }}>
                                {t('editor.settings')}
                            </button>
                            <button type="button" className={`tab-button ${leftTab === 'types' ? 'active' : ''}`} onClick={() => setLeftTab('types')} style={{ flex: 1 }}>
                                {t('editor.questionType')}
                            </button>
                        </div>

                        {leftTab === 'settings' && (
                            <div>
                                <div className="form-group">
                                    <label>{t('editor.dumpName')}</label>
                                    <div className="input-wrapper">
                                        <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('editor.enterDumpName')}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>{t('editor.visibility')}</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                className={`tab-button ${!isPublic ? 'active' : ''}`}
                                                onClick={() => setIsPublic(false)}
                                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center' }}
                                            >
                                                <Lock size={16} /> {t('editor.private')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`tab-button ${isPublic ? 'active' : ''}`}
                                                onClick={() => setIsPublic(true)}
                                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center' }}
                                            >
                                                <Globe size={16} /> {t('editor.public')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>{t('editor.category')}</label>
                                        <div className="input-wrapper">
                                            <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                                            <select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="select-input"
                                            >
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
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>{t('editor.quizMode')}</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                className={`tab-button ${showAnswerImmediately ? 'active' : ''}`}
                                                onClick={() => setShowAnswerImmediately(true)}
                                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                                title={t('editor.practiceHint')}
                                            >
                                                {t('editor.practice')}
                                            </button>
                                            <button
                                                type="button"
                                                className={`tab-button ${!showAnswerImmediately ? 'active' : ''}`}
                                                onClick={() => setShowAnswerImmediately(false)}
                                                style={{ border: '1px solid var(--border-color)', flex: 1, justifyContent: 'center', fontSize: '0.9rem' }}
                                                title={t('editor.examHint')}
                                            >
                                                {t('editor.exam')}
                                            </button>
                                        </div>
                                        <small style={{ color: 'var(--text-secondary)', marginTop: '8px', display: 'block', lineHeight: '1.5' }}>
                                            <strong>{t('editor.practice')}:</strong> {t('editor.practiceHint')}<br />
                                            <strong>{t('editor.exam')}:</strong> {t('editor.examHint')}
                                        </small>
                                    </div>

                                <div className="form-group">
                                    <label>{t('editor.timeLimitMinutes')}</label>
                                    <div className="input-wrapper">
                                        <Clock size={20} style={{ color: 'var(--text-secondary)' }} />
                                        <input
                                            type="number"
                                            min="0"
                                            value={timeLimit}
                                            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>{t('editor.noLimitHint')}</small>
                                </div>

                                <div className="form-group">
                                    <label>{t('editor.coverImage')}</label>
                                    <input
                                        ref={coverFileInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setCoverUploading(true);
                                            try {
                                                const result = await api.uploadImage(file);
                                                const url = result.url.startsWith('/uploads/') ? `http://localhost:3000${result.url}` : result.url;
                                                setCoverImage(url);
                                            } catch (err) {
                                                alert(err.message);
                                            } finally {
                                                setCoverUploading(false);
                                            }
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button 
                                            type="button" 
                                            className="control-button secondary" 
                                            onClick={() => coverFileInputRef.current && coverFileInputRef.current.click()} 
                                            disabled={coverUploading}
                                        >
                                            {coverUploading ? t('common.loading') : t('editor.coverImageUpload')}
                                        </button>
                                    </div>
                                    {coverImage && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <img src={coverImage} alt="Cover preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        )}

                        {leftTab === 'types' && (
                            <div className="form-group">
                                <label>{t('editor.questionType')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button type="button" className="tab-button" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }} draggable onDragStart={() => { setDragType('multiple_choice_single'); setHoverIndex(-1); }} onDragEnd={() => setDragType(null)}>
                                        {t('editor.types.multipleSingle')}
                                    </button>
                                    <button type="button" className="tab-button" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }} draggable onDragStart={() => { setDragType('multiple_choice_multiple'); setHoverIndex(-1); }} onDragEnd={() => setDragType(null)}>
                                        {t('editor.types.multipleMultiple')}
                                    </button>
                                    <button type="button" className="tab-button" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }} draggable onDragStart={() => { setDragType('true_false'); setHoverIndex(-1); }} onDragEnd={() => setDragType(null)}>
                                        {t('editor.types.trueFalse')}
                                    </button>
                                    <button type="button" className="tab-button" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }} draggable onDragStart={() => { setDragType('short_answer'); setHoverIndex(-1); }} onDragEnd={() => setDragType(null)}>
                                        {t('editor.types.shortAnswer')}
                                    </button>
                                    <button type="button" className="tab-button" style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }} draggable onDragStart={() => { setDragType('html_field'); setHoverIndex(-1); }} onDragEnd={() => setDragType(null)}>
                                        {t('editor.types.htmlField')}
                                    </button>
                                    <small style={{ color: 'var(--text-secondary)' }}>{t('editor.addQuestion')}</small>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1 }}>
            <div className="questions-section">
                <div className="section-header">
                    <h3>{t('editor.questions')} ({questions.length})</h3>
                    <button className="add-button" onClick={openAddModal} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                        <Plus size={18} /> {t('editor.addQuestion')}
                    </button>
                </div>

                <div 
                    className="list-grid"
                    onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={() => {
                            if (dragType) {
                                let created = { type: dragType, question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', correctAnswers: [], acceptedAnswers: [] };
                                if (dragType === 'true_false') {
                                    created = { type: dragType, question: '', options: { A: 'True', B: 'False' }, correctAnswer: 'A', correctAnswers: [] };
                                } else if (dragType === 'short_answer') {
                                    created = { type: dragType, question: '', options: {}, acceptedAnswers: [], correctAnswer: undefined, correctAnswers: undefined };
                                } else if (dragType === 'html_field') {
                                    created = { type: dragType, question: '', options: {}, correctAnswer: undefined, correctAnswers: undefined, acceptedAnswers: undefined };
                                } else if (dragType === 'multiple_choice_multiple') {
                                    created = { type: dragType, question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswers: [], correctAnswer: 'A', acceptedAnswers: [] };
                                }
                                const arr = [...questions];
                                arr.push(created);
                            setQuestions(arr);
                            setDragType(null);
                            setHoverIndex(-1);
                            return;
                        }
                        if (dragIndex !== -1) {
                            const arr = [...questions];
                            const [moved] = arr.splice(dragIndex, 1);
                            arr.push(moved);
                            setQuestions(arr);
                            setDragIndex(-1);
                            setHoverIndex(-1);
                        }
                    }}
                >
                    {questions.map((q, idx) => (
                        <div
                            key={idx}
                            className="dump-card"
                            style={{ padding: '1.25rem', flexDirection: 'row', alignItems: 'flex-start', gap: '0.75rem', border: (dragIndex === idx || hoverIndex === idx) ? '2px dashed var(--primary-color)' : '1px solid var(--border-color)' }}
                            draggable
                            onDragStart={() => setDragIndex(idx)}
                            onDragOver={(e) => { e.preventDefault(); setHoverIndex(idx); }}
                            onDrop={() => {
                                if (dragType) {
                                    let created = { type: dragType, question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', correctAnswers: [], acceptedAnswers: [] };
                                    if (dragType === 'true_false') {
                                        created = { type: dragType, question: '', options: { A: 'True', B: 'False' }, correctAnswer: 'A', correctAnswers: [] };
                                    } else if (dragType === 'short_answer') {
                                        created = { type: dragType, question: '', options: {}, acceptedAnswers: [], correctAnswer: undefined, correctAnswers: undefined };
                                    } else if (dragType === 'html_field') {
                                        created = { type: dragType, question: '', options: {}, correctAnswer: undefined, correctAnswers: undefined, acceptedAnswers: undefined };
                                    } else if (dragType === 'multiple_choice_multiple') {
                                        created = { type: dragType, question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswers: [], correctAnswer: 'A', acceptedAnswers: [] };
                                    }
                                    const arr = [...questions];
                                    arr.splice(idx, 0, created);
                                    setQuestions(arr);
                                    setDragType(null);
                                    setHoverIndex(-1);
                                    return;
                                }
                                if (dragIndex === -1 || dragIndex === idx) { setHoverIndex(-1); return; }
                                const arr = [...questions];
                                const [moved] = arr.splice(dragIndex, 1);
                                arr.splice(idx, 0, moved);
                                setQuestions(arr);
                                setDragIndex(-1);
                                setHoverIndex(-1);
                            }}
                            onDragLeave={() => setHoverIndex(-1)}
                            onDragEnd={() => { setDragIndex(-1); setDragType(null); setHoverIndex(-1); }}
                        >
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleEditQuestion(idx)}>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1.02rem' }}>
                                    <span style={{ color: 'var(--primary-color)', marginRight: '8px' }}>Q{idx + 1}:</span>
                                    {q.isHtml || /<[^>]+>/.test(q.question || '') ? (
                                        <span style={{ display: 'inline' }} dangerouslySetInnerHTML={{ __html: q.question }} />
                                    ) : (
                                        <span>{q.question}</span>
                                    )}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: '500', color: 'var(--sn-green)' }}>{t('editor.answerLabel')}: {(Array.isArray(q.correctAnswers) ? q.correctAnswers.join(',') : q.correctAnswer || '-')}</span>
                                    <span style={{ margin: '0 8px' }}>•</span>
                                    <span>{t('editor.optionsCount', { count: Object.keys(q.options).filter(k => q.options[k]).length })}</span>
                                </div>
                            </div>
                            <button
                                className="icon-btn delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                                title={t('editor.deleteQuestion')}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {questions.length === 0 && (
                        <div 
                            className="empty-state"
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={() => {
                                if (dragType) {
                                    let created = { type: dragType, question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', correctAnswers: [], acceptedAnswers: [] };
                                    if (dragType === 'true_false') {
                                        created = { type: dragType, question: '', options: { A: 'True', B: 'False' }, correctAnswer: 'A', correctAnswers: [] };
                                    } else if (dragType === 'short_answer') {
                                        created = { type: dragType, question: '', options: {}, acceptedAnswers: [], correctAnswer: undefined, correctAnswers: undefined };
                                    } else if (dragType === 'html_field') {
                                        created = { type: dragType, question: '', options: {}, correctAnswer: undefined, correctAnswers: undefined, acceptedAnswers: undefined };
                                    } else if (dragType === 'multiple_choice_multiple') {
                                        created = { type: dragType, question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswers: [], correctAnswer: 'A', acceptedAnswers: [] };
                                    }
                                    const arr = [...questions];
                                    arr.push(created);
                                    setQuestions(arr);
                                    setDragType(null);
                                    setHoverIndex(-1);
                                    return;
                                }
                            }}
                            style={{ border: dragType ? '2px dashed var(--primary-color)' : '1px solid var(--border-color)' }}
                        >
                            {t('editor.emptyNoQuestions')}
                        </div>
                    )}
                </div>
            </div>
                </div>
            </div>

            
            <div className="editor-footer">
            <div className="action-bar">
                <div className="action-bar-content">
                    {isEditMode && (
                        <div className="action-group" style={{ gap: '0.5rem' }}>
                            <button 
                                onClick={handleExport} 
                                className="control-button tertiary" 
                                disabled={loading}
                                title="Xuất câu hỏi ra Excel"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                                <Download size={16} />
                                <span>{t('common.export')}</span>
                            </button>
                            <label 
                                className={`control-button tertiary ${loading ? 'disabled' : ''}`}
                                style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, border: dragImport ? '2px dashed var(--primary-color)' : 'none', padding: '6px 12px', fontSize: '0.85rem' }}
                                title="Nhập câu hỏi từ Excel"
                                onDragOver={(e) => { e.preventDefault(); setDragImport(true); }}
                                onDragLeave={() => setDragImport(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragImport(false);
                                    const file = e.dataTransfer?.files?.[0];
                                    if (file) processImportFile(file);
                                }}
                            >
                                <Upload size={16} />
                                <span>{t('common.import')}</span>
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
                                title="Chia sẻ bộ đề cho nhóm của bạn"
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                                {t('common.shareToGroups')}
                            </button>
                        </div>
                    )}
                    
                    
                    <div className="action-group" style={{ gap: '0.5rem' }}>
                        <button 
                            onClick={() => navigate(-1)} 
                            className="control-button secondary"
                            disabled={loading}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                            {t('common.cancel')}
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="control-button primary" 
                            disabled={loading}
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                            <Save size={16} />
                            <span>{loading ? t('common.loading') : t('common.saveChanges')}</span>
                        </button>
                    </div>
                </div>
            </div>
            </div>

            {showShareModal && (
                <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>{t('common.shareToGroups')}</h3>
                        <div className="input-wrapper" style={{ marginTop: '0.75rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>🔎</span>
                            <input
                                type="text"
                                placeholder={t('editor.filterGroups')}
                                onChange={(e) => {
                                    const q = e.target.value.toLowerCase();
                                    const all = [...ownedGroups];
                                    const filtered = all.filter(g => (g.name || '').toLowerCase().includes(q));
                                    setFilteredList(filtered);
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>{t('editor.selectedCount', { count: selectedGroups.length })}</span>
                            <button className="btn-text" onClick={() => setSelectedGroups([])}>{t('editor.clearSelection')}</button>
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
                            <button className="control-button secondary" onClick={() => setShowShareModal(false)}>{t('common.cancel')}</button>
                            <button className="control-button secondary" onClick={async () => { try { await api.setDumpGroups(id, []); setSelectedGroups([]); setShowShareModal(false); alert(t('editor.unshareAll')); } catch (err) { alert(err.message); } }}>{t('editor.unshareAll')}</button>
                            <button className="control-button primary" onClick={submitShareToGroups}>{t('common.saveChanges')}</button>
                        </div>
                    </div>
                </div>
            )}

            
            {showDuplicateModal && duplicateData && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                        <div className="modal-content" style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', maxWidth: '600px' }}>
                            <h2>{t('editor.duplicates.title')}</h2>
                            <p>{duplicateData.message}</p>
                            <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {duplicateData.duplicates.map((dup, idx) => (
                                    <li key={idx} style={{ marginBottom: '0.5rem' }}>
                                        {(dup.isHtml || /<[^>]+>/.test(dup.question || '')) ? (
                                            <strong dangerouslySetInnerHTML={{ __html: dup.question }} />
                                        ) : (
                                            <strong>{dup.question}</strong>
                                        )}
                                        {dup.hasChanges && <span style={{ color: 'var(--warning-color)', marginLeft: '0.5rem' }}>(Changed)</span>}
                                    </li>
                                ))}
                            </ul>
                            <div className="modal-actions">
                                <button 
                                    className="control-button secondary" 
                                    onClick={() => setShowDuplicateModal(false)}
                                >
                                    {t('common.cancel')}
                                </button>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        className="control-button secondary" 
                                        onClick={() => handleDuplicateAction('skip')}
                                    >
                                        {t('editor.duplicates.skip')}
                                    </button>
                                    <button 
                                        className="control-button secondary" 
                                        onClick={() => handleDuplicateAction('replace')}
                                    >
                                        {t('editor.duplicates.replace')}
                                    </button>
                                    <button 
                                        className="control-button primary" 
                                        onClick={() => handleDuplicateAction('merge')}
                                    >
                                        {t('editor.duplicates.merge')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>{editingIndex >= 0 ? t('editor.editQuestion') : t('editor.addQuestion')}</h3>
                        <button onClick={() => setShowAddModal(false)} className="icon-btn"><X size={24} /></button>
                    </div>

                    <div className="form-group">
                        <label>{t('editor.questionType')}</label>
                        <div className="input-wrapper">
                            <select
                                value={newQuestion.type}
                                onChange={(e) => {
                                    const nextType = e.target.value;
                                    let next = { ...newQuestion, type: nextType };
                                    if (nextType === 'true_false') {
                                        next = { ...next, options: { A: 'True', B: 'False' }, correctAnswers: [], correctAnswer: 'A' };
                                    } else if (nextType === 'short_answer') {
                                        next = { ...next, options: {}, correctAnswers: [], correctAnswer: undefined, acceptedAnswers: [] };
                                    } else if (nextType === 'html_field') {
                                        next = { ...next, options: {}, correctAnswers: [], correctAnswer: undefined, acceptedAnswers: undefined };
                                    } else if (nextType === 'multiple_choice_multiple') {
                                        next = { ...next, correctAnswers: [] };
                                    } else {
                                        next = { ...next, correctAnswers: [], correctAnswer: 'A' };
                                    }
                                    setNewQuestion(next);
                                }}
                                className="select-input"
                            >
                                <option value="multiple_choice_single">{t('editor.types.multipleSingle')}</option>
                                <option value="multiple_choice_multiple">{t('editor.types.multipleMultiple')}</option>
                                <option value="true_false">{t('editor.types.trueFalse')}</option>
                                <option value="short_answer">{t('editor.types.shortAnswer')}</option>
                                <option value="html_field">{t('editor.types.htmlField')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t('editor.questionText')}</label>
                        <div className="input-wrapper">
                            <HtmlEditor
                                value={newQuestion.question}
                                onChange={(html) => setNewQuestion({ ...newQuestion, question: html })}
                            />
                        </div>
                        <small style={{ color: 'var(--text-secondary)' }}>{t('editor.htmlHint')}</small>
                    </div>

                    {newQuestion.type !== 'short_answer' && newQuestion.type !== 'html_field' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            {['A', 'B', 'C', 'D'].map((opt) => (
                                <div key={opt} className="form-group">
                                    <label>{t('editor.optionLabel', { opt })}</label>
                                    <div className="input-wrapper">
                                        <span style={{ fontWeight: 'bold', color: 'var(--primary-color)', marginRight: '8px' }}>{opt}</span>
                                        <input
                                            type="text"
                                            value={newQuestion.options?.[opt] ?? ''}
                                            onChange={(e) => setNewQuestion({
                                                ...newQuestion,
                                                options: { ...newQuestion.options, [opt]: e.target.value }
                                            })}
                                            placeholder={t('editor.optionPlaceholder', { opt })}
                                            disabled={newQuestion.type === 'true_false'}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {newQuestion.type !== 'short_answer' && newQuestion.type !== 'html_field' ? (
                        <div className="form-group">
                            <label>{t('editor.correctAnswers')}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {['A', 'B', 'C', 'D'].map((opt) => {
                                    const checked = (newQuestion.correctAnswers || []).includes(opt);
                                    const isMultiple = newQuestion.type === 'multiple_choice_multiple';
                                    return (
                                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px' }}>
                                            <input
                                                type={isMultiple ? 'checkbox' : 'radio'}
                                                checked={checked}
                                                onChange={(e) => {
                                                    if (isMultiple) {
                                                        const prev = newQuestion.correctAnswers || [];
                                                        const next = e.target.checked ? [...prev, opt] : prev.filter(x => x !== opt);
                                                        setNewQuestion({ ...newQuestion, correctAnswers: next });
                                                    } else {
                                                        setNewQuestion({ ...newQuestion, correctAnswers: [opt], correctAnswer: opt });
                                                    }
                                                }}
                                                name="correct-selection"
                                            />
                                            <span style={{ fontWeight: '600' }}>{opt}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {newQuestion.type === 'multiple_choice_multiple' && (
                                <small style={{ color: 'var(--text-secondary)' }}>{t('editor.multipleCorrectHint')}</small>
                            )}
                        </div>
                    ) : newQuestion.type === 'short_answer' ? (
                        <div className="form-group">
                            <label>{t('editor.acceptedAnswers')}</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={(newQuestion.acceptedAnswers || []).join(', ')}
                                    onChange={(e) => {
                                        const parts = e.target.value.split(',').map(s => s.trim());
                                        setNewQuestion({ ...newQuestion, acceptedAnswers: parts });
                                    }}
                                    placeholder={t('editor.acceptedAnswers')}
                                />
                            </div>
                            <small style={{ color: 'var(--text-secondary)' }}>{t('editor.addAnswer')}</small>
                        </div>
                    ) : null}

                        <div className="modal-actions">
                            <button 
                                onClick={() => setShowAddModal(false)} 
                                className="control-button secondary"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={handleSaveQuestion} 
                                className="control-button primary"
                            >
                                <Check size={18} />
                                <span>{editingIndex >= 0 ? t('editor.updateQuestion') : t('editor.addQuestion')}</span>
                            </button>
                        </div>
                </div>
                </div>
            )}
        </div>
    );
};

export default DumpEditor;
