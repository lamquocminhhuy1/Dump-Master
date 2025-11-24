import React from 'react';
import { RefreshCw, Upload } from 'lucide-react';

const Results = ({ score, total, onRestart, onNewFile }) => {
    const percentage = Math.round((score / total) * 100);

    let message = '';
    let colorClass = '';

    if (percentage >= 90) {
        message = 'Excellent!';
        colorClass = 'text-green-500';
    } else if (percentage >= 70) {
        message = 'Good Job!';
        colorClass = 'text-blue-500';
    } else if (percentage >= 50) {
        message = 'Not Bad';
        colorClass = 'text-yellow-500';
    } else {
        message = 'Keep Practicing';
        colorClass = 'text-red-500';
    }

    return (
        <div className="results-container">
            <h2>Quiz Completed!</h2>

            <div className="score-circle">
                <div className={`score-percentage ${colorClass}`}>
                    {percentage}%
                </div>
                <div className="score-text">
                    {score} / {total} Correct
                </div>
            </div>

            <h3 className={`result-message ${colorClass}`}>{message}</h3>

            <div className="results-actions">
                <button className="action-button secondary" onClick={onRestart}>
                    <RefreshCw size={20} /> Restart Quiz
                </button>
                <button className="action-button primary" onClick={onNewFile}>
                    <Upload size={20} /> Upload New File
                </button>
            </div>
        </div>
    );
};

export default Results;
