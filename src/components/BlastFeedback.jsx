/**
 * BlastFeedback Component
 * 
 * Provides comprehensive feedback after a blast, showing:
 * - Visual highlights of recovered ores (green) and waste/dilution (red)
 * - Performance rating and detailed statistics
 * - Efficiency metrics with progress bars
 * - Action buttons (Reset, Continue)
 * - Round number and session statistics
 */

import React, { useState, useEffect } from 'react';
import './BlastFeedback.css';
import blastHistoryStore from '../utils/BlastHistoryStore';
import { isOre, normalizeMaterialName, getOreValue } from '../utils/OreClassification';

const BlastFeedback = ({ 
  blastResults,
  isVisible, 
  onClose,
  onReset,
  onContinue,
  playerScore,
  previousScore,
  grid
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sessionStats, setSessionStats] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      // Get current round and session stats
      setCurrentRound(blastHistoryStore.getCurrentRound());
      setSessionStats(blastHistoryStore.getSessionStats());
    } else {
      setIsAnimating(false);
      setShowDetails(false);
    }
  }, [isVisible]);

  if (!isVisible && !isAnimating) return null;

  // Calculate metrics from blast results
  const calculateMetrics = () => {
    if (!blastResults) {
      return {
        oresRecovered: 0,
        wasteRecovered: 0,
        totalDestroyed: 0,
        oreValue: 0,
        efficiency: 0,
        recovery: 0,
        dilution: 0
      };
    }

    const scoringSnapshot = blastResults.scoreMetrics;
    const scoringTotals = scoringSnapshot?.breakdown?.totals;

    if (scoringSnapshot && scoringTotals) {
      const totalDestroyed =
        (scoringTotals.totalOresRecovered || 0) +
        (scoringTotals.totalOresLost || 0) +
        (scoringTotals.totalWasteInZone || 0);

      return {
        oresRecovered: scoringTotals.totalOresRecovered || 0,
        wasteRecovered: scoringTotals.totalWasteInZone || 0,
        totalDestroyed,
        oreValue: Math.max(0, scoringTotals.totalValueRecovered || 0),
        efficiency: Math.round(Math.max(0, scoringSnapshot.recoveryRate - scoringSnapshot.dilutionRate)),
        recovery: Math.round(scoringSnapshot.recoveryRate || 0),
        dilution: Math.round(scoringSnapshot.dilutionRate || 0)
      };
    }

    if (!blastResults.destroyedCells) {
      return {
        oresRecovered: 0,
        wasteRecovered: 0,
        totalDestroyed: 0,
        oreValue: 0,
        efficiency: 0,
        recovery: 0,
        dilution: 0
      };
    }

    const destroyedCells = blastResults.destroyedCells || [];
    const classifiedCells = destroyedCells.map(cell => {
      const normalized = normalizeMaterialName(cell.material || '');
      const oreMaterial = isOre(normalized);
      return { cell, normalized, oreMaterial };
    });

    const ores = classifiedCells.filter(({ oreMaterial, cell }) => (
      oreMaterial && (typeof cell?.isInCollectionZone === 'boolean' ? cell.isInCollectionZone : true)
    )).map(entry => entry.cell);
    const waste = classifiedCells.filter(({ oreMaterial, cell }) => (
      !oreMaterial && (typeof cell?.isInCollectionZone === 'boolean' ? cell.isInCollectionZone : true)
    )).map(entry => entry.cell);

    const totalDestroyed = destroyedCells.length;
    const oresRecovered = ores.length;
    const wasteRecovered = waste.length;

    // Calculate value based on material types
    let totalValue = 0;
    classifiedCells.forEach(({ normalized, oreMaterial, cell }) => {
      const counted = typeof cell?.isInCollectionZone === 'boolean' ? cell.isInCollectionZone : true;
      if (oreMaterial && normalized && counted) {
        totalValue += getOreValue(normalized);
      }
    });

    // Calculate percentages
    const recovery = totalDestroyed > 0 ? (oresRecovered / totalDestroyed) * 100 : 0;
    const dilution = totalDestroyed > 0 ? (wasteRecovered / totalDestroyed) * 100 : 0;
    const efficiency = totalDestroyed > 0 ? Math.max(0, (recovery - dilution)) : 0;

    return {
      oresRecovered,
      wasteRecovered,
      totalDestroyed,
      oreValue: Math.max(0, totalValue),
      efficiency: Math.round(efficiency),
      recovery: Math.round(recovery),
      dilution: Math.round(dilution)
    };
  };

  const metrics = calculateMetrics();
  const scoreGained = Math.max(0, (playerScore || 0) - (previousScore || 0));

  // Performance rating based on efficiency
  const getPerformanceRating = () => {
    const { efficiency, recovery, dilution } = metrics;
    
    if (efficiency >= 80 && recovery >= 90 && dilution <= 10) {
      return { rating: 'Excellent', color: '#00ff88', icon: '🏆' };
    } else if (efficiency >= 60 && recovery >= 70 && dilution <= 20) {
      return { rating: 'Great', color: '#4CAF50', icon: '⭐' };
    } else if (efficiency >= 40 && recovery >= 50 && dilution <= 35) {
      return { rating: 'Good', color: '#FFC107', icon: '👍' };
    } else {
      return { rating: 'Poor', color: '#ff6b6b', icon: '⚠️' };
    }
  };

  const performance = getPerformanceRating();

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleReset = () => {
    handleClose();
    setTimeout(() => {
      onReset();
    }, 300);
  };

  const handleContinue = () => {
    handleClose();
    setTimeout(() => {
      onContinue();
    }, 300);
  };

  return (
    <div className={`blast-feedback-overlay ${isAnimating ? 'visible' : 'hidden'}`}>
      <div className="blast-feedback-modal">
        {/* Header */}
        <div className="feedback-header">
          <div className="feedback-title-section">
            <div className="title-with-round">
              <h2 className="feedback-title">
                <span className="feedback-icon">💥</span>
                Blast Complete
              </h2>
              <span className="round-badge">Round {currentRound}</span>
            </div>
            <button 
              className="feedback-close-btn" 
              onClick={handleClose}
              aria-label="Close feedback"
            >
              ×
            </button>
          </div>
          
          {/* Performance Rating */}
          <div className="performance-rating" style={{ borderColor: performance.color }}>
            <span className="performance-icon">{performance.icon}</span>
            <span className="performance-label" style={{ color: performance.color }}>
              {performance.rating}
            </span>
          </div>
        </div>

        {/* Main Stats */}
        <div className="feedback-stats">
          <div className="stat-card ore-stat">
            <div className="stat-icon recovered">✓</div>
            <div className="stat-content">
              <div className="stat-value">{metrics.oresRecovered}</div>
              <div className="stat-label">Ores Recovered</div>
            </div>
          </div>

          <div className="stat-card waste-stat">
            <div className="stat-icon waste">⚠</div>
            <div className="stat-content">
              <div className="stat-value">{metrics.wasteRecovered}</div>
              <div className="stat-label">Waste Collected</div>
            </div>
          </div>

          <div className="stat-card value-stat">
            <div className="stat-icon value">💎</div>
            <div className="stat-content">
              <div className="stat-value">{metrics.oreValue}</div>
              <div className="stat-label">Total Value</div>
            </div>
          </div>
        </div>

        {/* Efficiency Metrics */}
        <div className="efficiency-section">
          <h3 className="section-title">Efficiency Metrics</h3>
          
          <div className="metric-row">
            <div className="metric-label-row">
              <span className="metric-name">Recovery Rate</span>
              <span className="metric-percentage">{metrics.recovery}%</span>
            </div>
            <div className="metric-bar-container">
              <div 
                className="metric-bar recovery-bar" 
                style={{ width: `${metrics.recovery}%` }}
              />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-label-row">
              <span className="metric-name">Dilution</span>
              <span className="metric-percentage">{metrics.dilution}%</span>
            </div>
            <div className="metric-bar-container">
              <div 
                className="metric-bar dilution-bar" 
                style={{ width: `${metrics.dilution}%` }}
              />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-label-row">
              <span className="metric-name">Overall Efficiency</span>
              <span className="metric-percentage" style={{ color: performance.color }}>
                {metrics.efficiency}%
              </span>
            </div>
            <div className="metric-bar-container">
              <div 
                className="metric-bar efficiency-bar" 
                style={{ 
                  width: `${metrics.efficiency}%`,
                  background: `linear-gradient(90deg, ${performance.color}, ${performance.color}aa)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Score Gained */}
        <div className="score-section">
          <div className="score-gained">
            <span className="score-label">Score Gained:</span>
            <span className="score-value">+{scoreGained}</span>
          </div>
          <div className="current-score">
            Total Score: <strong>{playerScore}</strong>
          </div>
        </div>

        {/* Detailed Breakdown (Expandable) */}
        <div className="details-section">
          <button 
            className="details-toggle" 
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼' : '▶'} Detailed Breakdown & Session Stats
          </button>
          
          {showDetails && (
            <div className="details-content">
              <h4 className="details-subtitle">This Round</h4>
              <div className="detail-row">
                <span className="detail-label">Total Cells Destroyed:</span>
                <span className="detail-value">{metrics.totalDestroyed}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Blasts Used:</span>
                <span className="detail-value">{blastResults?.blasts?.length || 0}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Blast Radius:</span>
                <span className="detail-value">{blastResults?.blastRadius || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Cells Affected:</span>
                <span className="detail-value">{blastResults?.affectedCells?.length || 0}</span>
              </div>

              {sessionStats && sessionStats.totalRounds > 1 && (
                <>
                  <h4 className="details-subtitle session-stats-title">Session Statistics</h4>
                  <div className="detail-row">
                    <span className="detail-label">Total Rounds:</span>
                    <span className="detail-value">{sessionStats.totalRounds}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Average Recovery:</span>
                    <span className="detail-value">{sessionStats.averageRecovery}%</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Average Efficiency:</span>
                    <span className="detail-value">{sessionStats.averageEfficiency}%</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Total Ores Recovered:</span>
                    <span className="detail-value">{sessionStats.totalOresRecovered}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Best Round:</span>
                    <span className="detail-value highlight-best">
                      Round {sessionStats.bestRound?.round} ({sessionStats.bestRound?.efficiency}% efficiency)
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="feedback-actions">
          <button 
            className="feedback-btn reset-btn" 
            onClick={handleReset}
          >
            🔄 Reset Simulation
          </button>
          <button 
            className="feedback-btn continue-btn" 
            onClick={handleContinue}
          >
            ➡️ Continue
          </button>
        </div>

        {/* Legend */}
        <div className="feedback-legend">
          <div className="legend-item">
            <div className="legend-color recovered"></div>
            <span className="legend-text">Recovered Ores (Green)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color waste"></div>
            <span className="legend-text">Waste/Dilution (Red)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlastFeedback;
