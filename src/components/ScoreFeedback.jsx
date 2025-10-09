/**
 * Score & Feedback Component
 * Displays Mineral Recovery and Dilution percentages
 */

import React from 'react';
import './ScoreFeedback.css';

const ScoreFeedback = ({ 
  mineralRecovery = 100,
  dilution = 0,
  className = ''
}) => {
  const getMineralRecoveryClass = (recovery) => {
    if (recovery >= 90) return 'excellent';
    if (recovery >= 70) return 'good';
    if (recovery >= 50) return 'average';
    return 'poor';
  };

  const getDilutionClass = (dilution) => {
    if (dilution <= 5) return 'excellent';
    if (dilution <= 15) return 'good';
    if (dilution <= 25) return 'average';
    return 'poor';
  };

  return (
    <div className={`score-feedback ${className}`}>
      <h3 className="score-title">Score & Feedback</h3>
      
      <div className="metrics-container">
        <div className="metric-card">
          <div className="metric-label">Mineral Recovery</div>
          <div className={`metric-value ${getMineralRecoveryClass(mineralRecovery)}`}>
            {mineralRecovery}%
          </div>
          <div className="metric-bar">
            <div 
              className={`metric-fill recovery-fill ${getMineralRecoveryClass(mineralRecovery)}`}
              style={{ width: `${mineralRecovery}%` }}
            ></div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Dilution</div>
          <div className={`metric-value ${getDilutionClass(dilution)}`}>
            {dilution}%
          </div>
          <div className="metric-bar">
            <div 
              className={`metric-fill dilution-fill ${getDilutionClass(dilution)}`}
              style={{ width: `${dilution}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Additional feedback messages */}
      <div className="feedback-messages">
        {mineralRecovery >= 95 && dilution <= 5 && (
          <div className="feedback-message excellent">
            🏆 Perfect Blast! Excellent mineral recovery with minimal dilution.
          </div>
        )}
        {mineralRecovery >= 85 && dilution <= 10 && mineralRecovery < 95 && (
          <div className="feedback-message good">
            ✅ Great Job! High recovery with low dilution.
          </div>
        )}
        {mineralRecovery < 50 || dilution > 30 && (
          <div className="feedback-message poor">
            ⚠️ Room for improvement. Consider adjusting blast parameters.
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreFeedback;