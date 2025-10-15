import React, { useState, useEffect } from 'react';
import './BlastSummaryPanel.css';

const BlastSummaryPanel = ({ 
  blastResults, 
  isVisible, 
  onClose,
  playerScore,
  previousScore,
  grid
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      // Handle escape key press
      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          handleClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      setIsAnimating(false);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300); // Allow fade-out animation
  };

  if (!isVisible && !isAnimating) return null;

  const materialsDestroyed = blastResults?.destroyedCells?.length || 0;
  const cellsAffected = blastResults?.affectedCells?.length || 0;
  const blastsUsed = blastResults?.blasts?.length || 0;
  const scoreGained = Math.max(0, playerScore - (previousScore || 0));
  const blastRadius = blastResults?.blastRadius || blastResults?.blasts?.[0]?.radius || 3;

  // Calculate remaining materials
  const remainingMaterials = grid ? grid.getAllBlocks().filter(block => !block.isDestroyed).length : 0;

  // Count materials by type
  const materialCounts = {};
  if (blastResults?.destroyedCells) {
    blastResults.destroyedCells.forEach(cell => {
      const material = cell.material || 'Unknown';
      materialCounts[material] = (materialCounts[material] || 0) + 1;
    });
  }

  return (
    <div className={`blast-summary-overlay ${isAnimating ? 'visible' : 'hidden'}`}>
      <div className="blast-summary-panel">
        <div className="summary-header">
          <h3>🧨 Blast Results</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="summary-content">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-value">{materialsDestroyed}</span>
              <span className="stat-label">Materials Destroyed</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-value">{remainingMaterials}</span>
              <span className="stat-label">Materials Remaining</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-value">+{scoreGained}</span>
              <span className="stat-label">Score Gained</span>
            </div>
            
            <div className="stat-item">
              <span className="stat-value">{blastRadius}</span>
              <span className="stat-label">Blast Radius</span>
            </div>
          </div>

          {Object.keys(materialCounts).length > 0 ? (
            <div className="materials-breakdown">
              <h4>Materials Destroyed:</h4>
              <div className="material-list">
                {Object.entries(materialCounts).map(([material, count]) => (
                  <div key={material} className="material-item">
                    <span className="material-name">{material}</span>
                    <span className="material-count">×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : materialsDestroyed === 0 && (
            <div className="materials-breakdown">
              <h4 style={{ color: '#ffa500' }}>⚠️ No Materials Destroyed</h4>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', margin: '5px 0 0 0' }}>
                The blast had no effect on any materials. Try adjusting your blast placement.
              </p>
            </div>
          )}

          <div className="summary-footer">
            <p className="current-score">Current Score: <strong>{playerScore}</strong></p>
            <p className="auto-close">Panel will auto-close in 5 seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlastSummaryPanel;