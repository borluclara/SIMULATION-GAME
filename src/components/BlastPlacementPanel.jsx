/**
 * Blast Placement Panel Component
 * Handles blast placement and detonation functionality
 */

import React, { useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import './BlastPlacementPanel.css';

const BlastPlacementPanel = ({ 
  onPlacementModeChange = () => {},
  onTriggerBlasts = () => {},
  placementMode = false 
}) => {
  const {
    blasts,
    maxBlasts,
    canPlaceBlast,
    clearBlasts,
    triggerBlasts
  } = useGameState();

  const [isExploding, setIsExploding] = useState(false);

  const handleTogglePlacementMode = () => {
    const newMode = !placementMode;
    onPlacementModeChange(newMode);
  };

  const handleClearBlasts = () => {
    clearBlasts();
  };

  const handleTriggerBlasts = async () => {
    if (blasts.length === 0) {
      alert('No blasts to detonate! Place some explosives first.');
      return;
    }

    setIsExploding(true);
    
    // Trigger the blast detonation
    const result = triggerBlasts();
    
    // Call the parent handler for visual effects
    onTriggerBlasts(result);

    // Reset explosion state after animation
    setTimeout(() => {
      setIsExploding(false);
    }, 1500);
  };

  return (
    <div className="blast-placement-panel">
      <h3 className="panel-title">Blast Placement</h3>
      
      {/* Status Display */}
      <div className="blast-status">
        <div className="status-item">
          <span className="status-label">Explosives:</span>
          <span className="status-value">{blasts.length}/{maxBlasts}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Mode:</span>
          <span className={`status-value ${placementMode ? 'placement-active' : ''}`}>
            {placementMode ? 'Placement' : 'View'}
          </span>
        </div>
      </div>

      {/* Blast Indicators */}
      {blasts.length > 0 && (
        <div className="blast-indicators">
          <div className="indicators-title">Placed Explosives:</div>
          <div className="blast-list">
            {blasts.map((blast, index) => (
              <div key={blast.id} className="blast-indicator">
                <span className="blast-icon">💣</span>
                <span className="blast-position">({blast.x}, {blast.y})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="blast-controls">
        <button
          className={`control-button placement-toggle ${placementMode ? 'active' : ''}`}
          onClick={handleTogglePlacementMode}
          disabled={isExploding}
        >
          {placementMode ? '🎯 Exit Placement' : '🎯 Place Explosives'}
        </button>

        <button
          className="control-button clear-button"
          onClick={handleClearBlasts}
          disabled={blasts.length === 0 || isExploding}
        >
          🗑️ Clear All
        </button>

        <button
          className={`control-button trigger-button ${isExploding ? 'exploding' : ''}`}
          onClick={handleTriggerBlasts}
          disabled={blasts.length === 0 || isExploding}
        >
          {isExploding ? '💥 EXPLODING!' : '🧨 Trigger Blast'}
        </button>
      </div>

      {/* Instructions */}
      <div className="blast-instructions">
        {placementMode ? (
          <p>🎯 Click on grid cells to place explosives (max {maxBlasts})</p>
        ) : (
          <p>Enable placement mode to add explosives to the grid</p>
        )}
        {blasts.length > 0 && !placementMode && (
          <p className="trigger-hint">💡 Click "Trigger Blast" to detonate all explosives</p>
        )}
      </div>
    </div>
  );
};

export default BlastPlacementPanel;