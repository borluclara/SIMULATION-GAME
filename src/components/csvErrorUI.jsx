import React, { useRef } from "react";
import "./csvErrorUI.css";

export default function CSVErrorUI({ onRetry }) {
  const fileInputRef = useRef(null);

  // Trigger hidden file input when "Quick Re-upload" is clicked
  const handleQuickReupload = () => {
    fileInputRef.current.click();
  };

  // Handle when a file is selected
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("📂 Player selected file:", file.name);
      onRetry(); // Reset error screen so UploadCSV can handle parsing
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

      {/* Sample CSV Download Button (kept as download) */}
      <a href="/blast_scenario_sample.csv" download className="sample-btn">
        📥 Sample CSV Format
      </a>

      {/* Hidden input for file selection (used by Quick Re-upload) */}
      <input
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Quick Re-upload → open file picker */}
      <button className="retry-btn" onClick={handleQuickReupload}>
        🔄 Quick Re-upload
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
