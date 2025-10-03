import React, { useRef } from "react";
import "./csvErrorUI.css";

export default function CSVErrorUI({ onRetry, onFileUpload }) {
  const fileInputRef = useRef(null);

  // Trigger hidden file input when Quick Re-upload is clicked
  const handleQuickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file change (when user selects a new CSV)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileUpload(file); // send file back to parent (App.jsx)
    }
  };

  return (
    <div className="error-container">
      {/* Close Button */}
      <div className="close-btn">✕</div>

      {/* Error Icon */}
      <div className="error-icon">!</div>

      {/* Title */}
      <h2>Invalid CSV Format</h2>

      {/* Description */}
      <p className="error-text">
        The CSV file you uploaded does not match the required format. Please
        review the sample CSV format below and try again.
      </p>

      {/* Sample CSV Button */}
      <a href="/blast_scenario_sample.csv" download className="sample-btn">
        Sample CSV Format
      </a>

      {/* Quick Re-upload Button */}
      <button className="retry-btn" onClick={handleQuickUpload}>
        Quick Re-upload
      </button>

      {/* Hidden File Input */}
      <input
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />

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
