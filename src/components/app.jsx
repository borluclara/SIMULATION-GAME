import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import './App.css';
import OreGrid from './OreGrid';
import OreGridCanvas from './OreGridCanvas';
import BlastPlacementPanel from './BlastPlacementPanel';
import BlastToolPanel from './BlastToolPanel';
import CSVErrorUI from './csvErrorUI';
import { parseCSVToGrid } from '../utils/OreGrid';
import { gameState } from '../utils/GameState';

function App() {
  const [csvData, setCsvData] = useState(null);
  const [oreGrid, setOreGrid] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [placementMode, setPlacementMode] = useState(false);
  const [blastMarkers, setBlastMarkers] = useState([]);
  const [explosionAnimations, setExplosionAnimations] = useState([]);
  const [physicsDebris, setPhysicsDebris] = useState([]); // NEW: physics debris
  const [blastPower, setBlastPower] = useState(100);
  const [blastDirection, setBlastDirection] = useState(0);
  
  const canvasRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setHasError({
        type: 'INVALID_FILE_TYPE',
        message: 'Only CSV files are allowed.'
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const requiredColumns = ['x', 'y', 'material', 'type'];
        const csvHeaders = Object.keys(results.data[0] || {}).map(h => h.trim().toLowerCase());
        const missingColumns = requiredColumns.filter(col => !csvHeaders.includes(col));
        
        if (missingColumns.length > 0) {
          setHasError({
            type: 'MISSING_COLUMNS',
            message: `Missing columns: ${missingColumns.join(', ')}`
          });
          return;
        }

        setCsvData(results.data);
        
        try {
          const csvHeaders = Object.keys(results.data[0]).join(',');
          const csvRows = results.data.map(row => Object.values(row).join(','));
          const csvContent = [csvHeaders, ...csvRows].join('\n');
          
          const enhancedGrid = parseCSVToGrid(csvContent);
          setOreGrid(enhancedGrid);
          
          // Set grid in game state
          gameState.setGrid(enhancedGrid);
          
          // Switch to game view
          setCurrentView('game');
        } catch (error) {
          console.error('Grid creation error:', error);
        }
        
        setHasError(false);
      },
      error: (err) => {
        setHasError({
          type: 'PARSE_ERROR',
          message: 'Failed to parse CSV file.'
        });
      }
    });
  };

  const handleBlockClick = (block, position) => {
    if (placementMode) {
      const success = gameState.addBlast(position.x, position.y);
      if (success) {
        setBlastMarkers([...gameState.getBlasts()]);
      } else {
        alert(`Maximum ${gameState.state.maxBlasts} explosives allowed!`);
      }
    }
  };

  const handlePlacementModeChange = (newMode) => {
    setPlacementMode(newMode);
  };

  const handleTriggerBlasts = (blastResult) => {
    // Create explosion animations
    const animations = blastResult.blasts.map(blast => ({
      x: blast.x,
      y: blast.y,
      frame: 0,
      maxFrames: 30
    }));
    
    setExplosionAnimations(animations);
    
    // Clear blast markers
    setBlastMarkers([]);
    
    // Animate explosions
    let frame = 0;
    const animationInterval = setInterval(() => {
      frame++;
      if (frame >= 30) {
        clearInterval(animationInterval);
        setExplosionAnimations([]);
      } else {
        setExplosionAnimations(animations.map(a => ({ ...a, frame })));
      }
    }, 33);
  };

  const handleSimulate = () => {
    alert('Blast simulation starting!');
  };

  const handleReset = () => {
    gameState.clearBlasts();
    setBlastMarkers([]);
    setExplosionAnimations([]);
    setPlacementMode(false);
  };

  if (hasError) {
    return (
      <CSVErrorUI 
        onRetry={() => setHasError(false)} 
        setHasError={setHasError}
        error={hasError}
      />
    );
  }

  return (
    <div className="blast-sim-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="blast-header">
        <div style={{ width: '24px' }}></div>
        <h1 className="blast-title">BlastSim</h1>
        <span className="material-symbols-outlined settings-icon">settings</span>
      </header>

      <main className="blast-main">
        {currentView === 'home' && (
          <>
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <input
                className="name-input"
                placeholder="Enter your name"
                type="text"
                onChange={(e) => gameState.setPlayerName(e.target.value)}
              />
            </div>

            <div className="button-container">
              <button 
                className="blast-button start-button"
                onClick={() => csvData && setCurrentView('game')}
                disabled={!csvData}
              >
                Start Simulation
              </button>

              <label className="blast-button secondary-button">
                📁 Load CSV Scenario
                <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </>
        )}

        {currentView === 'game' && oreGrid && (
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            width: '100%', 
            maxWidth: '1400px',
            padding: '20px'
          }}>
            {/* Main Canvas Area */}
            <div style={{ flex: '1', minWidth: '600px' }}>
              <OreGridCanvas 
                ref={canvasRef}
                grid={oreGrid}
                cellSize={30}
                showGrid={true}
                showLabels={false}
                onBlockClick={handleBlockClick}
                placementMode={placementMode}
                blastMarkers={blastMarkers}
                explosionAnimations={explosionAnimations}
              />
            </div>

            {/* Control Panels */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              width: '350px'
            }}>
              <BlastPlacementPanel
                onPlacementModeChange={handlePlacementModeChange}
                onTriggerBlasts={handleTriggerBlasts}
                placementMode={placementMode}
                canvasRef={canvasRef}
              />
              
              <BlastToolPanel
                blastPower={blastPower}
                setBlastPower={setBlastPower}
                blastDirection={blastDirection}
                setBlastDirection={setBlastDirection}
                onSimulate={handleSimulate}
                onReset={handleReset}
              />
              
              <button
                className="blast-button secondary-button"
                onClick={() => setCurrentView('home')}
              >
                ⬅️ Back to Home
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <div className="nav-container">
          <a href="#" className={currentView === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => setCurrentView('home')}>
            <span className="material-symbols-outlined nav-icon">home</span>
            <span className="nav-text">Home</span>
          </a>
          <a href="#" className={currentView === 'game' ? 'nav-item active' : 'nav-item'} onClick={() => csvData && setCurrentView('game')}>
            <span className="material-symbols-outlined nav-icon">gamepad</span>
            <span className="nav-text">Game</span>
          </a>
        </div>
      </nav>
    </div>
  );
}

export default App;
