import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import { physicsEngine } from '../utils/PhysicsEngine';
import './BlastPlacementPanel.css';

const BlastPlacementPanel = ({ 
  onPlacementModeChange = () => {},
  onTriggerBlasts = () => {},
  onPhysicsUpdate = () => {}, // NEW: callback to update physics debris
  placementMode = false,
  canvasRef = null
}) => {
  const {
    blasts,
    maxBlasts,
    canPlaceBlast,
    clearBlasts,
    triggerBlasts,
    grid
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

    if (!canvasRef?.current || !grid) {
      alert('Grid not ready for physics simulation!');
      return;
    }

    setIsExploding(true);
    setPhysicsActive(true);
    
    try {
      // Get blast result with affected cells
      const result = triggerBlasts();
      
      console.log('Blast triggered:', {
        blasts: result.blasts.length,
        affectedCells: result.affectedCells.length,
        destroyedCells: result.destroyedCells?.length || 0
      });

      // Trigger visual explosion animation AND physics
      onTriggerBlasts(result);

      // Physics is now handled in App.jsx
      // await startPhysicsSimulation(result);

    } catch (error) {
      console.error('Blast simulation error:', error);
      setPhysicsActive(false);
    } finally {
      setTimeout(() => {
        setIsExploding(false);
      }, 1500);
    }
  };

  const startPhysicsSimulation = async (blastResult) => {
    try {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      
      console.log('Starting physics simulation...', {
        canvasSize: { width: rect.width, height: rect.height },
        blasts: blastResult.blasts.length,
        affectedCells: blastResult.affectedCells.length
      });

      // Initialize physics engine
      physicsEngine.initialize({
        gravity: { x: 0, y: 1 }
      });

      // Add boundaries (ground and walls)
      physicsEngine.addBoundaries(rect.width, rect.height);

      // Create debris for each blast
      blastResult.blasts.forEach(blast => {
        const blastCenter = {
          x: blast.x * 30 + 15, // cellSize = 30
          y: blast.y * 30 + 15
        };

        // Filter cells affected by this specific blast
        const blastCells = blastResult.affectedCells.filter(
          cell => cell.blastId === blast.id
        );

        console.log(`Creating debris for blast at (${blast.x}, ${blast.y}):`, blastCells.length, 'cells');

        // Create debris particles
        physicsEngine.createDebris(blastCells, 30, blastCenter);
      });

      // Start physics engine
      physicsEngine.start();

      // Animation loop for physics
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed < duration && physicsActive) {
          // Update physics
          physicsEngine.update(16.67);
          
          // Get debris and pass to parent for rendering
          const debris = physicsEngine.getDebris();
          if (onPhysicsUpdate) {
            onPhysicsUpdate(debris);
          }
          
          // Continue animation
          requestAnimationFrame(animate);
        } else {
          // Cleanup after simulation
          console.log('Physics simulation complete');
          physicsEngine.stop();
          physicsEngine.destroy();
          setPhysicsActive(false);
          
          if (onPhysicsUpdate) {
            onPhysicsUpdate([]); // Clear debris
          }
        }
      };

      // Start animation loop
      animate();

    } catch (error) {
      console.error('Physics simulation error:', error);
      setPhysicsActive(false);
    }
  };

  return (
    <div className="blast-placement-panel">
      <h3 className="panel-title">🧨 Blast Control Center</h3>
      
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

      {blasts.length > 0 && (
        <div className="blast-indicators">
          <div className="indicators-title">📍 Placed Explosives:</div>
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

      {physicsActive && (
        <div className="physics-status">
          <div className="physics-indicator">
            <span className="physics-icon">⚛️</span>
            <span>Physics simulation running...</span>
          </div>
          <div className="physics-timer">
            Debris simulation: 5 seconds
          </div>
        </div>
      )}

      <div className="blast-instructions">
        {placementMode ? (
          <p>🎯 Click on grid cells to place explosives (max {maxBlasts})</p>
        ) : (
          <p>Enable placement mode to add explosives to the grid</p>
        )}
        {blasts.length > 0 && !placementMode && (
          <p className="trigger-hint">💡 Click "Trigger Blast" to detonate with physics!</p>
        )}
        {physicsActive && (
          <p className="physics-hint">⚛️ Watch the realistic debris simulation powered by Matter.js</p>
        )}
      </div>
    </div>
  );
};

export default BlastPlacementPanel;