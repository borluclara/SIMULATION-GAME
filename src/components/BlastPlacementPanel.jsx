/**
 * Blast Placement Panel Component
 * Handles blast placement and detonation functionality
 */

import React, { useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import physicsEngine from '../utils/PhysicsEngine';
import './BlastPlacementPanel.css';

const BlastPlacementPanel = ({ 
  onPlacementModeChange = () => {},
  onTriggerBlasts = () => {},
  placementMode = false,
  canvasRef = null
}) => {
  const {
    blasts,
    maxBlasts,
    canPlaceBlast,
    clearBlasts,
    triggerBlasts
  } = useGameState();

  const [isExploding, setIsExploding] = useState(false);
  const [physicsActive, setPhysicsActive] = useState(false);

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
    setPhysicsActive(true);
    
    try {
      // Trigger the blast detonation
      const result = triggerBlasts();
      
      // Call the parent handler for visual effects
      onTriggerBlasts(result);

      // Start physics simulation if canvas is available
      if (canvasRef?.current && result.blasts.length > 0) {
        await startPhysicsSimulation(result);
      }

      console.log(`Detonated ${result.blasts.length} blasts affecting ${result.affectedCells.length} cells`);
    } catch (error) {
      console.error('Blast simulation error:', error);
    } finally {
      // Reset explosion state after animation
      setTimeout(() => {
        setIsExploding(false);
        setPhysicsActive(false);
      }, 1500);
    }
  };

  const startPhysicsSimulation = async (blastResult) => {
    try {
      const mainCanvas = canvasRef.current;
      if (!mainCanvas) {
        console.error('❌ Main canvas not found');
        return;
      }

      const rect = mainCanvas.getBoundingClientRect();
      
      console.log(`📐 Main canvas: ${mainCanvas.width}x${mainCanvas.height} (actual), ${rect.width}x${rect.height} (display)`);
      
      // Create physics canvas overlay - EXACTLY like reference
      const physicsCanvas = document.createElement('canvas');
      physicsCanvas.width = mainCanvas.width;   // Use actual canvas dimensions
      physicsCanvas.height = mainCanvas.height;
      physicsCanvas.style.position = 'absolute';
      physicsCanvas.style.top = '0';
      physicsCanvas.style.left = '0';
      physicsCanvas.style.width = rect.width + 'px';     // Scale to display size
      physicsCanvas.style.height = rect.height + 'px';
      physicsCanvas.style.pointerEvents = 'none';
      physicsCanvas.style.zIndex = '10';
      
      console.log(`🎨 Physics canvas created: ${physicsCanvas.width}x${physicsCanvas.height}`);
      
      // Add to container
      const container = mainCanvas.parentElement;
      container.style.position = 'relative';
      container.appendChild(physicsCanvas);
      
      // Run Matter.js simulation
      console.log('🚀 Starting Matter.js physics...');
      await physicsEngine.simulateBlast(blastResult, physicsCanvas, 30);
      
      // Cleanup after simulation
      setTimeout(() => {
        if (physicsCanvas.parentElement) {
          physicsCanvas.parentElement.removeChild(physicsCanvas);
        }
        physicsEngine.destroy();
        console.log('✅ Physics simulation complete and cleaned up');
      }, 5100);
      
    } catch (error) {
      console.error('❌ Physics simulation error:', error);
      setPhysicsActive(false);
    }
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
        <div className="status-item">
          <span className="status-label">Physics:</span>
          <span className={`status-value ${physicsActive ? 'physics-active' : ''}`}>
            {physicsActive ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Blast Indicators */}
      {blasts.length > 0 && (
        <div className="blast-indicators">
          <div className="indicators-title">Placed Explosives:</div>
          <div className="blast-list">
            {blasts.map((blast, index) => {
              console.log('Blast data:', blast); // Debug log
              return (
                <div key={blast.id} className="blast-indicator">
                  <span className="blast-icon">💣</span>
                  <span className="blast-position">({blast.x}, {blast.y})</span>
                </div>
              );
            })}
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