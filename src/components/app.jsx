import React, { useState } from "react";
import UploadCSV from "./uploadcsv.jsx";
import CSVErrorUI from "./csvErrorUI.jsx";
import Papa from "papaparse"; // for parsing CSV
import "./App.css";
import "./csvErrorUI.css";

function App() {
  const [hasError, setHasError] = useState(false);
  const [csvData, setCsvData] = useState(null);

  // Function to parse uploaded CSV
  const handleFileUpload = (file) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        console.log("Parsed CSV:", results.data);

        // Example validation: check required columns
        const requiredColumns = ["x", "y", "z", "density", "material_type", "hardness"];
        const valid = requiredColumns.every((col) =>
          results.meta.fields.includes(col)
        );

        if (valid) {
          setCsvData(results.data);
          setHasError(false); // valid CSV → exit error mode
        } else {
          setHasError(true); // invalid CSV → stay in error UI
        }
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
        setHasError(true);
      },
    });
  };

  return (
    <div className="app-container">
      {hasError ? (
        <CSVErrorUI onRetry={() => setHasError(false)} onFileUpload={handleFileUpload} />
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
