import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../context/I18nContext';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { API_HOST } from '../utils/api';
import HtmlEditor from './HtmlEditor';

const QuizInterface = ({
    questions,
    timeLimit,
    onFinish,
    showAnswerImmediately = true,
    initialReviewMode = false,
    initialAnswers = {}
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState(initialAnswers || {});
    const [timeLeft, setTimeLeft] = useState(timeLimit ? timeLimit * 60 : null);
    const [reviewMode, setReviewMode] = useState(initialReviewMode);
    const [showResultModal, setShowResultModal] = useState(false);
    const [showQuestionNav, setShowQuestionNav] = useState(true);
    const { t } = useI18n();
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
    const [quizTheme, setQuizTheme] = useState('default');
    const [immediate, setImmediate] = useState(showAnswerImmediately);
    const isScrollMode = quizTheme === 'bttn';
    const headerRef = useRef(null);
    const [navOffset, setNavOffset] = useState(0);

    useEffect(() => {
        const handleResize = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!headerRef.current) return;
        const el = headerRef.current;
        const mb = parseFloat(getComputedStyle(el).marginBottom || '0');
        setNavOffset(el.offsetHeight + mb);
        const onResize = () => {
            const mb2 = parseFloat(getComputedStyle(el).marginBottom || '0');
            setNavOffset(el.offsetHeight + mb2);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isMobile, quizTheme, immediate, reviewMode]);

    useEffect(() => {
        // If in review mode or revisiting a question, load the answer
        if (reviewMode || initialReviewMode) {
            // In review mode, always show answers if they exist
            if (answers[currentIndex]) {
                setSelectedOptions(answers[currentIndex].selected || []);
                setIsAnswered(true);
            } else {
                setSelectedOptions([]);
                setIsAnswered(false);
            }
        } else if (answers[currentIndex]) {
            // Normal mode - load previously answered question
            setSelectedOptions(answers[currentIndex].selected || []);
            setIsAnswered(true);
        } else {
            setSelectedOptions([]);
            setIsAnswered(false);
        }
    }, [currentIndex, answers, reviewMode, initialReviewMode]);

    useEffect(() => {
        if (timeLeft === null || reviewMode || showResultModal) return;
        if (timeLeft <= 0) {
            finishQuiz();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, reviewMode, showResultModal]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise();
        }
    }, [currentIndex, reviewMode, immediate, questions]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Safety check for questions array
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return (
            <div className="dashboard-container">
                <div className="dump-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h3>{t('common.errorLabel')} {t('errors.quiz.noQuestionsAvailable')}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        {t('errors.dumpHasNoQuestions')}
                    </p>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    const normalizeText = (s) => (s || '').trim().toLowerCase();
    const isShortAnswerCorrect = (text, question) => {
        const accepted = (question.acceptedAnswers || []).map(normalizeText);
        const input = normalizeText(text);
        return accepted.includes(input);
    };

    // Safety check for current question
    if (!currentQuestion) {
        return (
            <div className="dashboard-container">
                <div className="dump-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h3>{t('common.errorLabel')} {t('errors.quiz.questionNotFound')}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        {t('errors.quiz.questionNotFound')}
                    </p>
                </div>
            </div>
        );
    }

    const handleOptionSelect = (optionKey) => {
        if (reviewMode) return; // Lock if reviewing
        const next = selectedOptions.includes(optionKey)
            ? selectedOptions.filter(k => k !== optionKey)
            : [...selectedOptions, optionKey];
        setSelectedOptions(next);
        setIsAnswered(next.length > 0);

        const correctList = Array.isArray(currentQuestion.correctAnswers)
            ? currentQuestion.correctAnswers
            : (currentQuestion.correctAnswer ? [currentQuestion.correctAnswer] : []);
        const selSet = new Set(next);
        const corSet = new Set(correctList);
        const sameSize = selSet.size === corSet.size;
        const allMatch = sameSize && [...corSet].every(k => selSet.has(k));

        setAnswers(prev => ({
            ...prev,
            [currentIndex]: {
                selected: next,
                correct: correctList,
                isCorrect: allMatch
            }
        }));
    };

    const updateAnswerFor = (index, nextSelected, question) => {
        const correctList = Array.isArray(question.correctAnswers)
            ? question.correctAnswers
            : (question.correctAnswer ? [question.correctAnswer] : []);
        const selSet = new Set(nextSelected);
        const corSet = new Set(correctList);
        const sameSize = selSet.size === corSet.size;
        const allMatch = sameSize && [...corSet].every(k => selSet.has(k));

        setAnswers(prev => ({
            ...prev,
            [index]: {
                selected: nextSelected,
                correct: correctList,
                isCorrect: allMatch
            }
        }));
    };

    const handleToggleOptionFor = (index, optionKey) => {
        if (reviewMode) return;
        const question = questions[index];
        const prevSel = answers[index]?.selected || [];
        const next = prevSel.includes(optionKey)
            ? prevSel.filter(k => k !== optionKey)
            : [...prevSel, optionKey];
        updateAnswerFor(index, next, question);
    };

    const handleSetSingleFor = (index, optionKey) => {
        if (reviewMode) return;
        const question = questions[index];
        updateAnswerFor(index, [optionKey], question);
    };

    const calculateScore = () => {
        let calculatedScore = 0;
        Object.values(answers).forEach(ans => {
            if (ans.isCorrect) calculatedScore++;
        });
        return calculatedScore;
    };

    const finishQuiz = () => {
        const finalScore = calculateScore();
        setScore(finalScore);
        setShowResultModal(true);
    };

    const handleExit = () => {
        // In review mode, just call onFinish without parameters (it's just a navigation callback)
        if (reviewMode || initialReviewMode) {
            onFinish();
        } else {
            // In normal quiz mode, pass answers to onFinish so they can be saved
            onFinish(score, questions.length, answers);
        }
    };

    const handleReview = () => {
        setShowResultModal(false);
        setReviewMode(true);
        setCurrentIndex(0); // Reset to first question for review
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            if (reviewMode) {
                handleExit(); // Exit if in review mode and last question
            } else {
                finishQuiz();
            }
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleJumpToQuestion = (index) => {
        if (index >= 0 && index < questions.length) {
            setCurrentIndex(index);
        }
    };

    const getQuestionStatus = (index) => {
        const q = questions[index];
        if (!answers[index]) return 'unanswered';
        if (q && q.type === 'html_field') return 'answered';
        if (reviewMode || immediate) {
            return answers[index].isCorrect ? 'correct' : 'wrong';
        }
        return 'answered';
    };

    const getOptionClass = (key) => {
        // Review Mode or Practice Mode (Immediate Feedback)
        const correctList = Array.isArray(currentQuestion.correctAnswers)
            ? currentQuestion.correctAnswers
            : (currentQuestion.correctAnswer ? [currentQuestion.correctAnswer] : []);
        const isCorrectKey = correctList.includes(key);
        const isSelectedKey = selectedOptions.includes(key);
        if (reviewMode || (isAnswered && immediate)) {
            if (isCorrectKey) return 'correct';
            if (isSelectedKey && !isCorrectKey) return 'wrong';
            return 'disabled';
        }

        // Exam Mode (Hidden Feedback)
        if (isSelectedKey) return 'selected';
        return '';
    };

  const getOptionClassFor = (index, key) => {
        const question = questions[index];
        const correctList = Array.isArray(question.correctAnswers)
            ? question.correctAnswers
            : (question.correctAnswer ? [question.correctAnswer] : []);
        const isCorrectKey = correctList.includes(key);
        const isSelectedKey = (answers[index]?.selected || []).includes(key);
        if (reviewMode || immediate) {
            if (isCorrectKey) return 'correct';
            if (isSelectedKey && !isCorrectKey) return 'wrong';
            return 'disabled';
        }
        if (isSelectedKey) return 'selected';
        return '';
  };


    return (
        <div className={`quiz-wrapper ${quizTheme === 'bttn' ? 'bttn-theme' : ''}`} style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            maxWidth: '1400px', 
            margin: '2rem auto', 
            padding: '0 1rem',
            position: 'relative'
        }}>
            {/* Question Navigation Panel */}
            <div 
                className={`question-nav-panel ${showQuestionNav ? 'open' : 'closed'}`}
                style={{
                    position: showQuestionNav ? 'relative' : 'fixed',
                    right: showQuestionNav ? 'auto' : '0',
                    top: showQuestionNav ? 'auto' : '50%',
                    transform: showQuestionNav ? 'none' : 'translateY(-50%)',
                    width: showQuestionNav ? (isMobile ? '100%' : '280px') : 'auto',
                    minWidth: showQuestionNav ? (isMobile ? '100%' : '280px') : 'auto',
                    flexShrink: 0,
                    transition: 'all 0.3s ease',
                    zIndex: isMobile ? 'auto' : 100,
                    marginBottom: isMobile ? '1rem' : 0
                }}
            >
                {showQuestionNav ? (
                    <div className="question-nav-content" style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius)',
                        padding: '1.5rem',
                        boxShadow: 'var(--shadow-md)',
                        position: isMobile ? 'relative' : 'sticky',
                        top: isMobile ? 'auto' : 0,
                        marginTop: isMobile ? 0 : navOffset,
                        maxHeight: isMobile ? 'none' : 'calc(100vh - 4rem)',
                        overflowY: isMobile ? 'visible' : 'auto'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            paddingBottom: '1rem',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                margin: 0
                            }}>
                                {t('quiz.questions')}
                            </h3>
                            <button
                                onClick={() => setShowQuestionNav(false)}
                                className="icon-btn"
                                style={{ padding: '4px' }}
                                aria-label="Hide question navigator"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('quiz.showImmediate')}</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="checkbox" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} />
                            </label>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
                            gap: '0.5rem'
                        }}>
                            {questions.map((_, index) => {
                                const status = getQuestionStatus(index);
                                const isActive = index === currentIndex;
                                
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleJumpToQuestion(index)}
                                        className={`question-nav-button ${status} ${isActive ? 'active' : ''}`}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '8px',
                                            border: isActive 
                                                ? '2px solid var(--primary-color)' 
                                                : status === 'unanswered'
                                                ? '1px solid var(--border-color)'
                                                : status === 'correct'
                                                ? '1px solid var(--sn-green)'
                                                : '1px solid #ef4444',
                                            background: isActive
                                                ? 'rgba(65, 182, 230, 0.1)'
                                                : status === 'unanswered'
                                                ? 'var(--bg-body)'
                                                : status === 'correct'
                                                ? 'rgba(129, 181, 161, 0.1)'
                                                : 'rgba(239, 68, 68, 0.1)',
                                            color: isActive
                                                ? 'var(--primary-color)'
                                                : status === 'unanswered'
                                                ? 'var(--text-secondary)'
                                                : status === 'correct'
                                                ? 'var(--sn-green)'
                                                : '#ef4444',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.9rem',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.target.style.transform = 'scale(1.1)';
                                                e.target.style.boxShadow = 'var(--shadow-sm)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.target.style.transform = 'scale(1)';
                                                e.target.style.boxShadow = 'none';
                                            }
                                        }}
                                        title={`Question ${index + 1}${status === 'unanswered' ? ' (Not answered)' : status === 'correct' ? ' (Correct)' : ' (Wrong)'}`}
                                    >
                                        {index + 1}
                                        {status !== 'unanswered' && (
                                            <span style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                fontSize: '0.6rem'
                                            }}>
                                                {status === 'correct' ? '✓' : '✗'}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border-color)',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>{t('quiz.total')}:</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{questions.length}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>{t('quiz.answered')}:</span>
                                <strong style={{ color: 'var(--text-primary)' }}>{Object.keys(answers).length}</strong>
                            </div>
                            {(reviewMode || immediate) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{t('quiz.correct')}:</span>
                                    <strong style={{ color: 'var(--sn-green)' }}>
                                        {Object.values(answers).filter(a => a.isCorrect).length}
                                    </strong>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    !isMobile && (
                        <button
                            onClick={() => setShowQuestionNav(true)}
                            className="icon-btn"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px 0 0 8px',
                                padding: '1rem 0.5rem',
                                boxShadow: 'var(--shadow-md)',
                                position: 'relative'
                            }}
                            aria-label="Show question navigator"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )
                )}
            </div>

            {/* Main Quiz Content */}
            <div className="quiz-container" style={{ flex: 1, minWidth: 0 }}>
                <div className="quiz-header" ref={headerRef}>
                    {isMobile && !showQuestionNav && (
                        <button
                            onClick={() => setShowQuestionNav(true)}
                            className="icon-btn"
                            style={{ marginRight: '0.5rem' }}
                            aria-label="Show question navigator"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                    {!isScrollMode && (
                        <span className="question-counter">
                            {t('quiz.questionCounter', { current: currentIndex + 1, total: questions.length })}
                        </span>
                    )}
                    <div className="interface-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>{t('quiz.interface.switch')}</span>
                        <select
                            value={quizTheme}
                            onChange={(e) => setQuizTheme(e.target.value)}
                            className="interface-select"
                        >
                            <option value="default">{t('quiz.interface.default')}</option>
                            <option value="bttn">{t('quiz.interface.bttn')}</option>
                        </select>
                    </div>
                    {timeLeft !== null && !reviewMode && (
                        <span className="timer" style={{ color: timeLeft < 60 ? 'var(--error)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                            {t('quiz.timeLeft')}: {formatTime(timeLeft)}
                        </span>
                    )}
                    {reviewMode && (
                        <span className="timer" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                            {t('quiz.reviewMode')}
                        </span>
                    )}
                    {(immediate || reviewMode) && (
                        <span className="score-counter">
                            {t('quiz.score')}: {reviewMode ? calculateScore() : Object.values(answers).filter(a => a.isCorrect).length}
                        </span>
                    )}
                </div>

                {isScrollMode ? (
                    <div className="questions-list">
                        {questions.map((q, idx) => (
                            <div key={idx} id={`q-${idx}`} className="question-card">
                                {q.isHtml ? (
                                    <div className="question-text" dangerouslySetInnerHTML={{ __html: q.question }} />
                                ) : (
                                    <h3 className="question-text">{q.question}</h3>
                                )}
                                {q.type === 'short_answer' ? (
                                    <div className="options-list" style={{ paddingTop: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="short-answer-input"
                                            placeholder={t('editor.acceptedAnswers')}
                                            value={answers[idx]?.text || ''}
                                            onChange={(e) => {
                                                if (reviewMode) return;
                                                const text = e.target.value;
                                                const correct = isShortAnswerCorrect(text, q);
                                                setAnswers(prev => ({
                                                    ...prev,
                                                    [idx]: {
                                                        text,
                                                        isCorrect: correct
                                                    }
                                                }));
                                            }}
                                            disabled={reviewMode}
                                        />
                                        {(reviewMode || immediate) && (answers[idx]?.text || '').length > 0 && (
                                            answers[idx]?.isCorrect ? (
                                                <div className="inline-status" style={{ color: 'var(--sn-green)', marginTop: '0.5rem' }}>
                                                    ✓
                                                </div>
                                            ) : (
                                                <div className="inline-status" style={{ color: '#ef4444', marginTop: '0.5rem' }}>
                                                    ✗
                                                </div>
                                            )
                                        )}
                                    </div>
                                ) : q.type === 'html_field' ? (
                                    <div className="options-list" style={{ paddingTop: '0.5rem' }}>
                                        <HtmlEditor
                                            value={answers[idx]?.html || ''}
                                            onChange={(html) => {
                                                if (reviewMode) return;
                                                const hasContent = (html || '').replace(/<[^>]*>/g, '').trim().length > 0 || /<img\b/i.test(html || '');
                                                setAnswers(prev => ({
                                                    ...prev,
                                                    [idx]: { html, isCorrect: hasContent }
                                                }));
                                            }}
                                            disabled={reviewMode}
                                        />
                                    </div>
                                ) : (
                                    <div className="options-list">
                                        {Object.entries(q.options).map(([key, value]) => (
                                            value && (
                                                <label key={key} className={`option-button bttn-option ${getOptionClassFor(idx, key)}`}>
                                                    <input
                                                        type={(Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1) ? 'checkbox' : 'radio'}
                                                        className="bttn-radio"
                                                        checked={(answers[idx]?.selected || []).includes(key)}
                                                        onChange={() => ((Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1) ? handleToggleOptionFor(idx, key) : handleSetSingleFor(idx, key))}
                                                        disabled={reviewMode}
                                                    />
                                                    <span className="option-key-wrapper"><span className="option-key">{key}</span></span>
                                                    {q.isHtml ? (
                                                        <span className="option-text" dangerouslySetInnerHTML={{ __html: value }} />
                                                    ) : (
                                                        <span className="option-text">{value}</span>
                                                    )}
                                                    {(reviewMode || immediate) && (Array.isArray(q.correctAnswers) ? q.correctAnswers.includes(key) : key === q.correctAnswer) && (
                                                        <CheckCircle className="status-icon correct" size={20} />
                                                    )}
                                                    {(reviewMode || immediate) && (answers[idx]?.selected || []).includes(key) && !(Array.isArray(q.correctAnswers) ? q.correctAnswers.includes(key) : key === q.correctAnswer) && (
                                                        <XCircle className="status-icon wrong" size={20} />
                                                    )}
                                                </label>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="question-card">
                        {currentQuestion.isHtml ? (
                            <div className="question-text" dangerouslySetInnerHTML={{ __html: currentQuestion.question }} />
                        ) : (
                            <h3 className="question-text">{currentQuestion.question}</h3>
                        )}
                        {currentQuestion.type === 'short_answer' ? (
                            <div className="options-list" style={{ paddingTop: '0.5rem' }}>
                                <input
                                    type="text"
                                    className="short-answer-input"
                                    placeholder={t('editor.acceptedAnswers')}
                                    value={answers[currentIndex]?.text || ''}
                                    onChange={(e) => {
                                        if (reviewMode) return;
                                        const text = e.target.value;
                                        const correct = isShortAnswerCorrect(text, currentQuestion);
                                        setSelectedOptions(text ? ['TEXT'] : []);
                                        setIsAnswered(!!text);
                                        setAnswers(prev => ({
                                            ...prev,
                                            [currentIndex]: {
                                                text,
                                                isCorrect: correct
                                            }
                                        }));
                                    }}
                                    disabled={reviewMode}
                                />
                                {(reviewMode || (isAnswered && immediate)) && (answers[currentIndex]?.text || '').length > 0 && (
                                    answers[currentIndex]?.isCorrect ? (
                                        <div className="inline-status" style={{ color: 'var(--sn-green)', marginTop: '0.5rem' }}>
                                            ✓
                                        </div>
                                    ) : (
                                        <div className="inline-status" style={{ color: '#ef4444', marginTop: '0.5rem' }}>
                                            ✗
                                        </div>
                                    )
                                )}
                            </div>
                        ) : currentQuestion.type === 'html_field' ? (
                            <div className="options-list" style={{ paddingTop: '0.5rem' }}>
                                <HtmlEditor
                                    value={answers[currentIndex]?.html || ''}
                                    onChange={(html) => {
                                        if (reviewMode) return;
                                        const hasContent = (html || '').replace(/<[^>]*>/g, '').trim().length > 0 || /<img\b/i.test(html || '');
                                        setSelectedOptions(hasContent ? ['HTML'] : []);
                                        setIsAnswered(hasContent);
                                        setAnswers(prev => ({
                                            ...prev,
                                            [currentIndex]: { html, isCorrect: hasContent }
                                        }));
                                    }}
                                    disabled={reviewMode}
                                />
                            </div>
                        ) : (
                            <div className="options-list">
                                {Object.entries(currentQuestion.options).map(([key, value]) => (
                                    value && (
                                        <button
                                            key={key}
                                            className={`option-button ${getOptionClass(key)}`}
                                            onClick={() => handleOptionSelect(key)}
                                            disabled={reviewMode}
                                        >
                                            <div className="option-key-wrapper">
                                                <span className="option-key">{key}</span>
                                            </div>
                                            {currentQuestion.isHtml ? (
                                                <span className="option-text" dangerouslySetInnerHTML={{ __html: value }} />
                                            ) : (
                                                <span className="option-text">{value}</span>
                                            )}
                                            {(reviewMode || (isAnswered && immediate)) && (Array.isArray(currentQuestion.correctAnswers) ? currentQuestion.correctAnswers.includes(key) : key === currentQuestion.correctAnswer) && (
                                                <CheckCircle className="status-icon correct" size={20} />
                                            )}
                                            {(reviewMode || (isAnswered && immediate)) && selectedOptions.includes(key) && !(Array.isArray(currentQuestion.correctAnswers) ? currentQuestion.correctAnswers.includes(key) : key === currentQuestion.correctAnswer) && (
                                                <XCircle className="status-icon wrong" size={20} />
                                            )}
                                        </button>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                )}

            {!isScrollMode && !showResultModal && (
                <div
                    className="fixed-action-bar"
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'var(--bg-card)',
                        borderTop: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-md)',
                        padding: '0.5rem 0.75rem',
                        zIndex: 200
                    }}
                >
                    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <button
                            className="control-button secondary"
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                        >
                            <ArrowLeft size={20} /> {t('quiz.previous')}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                                className="control-button tertiary"
                                onClick={() => { reviewMode ? handleExit() : finishQuiz(); }}
                            >
                                <XCircle size={20} /> {reviewMode ? t('quiz.exit') : 'Dừng luyện tập'}
                            </button>
                            <button
                                className="control-button primary"
                                onClick={handleNext}
                            >
                                {currentIndex === questions.length - 1
                                    ? (reviewMode ? t('quiz.exit') : t('quiz.finish'))
                                    : t('quiz.next')}
                                {currentIndex < questions.length - 1 && <ArrowRight size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {!isScrollMode && !showResultModal && (
                <div style={{ height: '56px' }} />
            )}

            {isScrollMode && !reviewMode && !showResultModal && (
                <div className="action-bar">
                    <div className="action-bar-content">
                        <div className="action-group">
                            <span className="score-counter">
                                {t('quiz.score')}: {Object.values(answers).filter(a => a.isCorrect).length}
                            </span>
                        </div>
                        <div className="action-group">
                            <button className="action-button primary" onClick={finishQuiz}>{t('quiz.finish')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {showResultModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="dump-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{t('quiz.completed')}</h2>
                        <div className="score-percentage" style={{ fontSize: '4rem', color: 'var(--primary-color)', marginBottom: '1rem' }}>
                            {Math.round((score / questions.length) * 100)}%
                        </div>
                        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            {t('quiz.scored', { score, total: questions.length })}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button onClick={handleExit} className="control-button secondary">{t('quiz.exit')}</button>
                            <button onClick={handleReview} className="control-button primary">{t('quiz.reviewAnswers')}</button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default QuizInterface;
