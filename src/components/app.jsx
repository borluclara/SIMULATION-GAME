import React, { useState } from 'react';
import Papa from 'papaparse';
import './App.css';
import OreGrid from './OreGrid';
import CSVErrorUI from './csvErrorUI'; // Import error handling component

function App() {
  const [csvData, setCsvData] = useState(null);
  const [hasError, setHasError] = useState(false); // State for error handling

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
            Load CSV Scenario
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button className="blast-button secondary-button">
            Leaderboard
          </button>

          <button className="blast-button secondary-button">
            Help
          </button>
        </div>

        {csvData && (
          <div style={{ width: '100%', maxWidth: '1200px', marginTop: '2rem' }}>
            <OreGrid data={csvData} />
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