/**
 * OreVisualFeedbackOverlay.jsx
 * 
 * React component for rendering visual feedback on ore blocks after blast.
 * Displays color-coded outcomes with smooth animations.
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  OreVisualFeedbackManager, 
  CanvasOreRenderer,
  OUTCOME_COLORS 
} from '../utils/OreVisualFeedback.js';
import './OreVisualFeedbackOverlay.css';

/**
 * Visual feedback overlay component
 */
export function OreVisualFeedbackOverlay({ 
  blastData, 
  affectedBlocks, 
  gridSize, 
  blockSize,
  onFeedbackApplied,
  showLegend = true 
}) {
  const canvasRef = useRef(null);
  const managerRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [stats, setStats] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  // Initialize manager and renderer
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new OreVisualFeedbackManager();
    }

    return () => {
      // Cleanup
      if (managerRef.current) {
        managerRef.current.reset();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Setup canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridSize || !blockSize) return;

    canvas.width = gridSize.width * blockSize;
    canvas.height = gridSize.height * blockSize;

    rendererRef.current = new CanvasOreRenderer(canvas, gridSize, blockSize);
  }, [gridSize, blockSize]);

  // Apply feedback when blast data changes
  useEffect(() => {
    if (!blastData || !affectedBlocks || !managerRef.current || !rendererRef.current) {
      return;
    }

    // Apply visual feedback
    const feedbackStats = managerRef.current.applyFeedback(blastData, affectedBlocks);
    setStats(feedbackStats);
    setIsRendering(true);

    // Notify parent
    if (onFeedbackApplied) {
      onFeedbackApplied(feedbackStats);
    }

    // Start render loop
    startRenderLoop();

    return () => {
      stopRenderLoop();
    };
  }, [blastData, affectedBlocks]);

  /**
   * Render loop for smooth animations
   */
  const startRenderLoop = () => {
    const render = () => {
      if (!managerRef.current || !rendererRef.current) return;

      const renderData = managerRef.current.exportRenderData();
      
      if (renderData.all.length > 0) {
        rendererRef.current.renderAll(renderData);
        animationFrameRef.current = requestAnimationFrame(render);
      } else {
        setIsRendering(false);
      }
    };

    render();
  };

  const stopRenderLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  /**
   * Reset feedback
   */
  const handleReset = () => {
    if (managerRef.current) {
      managerRef.current.reset();
    }
    if (rendererRef.current) {
      rendererRef.current.clear();
    }
    setStats(null);
    setIsRendering(false);
  };

  return (
    <div className="ore-visual-feedback-overlay">
      <canvas 
        ref={canvasRef}
        className="feedback-canvas"
      />
      
      {showLegend && stats && (
        <FeedbackLegend stats={stats} />
      )}
      
      {isRendering && (
        <div className="rendering-indicator">
          Animating...
        </div>
      )}
    </div>
  );
}

/**
 * Legend component showing outcome statistics
 */
function FeedbackLegend({ stats }) {
  const entries = [
    { key: 'recovered', label: 'Recovered', color: OUTCOME_COLORS.recovered.base },
    { key: 'wasted', label: 'Wasted', color: OUTCOME_COLORS.wasted.base },
    { key: 'diluted', label: 'Diluted', color: OUTCOME_COLORS.diluted.base },
    { key: 'waste_collected', label: 'Waste', color: OUTCOME_COLORS.waste_collected.base },
    { key: 'unaffected', label: 'Unaffected', color: OUTCOME_COLORS.unaffected.base }
  ];

  return (
    <div className="feedback-legend">
      <h3>Blast Outcomes</h3>
      <div className="legend-items">
        {entries.map(entry => (
          stats[entry.key] > 0 && (
            <div key={entry.key} className="legend-item">
              <span 
                className="legend-color" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="legend-label">{entry.label}</span>
              <span className="legend-count">{stats[entry.key]}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

export default OreVisualFeedbackOverlay;
