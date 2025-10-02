import React from 'react';
import Papa from 'papaparse';
import './CSVUploader.css';

const CSVUploader = ({ onDataLoaded, onError }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          onError({ message: 'Error parsing CSV: ' + results.errors[0].message });
          return;
        }
        onDataLoaded(results.data);
      },
      error: (err) => {
        onError({ message: 'Failed to parse CSV: ' + err.message });
      }
    });
  };

  return (
    <div className="csv-uploader">
      <label className="upload-label">
        <span className="upload-text">Upload CSV File</span>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="file-input"
        />
      </label>
      <div className="requirements">
        <p>Required format: CSV file with ore data</p>
        <p>Maximum size: 10MB</p>
      </div>
    </div>
  );
};

export default CSVUploader;
