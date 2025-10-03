import React, { useRef, useState } from "react";
import "./csvErrorU.css";

export default function CSVErrorUI({ onRetry, setHasError, error }) {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requiredColumns = ['x', 'y', 'material', 'type', 'density_g_cm3', 'hardness_mohs', 'game_value', 'blast_hole'];

  // Get error message to display
  const getErrorMessage = () => {
    if (error && error.message) {
      return error.message;
    }
    return "Missing required columns";
  };

  // Get error title based on error type
  const getErrorTitle = () => {
    if (!error || !error.type) return "WRONG FORMAT";
    
    switch (error.type) {
      case 'INVALID_FILE_TYPE':
        return "INVALID FILE TYPE";
      case 'FILE_SIZE_EXCEEDED':
        return "FILE TOO LARGE";
      case 'MISSING_COLUMNS':
        return "WRONG FORMAT";
      case 'PARSE_ERROR':
        return "PARSE ERROR";
      default:
        return "ERROR";
    }
  };

  // Handle file selection for retry
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("📂 Retrying with file:", file.name);
      // Close error screen first
      setHasError(false);
      
      // Trigger file processing in main app
      setTimeout(() => {
        const mainFileInput = document.querySelector('input[type="file"][accept=".csv"]');
        if (mainFileInput) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          mainFileInput.files = dataTransfer.files;
          const event = new Event('change', { bubbles: true });
          mainFileInput.dispatchEvent(event);
        }
      }, 100);
    }
  };

  // Trigger file input
  const handleQuickReupload = () => {
    fileInputRef.current.click();
  };

  // Close error modal
  const handleClose = () => {
    setHasError(false);
  };

  return (
    <div className="error-container">
      {/* Close Button */}
      <div className="close-btn" onClick={handleClose}>✕</div>

      {/* Error Icon */}
      <div className="error-icon">!</div>

      {/* Title */}
      <h2>{getErrorTitle()}</h2>

      {/* Description */}
      <p className="error-text">
        {getErrorMessage()}
      </p>

      {/* Show additional details if available */}
      {error && error.details && error.details.missing && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ color: '#f44336', fontSize: '14px' }}>
            Missing: {error.details.missing.join(', ')}
          </p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            Required: {error.details.required.join(', ')}
          </p>
        </div>
      )}

      {/* Sample CSV Download Button */}
      <a href="/blast_scenario_sample.csv" download className="sample-btn">
        📥 Sample CSV Format
      </a>

      {/* Hidden input for file selection */}
      <input
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Quick Re-upload Button */}
      <button 
        className="retry-btn" 
        onClick={handleQuickReupload}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <span className="spinner"></span>
            Validating...
          </>
        ) : (
          <>🔄 Quick Re-upload</>
        )}
      </button>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <span>🏠 Home</span>
        <span>🎮 Game</span>
        <span>🏆 Leaderboard</span>
        <span>❓ Help</span>
      </div>
    </div>
  );
}
