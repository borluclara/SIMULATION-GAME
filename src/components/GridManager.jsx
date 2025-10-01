/**
 * Grid Manager Component
 * Handles loading, displaying, and managing the ore grid with canvas rendering
 */

import React, { useState } from 'react';
import { useOreGrid } from '../hooks/useOreGrid';
import OreGridCanvas from './OreGridCanvas';
import { ORE_COLORS } from '../utils/OreGrid';
import './GridManager.css';

const GridManager = () => {
  const {
    grid,
    loading,
    error,
    gridStats,
    loadGrid,
    loadGridFromContent,
    applyBlast,
    resetGrid,
    isReady
  } = useOreGrid('/sample_ore_data.csv'); // Load sample data on mount

  const [cellSize, setCellSize] = useState(30);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [blastRadius, setBlastRadius] = useState(2);
  const [blastPower, setBlastPower] = useState(50);
  const [blastDirection, setBlastDirection] = useState(90);
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0); // For forcing canvas refresh

  // Handle file upload with canvas refresh
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      loadGridFromContent(e.target.result);
      // Force canvas refresh when new CSV is uploaded
      setCanvasRefreshKey(prev => prev + 1);
    };
    reader.readAsText(file);
  };

  // Handle block click for blasting
  const handleBlockClick = (block, position) => {
    if (!block || block.isDestroyed) return;

    const blastResult = applyBlast(block.x, block.y, blastRadius, blastPower);
    
    console.log('Blast applied!', {
      target: `${block.oreType} at (${block.x}, ${block.y})`,
      result: blastResult
    });
  };

  // Load sample data with canvas refresh
  const loadSampleData = () => {
    loadGrid('/sample_ore_data.csv');
    setCanvasRefreshKey(prev => prev + 1);
  };

  // Simulate blast at random location
  const runSimulation = () => {
    if (!grid || !isReady) return;
    
    const randomX = Math.floor(Math.random() * grid.width);
    const randomY = Math.floor(Math.random() * grid.height);
    
    applyBlast(randomX, randomY, blastRadius, blastPower);
  };

  return (
    <>
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading grid data...</p>
        </div>
      )}

      {error && (
        <div className="error-container">
          <p className="error-text">Error: {error}</p>
          <button onClick={loadSampleData} className="error-button">
            Try Sample Data
          </button>
        </div>
      )}

      {isReady && (
        <>
          {/* Ore Zone Canvas */}
          <div className="content-section">
            <h2 className="section-title">Ore Zone Canvas</h2>
            <div className="ore-canvas-container">
              <OreGridCanvas
                grid={grid}
                onBlockClick={handleBlockClick}
                cellSize={cellSize}
                showGrid={showGrid}
                showLabels={showLabels}
                forceRefresh={canvasRefreshKey}
                className="w-full h-full"
              />
            </div>
            <p className="canvas-helper-text">
              Click on any ore block to apply a blast effect
            </p>
          </div>

          {/* Blast Tool Panel */}
          <div className="content-section">
            <h2 className="section-title">Blast Tool Panel</h2>
            <div className="blast-panel">
              <div className="slider-container">
                <div className="slider-header">
                  <label className="slider-label" htmlFor="power-slider">Power</label>
                  <span className="slider-value">{blastPower}</span>
                </div>
                <div className="slider-track">
                  <div 
                    className="slider-progress"
                    style={{ width: `${(blastPower / 200) * 100}%` }}
                  ></div>
                  <div 
                    className="slider-thumb"
                    style={{ left: `${(blastPower / 200) * 100}%` }}
                  ></div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={blastPower}
                    onChange={(e) => setBlastPower(parseInt(e.target.value))}
                    className="slider-input"
                  />
                </div>
              </div>
              <div className="slider-container">
                <div className="slider-header">
                  <label className="slider-label" htmlFor="direction-slider">Direction</label>
                  <span className="slider-value">{blastDirection}°</span>
                </div>
                <div className="slider-track">
                  <div 
                    className="slider-progress"
                    style={{ width: `${(blastDirection / 360) * 100}%` }}
                  ></div>
                  <div 
                    className="slider-thumb"
                    style={{ left: `${(blastDirection / 360) * 100}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={blastDirection}
                    onChange={(e) => setBlastDirection(parseInt(e.target.value))}
                    className="slider-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="content-section">
            <div className="button-grid">
              <button 
                onClick={runSimulation}
                className="button button-primary button-full"
              >
                Run Simulation
              </button>
              <button 
                onClick={resetGrid}
                className="button button-secondary"
              >
                Reset
              </button>
              <button 
                onClick={() => document.getElementById('csv-upload').click()}
                className="button button-secondary"
              >
                Upload CSV
              </button>
              <button className="button button-secondary button-full">
                Replay
              </button>
            </div>
          </div>

          {/* Score & Feedback */}
          <div className="content-section">
            <h2 className="section-title">Score & Feedback</h2>
            <div className="score-grid">
              <div className="score-card">
                <p className="score-label">Mineral Recovery</p>
                <p className="score-value">85%</p>
                <p className="score-change score-positive">+5%</p>
              </div>
              <div className="score-card">
                <p className="score-label">Dilution</p>
                <p className="score-value">15%</p>
                <p className="score-change score-negative">-2%</p>
              </div>
            </div>
          </div>

          {/* Hidden file upload for CSV loading */}
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            id="csv-upload"
            className="sr-only"
          />
        </>
      )}
    </>
  );
};

export default GridManager;