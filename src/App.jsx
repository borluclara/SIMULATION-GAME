import React, { useState, useEffect } from 'react'
import Papa from 'papaparse'
import './components/app.css'
import GridManager from './components/GridManager'
import OreGrid from './components/OreGrid'
import OreGridCanvas from './components/OreGridCanvas'
import CSVErrorUI from './components/csvErrorUI'
import BlastToolPanel from './components/BlastToolPanel'
import ScoreFeedback from './components/ScoreFeedback'
import { parseCSVToGrid, OreGrid as OreGridClass } from './utils/OreGrid'

function App() {
  const [currentView, setCurrentView] = useState('home') // 'home', 'game', 'leaderboard', 'help'
  const [csvData, setCsvData] = useState(null)
  const [csvError, setCsvError] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [oreGrid, setOreGrid] = useState(null) // Add grid state for canvas
  const [isLoadingGrid, setIsLoadingGrid] = useState(false)
  const [csvReady, setCsvReady] = useState(false) // Track if CSV is loaded and ready
  
  // Blast simulation state
  const [blastPower, setBlastPower] = useState(500)
  const [blastDirection, setBlastDirection] = useState(180)
  const [mineralRecovery, setMineralRecovery] = useState(100)
  const [dilution, setDilution] = useState(0)
  const [simulationResults, setSimulationResults] = useState(null)

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
        
        // Flexible column validation - require only basic x, y, and ore/material columns
        const headers = (results.meta.fields || []).map(h => h.toLowerCase())
        const hasX = headers.some(h => h.includes('x'))
        const hasY = headers.some(h => h.includes('y'))
        const hasOre = headers.some(h => h.includes('ore') || h.includes('material') || h.includes('type'))
        
        if (!hasX || !hasY || !hasOre) {
          setCsvError({
            type: 'validation',
            message: 'Missing required columns: need x, y, and ore/material/type columns',
            details: `Found columns: ${results.meta.fields.join(', ')}`
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
    
    console.log(`Blast simulation: Power=${blastPower}, Direction=${blastDirection}°`)
    console.log(`Results: Recovery=${Math.round(recovery)}%, Dilution=${Math.round(newDilution)}%`)
  }

  const handleReset = () => {
    setMineralRecovery(100)
    setDilution(0)
    setBlastPower(500)
    setBlastDirection(180)
  }

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
        </div>

        <div className="button-container">
          <button 
            className={`blast-button start-button ${!csvReady ? 'disabled' : ''}`}
            onClick={() => csvReady && setCurrentView('game')}
            disabled={!csvReady}
            title={!csvReady ? 'Please upload a valid CSV file first' : 'Start the blast simulation'}
          >
            {csvReady ? 'Start Simulation' : 'Upload CSV First'}
          </button>

          <label className="blast-button secondary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            Load CSV Scenario
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button 
            className="blast-button secondary-button"
            onClick={() => setCurrentView('leaderboard')}
          >
            Leaderboard
          </button>

          <button 
            className="blast-button secondary-button"
            onClick={() => setCurrentView('help')}
          >
            Help
          </button>
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
          <p className="text-lg font-medium text-white dark:text-white mt-4">Player: {playerName || 'Alex'}</p>
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
              {/* Canvas Grid Section */}
              <div className="canvas-section">
                <div className="canvas-container">
                  <OreGridCanvas grid={oreGrid} />
                  <p className="canvas-instruction">Click on any ore block to apply a blast effect</p>
                </div>
              </div>
              
              {/* Controls Section - Side by Side Layout */}
              <div className="controls-section">
                <div className="controls-row">
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
    </div>
  )
}

export default App
