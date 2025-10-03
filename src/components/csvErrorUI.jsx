import React, { useRef, useState } from "react";
import Papa from 'papaparse';
import "./csvErrorU.css";

export default function CSVErrorUI({ onRetry, error, onFileUpload }) {
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
      case 'validation':
        return "WRONG FORMAT";
      case 'parse':
        return "PARSE ERROR";
      default:
        return "ERROR";
    }
  };

  // Handle file selection for retry
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    console.log("📂 Processing retry file:", file.name);

    // Parse the CSV file
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("Parsed retry CSV:", results.data);
        
        // Validate required columns
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          console.error("Still missing columns:", missingColumns);
          setIsProcessing(false);
          // The error will still be displayed, user can try again
          return;
        }
        
        // Success! Pass the data back to the main app
        console.log("✅ CSV validation successful!");
        setIsProcessing(false);
        
        // Create a simulated event to pass back to the main app
        const simulatedEvent = {
          target: {
            files: [file]
          }
        };
        
        // Call the parent's file upload handler
        if (onFileUpload) {
          onFileUpload(simulatedEvent);
        } else {
          // Fallback: call onRetry to clear the error
          onRetry();
        }
      },
      error: (err) => {
        console.error("CSV Parse Error on retry:", err);
        setIsProcessing(false);
        // The error will still be displayed, user can try again
      }
    });

    // Clear the input for next use
    event.target.value = '';
  };

  // Trigger file input
  const handleQuickReupload = () => {
    fileInputRef.current.click();
  };

  // Close error modal
  const handleClose = () => {
    onRetry();
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
      {error && error.details && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ color: '#f44336', fontSize: '14px' }}>
            {error.details}
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

    </div>
  );
}
