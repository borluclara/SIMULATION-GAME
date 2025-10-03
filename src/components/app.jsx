import React, { useState } from 'react';
import Papa from 'papaparse';
import './App.css';
import OreGrid from './OreGrid';
import OreGridCanvas from './OreGridCanvas'; // Enhanced 2D grid from merged branch
import CSVErrorUI from './csvErrorUI'; // Error handling from err_handling branch
import { parseCSVToGrid } from '../utils/OreGrid'; // Grid utility from 2D-grid branch

function App() {
  const [csvData, setCsvData] = useState(null);
  const [oreGrid, setOreGrid] = useState(null); // Enhanced grid for 2D visualization
  const [hasError, setHasError] = useState(false); // State for error handling
  const [showFeatures, setShowFeatures] = useState(false); // Show all integrated features
  const [currentView, setCurrentView] = useState('home'); // Track current view

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Basic validation before parsing
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setHasError({
        type: 'INVALID_FILE_TYPE',
        message: 'Only CSV files are allowed. Please select a .csv file.'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setHasError({
        type: 'FILE_SIZE_EXCEEDED',
        message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit.`
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("Parsed CSV:", results.data);
        
        // Validate required columns - Updated to match your exact headers
        const requiredColumns = ['x', 'y', 'material', 'type', 'density_g_cm3', 'hardness_mohs', 'game_value', 'blast_hole'];
        const csvHeaders = Object.keys(results.data[0] || {}).map(h => h.trim().toLowerCase());
        const missingColumns = requiredColumns.filter(col => !csvHeaders.includes(col));
        
        if (missingColumns.length > 0) {
          setHasError({
            type: 'MISSING_COLUMNS',
            message: `Required columns are missing: ${missingColumns.join(', ')}`,
            details: {
              missing: missingColumns,
              found: csvHeaders,
              required: requiredColumns
            }
          });
          return;
        }

        // If validation passes, set the data
        setCsvData(results.data);
        
        // Create enhanced 2D grid for canvas visualization
        try {
          // Convert Papa Parse results back to CSV format for parseCSVToGrid
          const csvHeaders = Object.keys(results.data[0]).join(',');
          const csvRows = results.data.map(row => Object.values(row).join(','));
          const csvContent = [csvHeaders, ...csvRows].join('\n');
          
          const enhancedGrid = parseCSVToGrid(csvContent);
          setOreGrid(enhancedGrid);
          console.log("Enhanced 2D grid created successfully!", enhancedGrid);
        } catch (gridError) {
          console.warn("Could not create enhanced grid, using simple grid:", gridError);
          setOreGrid(null);
        }
        
        setHasError(false); // Clear any previous errors
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        setHasError({
          type: 'PARSE_ERROR',
          message: 'Failed to parse CSV file. Please check the file format.',
          details: { error: err.message }
        });
      }
    });
  };

  // Show error UI if there's an error
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
          />
        </div>

        <div className="button-container">
          <button className="blast-button start-button">
            Start Simulation
          </button>

          <label className="blast-button secondary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            📁 Load CSV Scenario
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button 
            className="blast-button secondary-button"
            onClick={() => setShowFeatures(!showFeatures)}
          >
            🔧 Show Features ({showFeatures ? 'Hide' : 'Show'})
          </button>

          <button 
            className="blast-button secondary-button"
            onClick={() => {
              // Trigger error demo
              setHasError({
                type: 'DEMO_ERROR',
                message: 'Demo: This shows the error handling from err_handling-new branch!',
                details: { demo: true }
              });
            }}
          >
            ⚠️ Demo Error Handling
          </button>
        </div>

        {/* Feature Showcase Section */}
        {showFeatures && (
          <div style={{ 
            width: '100%', 
            maxWidth: '600px', 
            marginTop: '1rem',
            padding: '1.5rem',
            background: 'rgba(56, 224, 123, 0.1)',
            borderRadius: '0.5rem',
            border: '1px solid rgba(56, 224, 123, 0.3)'
          }}>
            <h3 style={{ color: '#38e07b', textAlign: 'center', marginBottom: '1rem' }}>
              🚀 Integrated Branch Features
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(56, 224, 123, 0.05)', 
                borderRadius: '0.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📤</div>
                <strong style={{ color: '#38e07b' }}>UPLOAD-CSV</strong>
                <p style={{ color: '#aaa', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                  • Clean Interface<br/>
                  • CSV Upload<br/>
                  • Data Processing
                </p>
              </div>
              
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(244, 67, 54, 0.1)', 
                borderRadius: '0.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                <strong style={{ color: '#f44336' }}>err_handling-new</strong>
                <p style={{ color: '#aaa', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                  • Error Validation<br/>
                  • User Feedback<br/>
                  • Retry Functionality
                </p>
              </div>
              
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(33, 150, 243, 0.1)', 
                borderRadius: '0.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎮</div>
                <strong style={{ color: '#2196f3' }}>2D-grid-of-ore</strong>
                <p style={{ color: '#aaa', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                  • Canvas Rendering<br/>
                  • Interactive Grid<br/>
                  • Visual Effects
                </p>
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ color: '#aaa', fontSize: '0.85rem' }}>
                💡 <strong>Try these actions:</strong><br/>
                1. Upload a valid CSV → See 2D grid visualization<br/>
                2. Upload invalid file → See error handling<br/>
                3. Click "Demo Error" → Experience error UI
              </p>
            </div>
          </div>
        )}

        {/* Enhanced 2D Grid Visualization */}
        {csvData && (
          <div style={{ width: '100%', maxWidth: '1200px', marginTop: '2rem' }}>
            <div style={{ 
              marginBottom: '1rem', 
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(56, 224, 123, 0.1)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(56, 224, 123, 0.3)'
            }}>
              <h3 style={{ color: '#38e07b', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                🎮 Interactive Ore Grid Visualization
              </h3>
              <p style={{ color: '#aaa', fontSize: '1rem', marginBottom: '0.5rem' }}>
                <strong>{csvData.length} blocks loaded</strong> • Enhanced 2D Grid from merged branches
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#38e07b' }}>✅ CSV Processing (UPLOAD-CSV)</span>
                <span style={{ color: '#2196f3' }}>✅ 2D Rendering (2D-grid)</span>
                <span style={{ color: '#f44336' }}>✅ Error Handling (err_handling)</span>
              </div>
            </div>
            
            {/* Use enhanced canvas grid if available, fallback to simple grid */}
            {oreGrid ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '2rem',
                background: 'rgba(56, 224, 123, 0.05)',
                borderRadius: '0.5rem',
                border: '2px solid rgba(56, 224, 123, 0.2)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(33, 150, 243, 0.8)',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  Enhanced Canvas Grid
                </div>
                <OreGridCanvas 
                  grid={oreGrid}
                  cellSize={30}
                  showGrid={true}
                  showLabels={false}
                  onBlockClick={(block) => {
                    console.log("Block clicked:", block);
                    alert(`Block clicked!\nMaterial: ${block.material || 'Unknown'}\nPosition: (${block.x}, ${block.y})`);
                  }}
                />
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '2rem',
                background: 'rgba(56, 224, 123, 0.05)',
                borderRadius: '0.5rem',
                border: '2px solid rgba(56, 224, 123, 0.2)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(56, 224, 123, 0.8)',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  Simple Grid (Fallback)
                </div>
                <OreGrid data={csvData} />
              </div>
            )}
            
            {/* Grid Controls */}
            <div style={{ 
              marginTop: '1rem', 
              textAlign: 'center',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '0.5rem'
            }}>
              <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                🖱️ <strong>Interactive Features:</strong>
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.8rem' }}>
                <span style={{ color: '#38e07b' }}>Click blocks for details</span>
                <span style={{ color: '#38e07b' }}>Hover for effects</span>
                <span style={{ color: '#38e07b' }}>Real-time rendering</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav" style={{ position: 'sticky', bottom: 0 }}>
        <div className="nav-container">
          <a href="#" className="nav-item active">
            <span className="material-symbols-outlined nav-icon">home</span>
            <span className="nav-text">Home</span>
          </a>
          <a href="#" className="nav-item">
            <span className="material-symbols-outlined nav-icon">gamepad</span>
            <span className="nav-text">Game</span>
          </a>
          <a href="#" className="nav-item">
            <span className="material-symbols-outlined nav-icon">leaderboard</span>
            <span className="nav-text">Leaderboard</span>
          </a>
          <a href="#" className="nav-item">
            <span className="material-symbols-outlined nav-icon">help</span>
            <span className="nav-text">Help</span>
          </a>
        </div>
      </nav>
    </div>
  );
}

export default App;