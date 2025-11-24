import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';

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

    useEffect(() => {
        const handleResize = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        if (!answers[index]) return 'unanswered';
        if (reviewMode || showAnswerImmediately) {
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
        if (reviewMode || (isAnswered && showAnswerImmediately)) {
            if (isCorrectKey) return 'correct';
            if (isSelectedKey && !isCorrectKey) return 'wrong';
            return 'disabled';
        }

        // Exam Mode (Hidden Feedback)
        if (isSelectedKey) return 'selected';
        return '';
    };

    return (
        <div className="quiz-wrapper" style={{ 
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
                        top: isMobile ? 'auto' : '2rem',
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
                            {(reviewMode || showAnswerImmediately) && (
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
                <div className="quiz-header">
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
                    <span className="question-counter">
                        {t('quiz.questionCounter', { current: currentIndex + 1, total: questions.length })}
                    </span>
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
                    {(showAnswerImmediately || reviewMode) && (
                        <span className="score-counter">
                            {t('quiz.score')}: {reviewMode ? calculateScore() : Object.values(answers).filter(a => a.isCorrect).length}
                        </span>
                    )}
                </div>

                <div className="question-card">
                <h3 className="question-text">{currentQuestion.question}</h3>

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
                                <span className="option-text">{value}</span>
                                {(reviewMode || (isAnswered && showAnswerImmediately)) && (Array.isArray(currentQuestion.correctAnswers) ? currentQuestion.correctAnswers.includes(key) : key === currentQuestion.correctAnswer) && (
                                    <CheckCircle className="status-icon correct" size={20} />
                                )}
                                {(reviewMode || (isAnswered && showAnswerImmediately)) && selectedOptions.includes(key) && !(Array.isArray(currentQuestion.correctAnswers) ? currentQuestion.correctAnswers.includes(key) : key === currentQuestion.correctAnswer) && (
                                    <XCircle className="status-icon wrong" size={20} />
                                )}
                            </button>
                        )
                    ))}
                </div>
            </div>

            <div className="quiz-controls">
                {currentIndex > 0 ? (
                    <button
                        className="control-button secondary"
                        onClick={handlePrevious}
                    >
                        <ArrowLeft size={20} /> {t('quiz.previous')}
                    </button>
                ) : (
                    <div className="placeholder-button"></div>
                )}

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
