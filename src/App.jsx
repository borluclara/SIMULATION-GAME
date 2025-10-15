import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import './components/app.css'
import GridManager from './components/GridManager'
import OreGrid from './components/OreGrid'
import OreGridCanvas from './components/OreGridCanvas'
import CSVErrorUI from './components/csvErrorUI'
import BlastToolPanel from './components/BlastToolPanel'
import BlastPlacementPanel from './components/BlastPlacementPanel'
import BlastSummaryPanel from './components/BlastSummaryPanel'
import ScoreFeedback from './components/ScoreFeedback'
import { parseCSVToGrid, OreGrid as OreGridClass } from './utils/OreGrid'
import { useGameState } from './hooks/useGameState'
import { physicsEngine } from './utils/PhysicsEngine'

function App() {
  // Use global game state instead of individual state variables
  const {
    playerName,
    score,
    currentScenario,
    blasts,
    setPlayerName,
    setScore,
    addScore,
    setCurrentScenario,
    setGrid,
    addBlast,
    triggerBlasts,
    hasPlayerName,
    reset: resetGameState
  } = useGameState();

  const [currentView, setCurrentView] = useState('home') // 'home', 'game', 'leaderboard', 'help'
  const [csvData, setCsvData] = useState(null)
  const [csvError, setCsvError] = useState(null)
  const [oreGrid, setOreGrid] = useState(null) // Add grid state for canvas
  const [isLoadingGrid, setIsLoadingGrid] = useState(false)
  const [csvReady, setCsvReady] = useState(false) // Track if CSV is loaded and ready
  
  // Blast simulation state
  const [blastPower, setBlastPower] = useState(500)
  const [blastDirection, setBlastDirection] = useState(180)
  const [mineralRecovery, setMineralRecovery] = useState(100)
  const [dilution, setDilution] = useState(0)
  const [simulationResults, setSimulationResults] = useState(null)
  
  // Blast placement state
  const [placementMode, setPlacementMode] = useState(false)
  const [explosionAnimations, setExplosionAnimations] = useState([])
  const [physicsDebris, setPhysicsDebris] = useState([]) // Physics debris state
  
  // Blast summary panel state
  const [showBlastSummary, setShowBlastSummary] = useState(false)
  const [blastResults, setBlastResults] = useState(null)
  const [previousScore, setPreviousScore] = useState(0)
  
  const canvasRef = React.useRef(null)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setCsvError(null)
    setIsLoadingGrid(true)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log("Parsed CSV:", results.data)
        
        // Compare against exact columns from blast_scenario_sample.csv
        const requiredColumns = ['x', 'y', 'material', 'type', 'density_g_cm3', 'hardness_mohs', 'game_value', 'blast_hole']
        const playerColumns = (results.meta.fields || []).map(h => h.toLowerCase().trim())
        
        // Find missing columns by comparing player's columns with required columns
        const missingColumns = requiredColumns.filter(reqCol => {
          return !playerColumns.some(playerCol => 
            playerCol === reqCol || 
            playerCol.replace(/[_\s]/g, '') === reqCol.replace(/[_\s]/g, '')
          )
        })
        
        if (missingColumns.length > 0) {
          const errorMessage = `Missing required columns: ${missingColumns.join(', ')}`
          
          setCsvError({
            type: 'validation',
            message: errorMessage
          })
          setIsLoadingGrid(false)
          return
        }
        
        try {
          // Convert Papa Parse data to CSV string for grid creation
          const csvString = Papa.unparse(results.data)
          const grid = await parseCSVToGrid(csvString)
          
          console.log('Grid created successfully, ready for simulation')
          setCsvData(results.data)
          setOreGrid(grid)
          setCsvReady(true) // Mark CSV as ready for simulation
          setIsLoadingGrid(false)
          
          // Store the scenario in global state
          setCurrentScenario({
            data: results.data,
            grid: grid,
            fileName: file.name,
            uploadedAt: new Date().toISOString()
          })
          
          // Set grid in game state for blast functionality
          setGrid(grid.data || grid)
        } catch (error) {
          console.error("Grid creation error:", error)
          setCsvError({
            type: 'grid_creation',
            message: 'Failed to create grid from CSV data',
            details: error.message
          })
          setIsLoadingGrid(false)
        }
      },
      error: (err) => {
        console.error("CSV Parse Error:", err)
        setCsvError({
          type: 'parse',
          message: 'Failed to parse CSV file',
          details: err.message
        })
        setIsLoadingGrid(false)
      }
    })
  }

  const handleRetry = () => {
    setCsvError(null)
    setCsvData(null)
    setOreGrid(null)
    setIsLoadingGrid(false)
    setCsvReady(false)
    setCurrentView('home')
    
    // Reset global state scenario but keep player name
    setCurrentScenario(null)
  }

  // Blast simulation handlers
  const handlePowerChange = (power) => {
    setBlastPower(power)
  }

  const handleDirectionChange = (direction) => {
    setBlastDirection(direction)
  }

  const handleRunSimulation = () => {
    if (!oreGrid) return
    
    // Simple blast simulation logic
    const recovery = Math.max(60, 100 - (blastPower / 20) + Math.random() * 20)
    const newDilution = Math.max(0, (blastPower / 50) - 10 + Math.random() * 10)
    
    setMineralRecovery(Math.round(recovery))
    setDilution(Math.round(newDilution))
    
    // Calculate and update score in global state
    const blastScore = Math.round(recovery * 10 - newDilution * 5)
    addScore(Math.max(0, blastScore))
    
    console.log(`Blast simulation: Power=${blastPower}, Direction=${blastDirection}°`)
    console.log(`Results: Recovery=${Math.round(recovery)}%, Dilution=${Math.round(newDilution)}%`)
    console.log(`Score added: ${Math.max(0, blastScore)}, Total score: ${score + Math.max(0, blastScore)}`)
  }

  const handleReset = () => {
    setMineralRecovery(100)
    setDilution(0)
    setBlastPower(500)
    setBlastDirection(180)
    setPlacementMode(false)
    setExplosionAnimations([])
    
    // Reset score in global state but keep player name
    resetGameState(true)
  }

  // Blast placement handlers
  const handlePlacementModeChange = (mode) => {
    setPlacementMode(mode)
  }

  const handleBlockClick = (block, position) => {
    // Close blast summary panel when new action begins
    if (showBlastSummary) {
      handleCloseBlastSummary();
    }
    
    if (placementMode) {
      // Place blast marker
      const success = addBlast(position.x, position.y)
      if (!success) {
        alert('Maximum number of blasts reached!')
      }
    }
  }

  const handleTriggerBlasts = async (result) => {
    if (result.blasts.length > 0) {
      // Store previous score before blast
      setPreviousScore(score);
      
      // Create explosion animations
      const newAnimations = result.blasts.map(blast => ({
        x: blast.x,
        y: blast.y,
        id: blast.id,
        frame: 0,
        maxFrames: 30
      }))
      
      setExplosionAnimations(newAnimations)
      
      // Calculate score increase based on materials destroyed
      const materialsDestroyed = result.destroyedCells?.length || 0;
      const scoreIncrease = materialsDestroyed * 10; // 10 points per material destroyed
      addScore(scoreIncrease);
      
      // Show blast summary panel
      setBlastResults(result);
      setShowBlastSummary(true);
      
      // *** PHYSICS SIMULATION ***
      console.log('Physics check:', { 
        destroyedCells: result.destroyedCells?.length || 0,
        hasCanvas: !!canvasRef.current 
      });
      
      if (result.destroyedCells && result.destroyedCells.length > 0 && canvasRef.current) {
        try {
          console.log('Starting physics simulation with', result.destroyedCells.length, 'destroyed cells');
          
          // Initialize physics engine with canvas dimensions
          const canvas = canvasRef.current;
          console.log('Canvas dimensions:', { width: canvas.width, height: canvas.height });
          
          physicsEngine.initialize({
            width: canvas.width || 800,
            height: canvas.height || 600,
            gravity: { x: 0, y: 0.8 }
          });

          // Start physics simulation
          physicsEngine.start();
          console.log('Physics engine started');

          // Create debris for destroyed cells
          const blastCenter = result.blasts[0]; // Use first blast as center
          const cellSize = 30; // Assuming 30px cell size
          
          // Convert destroyed cells to the format expected by createDebris
          const debrisData = result.destroyedCells.map(cell => ({
            x: cell.x,
            y: cell.y,
            originalMaterial: cell.material || 'stone'
          }));
          
          console.log('Creating debris for cells:', debrisData);
          
          // Create debris using the physics engine
          const debris = physicsEngine.createDebris(
            debrisData,
            cellSize,
            { x: blastCenter.x * cellSize, y: blastCenter.y * cellSize }
          );
          
          console.log('Created', debris.length, 'debris particles');

          // Update debris state continuously
          const updatePhysics = () => {
            if (physicsEngine.isRunning && physicsEngine.shouldContinue()) {
              physicsEngine.update();
              const debris = physicsEngine.getDebris();
              setPhysicsDebris([...debris]);
              console.log('Physics update:', debris.length, 'debris particles');
              
              requestAnimationFrame(updatePhysics);
            } else {
              // Simulation ended
              console.log('Physics simulation ended');
              setTimeout(() => {
                physicsEngine.destroy();
                setPhysicsDebris([]);
              }, 1000);
            }
          };
          
          requestAnimationFrame(updatePhysics);
          
        } catch (error) {
          console.error('Physics simulation error:', error);
        }
      }
      
      // Update mineral recovery based on blast effects
      const recoveryImpact = result.affectedCells.length * 2
      const newRecovery = Math.max(20, mineralRecovery - recoveryImpact)
      setMineralRecovery(Math.round(newRecovery))
      
      // Update dilution
      const dilutionIncrease = result.affectedCells.length * 1.5
      setDilution(Math.min(80, dilution + dilutionIncrease))
      
      // Clear animations after delay
      setTimeout(() => {
        setExplosionAnimations([])
      }, 1500)
      
      console.log(`Detonated ${result.blasts.length} blasts affecting ${result.affectedCells.length} cells, destroyed ${result.destroyedCells?.length || 0} cells`)
    }
  }

  const handleCloseBlastSummary = () => {
    setShowBlastSummary(false);
    setBlastResults(null);
  };

  const handleSave = () => {
    const results = {
      power: blastPower,
      direction: blastDirection,
      recovery: mineralRecovery,
      dilution: dilution,
      timestamp: new Date().toISOString()
    }
    console.log('Saving simulation results:', results)
    // Add save functionality here
  }

  const handleReplay = () => {
    console.log('Replaying last simulation...')
    handleRunSimulation()
  }

  // Home View (UPLOAD-CSV Interface)
  const renderHomeView = () => (
    <div className="blast-sim-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="blast-header">
        <div style={{ width: '24px' }}></div>
        <h1 className="blast-title">BlastSim</h1>
        <span className="material-symbols-outlined settings-icon">
          settings
        </span>
      </header>

      <main className="blast-main">
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <input
            className="name-input"
            placeholder="Enter your name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          {csvReady && !hasPlayerName() && (
            <p className="name-required-message">
              ⚠️ Name is required to start the simulation
            </p>
          )}
        </div>

        <div className="button-container">
          <label className="blast-button secondary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            Upload CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          {csvReady && (
            <button 
              className={`blast-button start-button ${!hasPlayerName() ? 'disabled' : ''}`}
              onClick={() => hasPlayerName() && setCurrentView('game')}
              disabled={!hasPlayerName()}
              title={!hasPlayerName() ? "Please enter your name to start" : "Start the blast simulation"}
            >
              Start Simulation
            </button>
          )}
        </div>

        {csvReady && (
          <div className="csv-success-message">
            <div className="success-icon">✓</div>
            <p>CSV file loaded successfully! Ready to start simulation.</p>
          </div>
        )}

        {csvError && <CSVErrorUI error={csvError} onRetry={handleRetry} onFileUpload={handleFileUpload} />}
      </main>
    </div>
  )

  // Game View (2D Grid Interface)
  const renderGameView = () => (
    <div className="relative flex h-auto min-h-screen w-full flex-col justify-between overflow-x-hidden blast-game-view">
      <div className="flex-grow">
        <header className="p-4">
          <div className="flex items-center justify-between">
            <button 
              className="flex items-center justify-center size-10 text-white dark:text-white"
              onClick={() => setCurrentView('home')}
            >
              <svg className="feather feather-arrow-left" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <line x1="19" x2="5" y1="12" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white dark:text-white text-center">Blast Simulation</h1>
            <div className="size-10"></div>
          </div>
          <p className="text-lg font-medium text-white dark:text-white mt-4">
            Welcome, {playerName}! | Score: {score}
          </p>
        </header>
        
        <main className="blast-simulation-main">
          {isLoadingGrid ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '2rem',
              color: 'white'
            }}>
              <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
              <p>Processing CSV data and creating grid...</p>
            </div>
          ) : csvData && oreGrid ? (
            <div className="blast-simulation-container">
              {/* Welcome Message */}
              <div className="welcome-section">
                <h2 className="welcome-message">
                  Welcome, {playerName}! 👋
                </h2>
                <p className="welcome-subtitle">
                </p>
              </div>
              
              {/* Canvas Grid Section */}
              <div className="canvas-section">
                <div className="canvas-container">
                  <OreGridCanvas 
                    ref={canvasRef}
                    grid={oreGrid} 
                    onBlockClick={handleBlockClick}
                    placementMode={placementMode}
                    blastMarkers={blasts}
                    explosionAnimations={explosionAnimations}
                    physicsDebris={physicsDebris}
                  />
                  <p className="canvas-instruction">
                    {placementMode 
                      ? "Click on grid cells to place explosives" 
                      : "Enable placement mode to add explosives"}
                  </p>
                </div>
              </div>
              
              {/* Controls Section - Three Column Layout */}
              <div className="controls-section">
                <div className="controls-row">
                  <BlastPlacementPanel
                    onPlacementModeChange={handlePlacementModeChange}
                    onTriggerBlasts={handleTriggerBlasts}
                    placementMode={placementMode}
                    canvasRef={canvasRef}
                  />
                  
                  <BlastToolPanel
                    onPowerChange={handlePowerChange}
                    onDirectionChange={handleDirectionChange}
                    onRunSimulation={handleRunSimulation}
                    onReset={handleReset}
                    onSave={handleSave}
                    onReplay={handleReplay}
                    initialPower={blastPower}
                    initialDirection={blastDirection}
                  />
                  
                  <ScoreFeedback
                    mineralRecovery={mineralRecovery}
                    dilution={dilution}
                  />
                </div>
              </div>
            </div>
          ) : (
            <GridManager />
          )}
        </main>
      </div>
    </div>
  )



  return (
    <div>
      {currentView === 'home' && renderHomeView()}
      {currentView === 'game' && renderGameView()}
      {currentView === 'leaderboard' && (
        <div className="flex items-center justify-center min-h-screen text-white blast-sim-container">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
            <p>Coming soon...</p>
          </div>
        </div>
      )}
      {currentView === 'help' && (
        <div className="flex items-center justify-center min-h-screen text-white blast-sim-container">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Help</h2>
            <p>Game instructions coming soon...</p>
          </div>
        </div>
      )}

      {/* Blast Summary Panel */}
      <BlastSummaryPanel 
        blastResults={blastResults}
        isVisible={showBlastSummary}
        onClose={handleCloseBlastSummary}
        playerScore={score}
        previousScore={previousScore}
        grid={oreGrid}
      />
    </div>
  )
}

export default App
