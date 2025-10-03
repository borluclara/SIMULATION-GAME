import React, { useState } from "react";
import UploadCSV from "./uploadcsv.jsx";
import CSVErrorUI from "./csvErrorUI.jsx";
import "./App.css";
import "./csvErrorUI.css";

function App() {
  const [hasError, setHasError] = useState(true); // force error ON for testing

  return (
    <div className="app-container">
      {hasError ? (
        <CSVErrorUI onRetry={() => setHasError(false)} setHasError={setHasError} />
      ) : (
        <>
          <header className="header">
            <h1 className="main-title">WELCOME TO OUR MINERAL BLASTING SIMULATOR</h1>
            <p className="subtitle">Advanced Mining Technology Simulation Platform</p>
          </header>

          <main className="main-content">
            <div className="simulation-area"> {/* Game Area */} </div>
            <div className="controls">
              <button className="start-btn">Start Simulation</button>
              <button className="reset-btn">Reset</button>
            </div>
            <section className="upload-section">
              <UploadCSV setHasError={setHasError} />
            </section>
          </main>

          <footer className="footer">
            <p>Advanced Mining Technology Simulation Platform</p>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
