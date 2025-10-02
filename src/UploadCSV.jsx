import React from 'react';
import Papa from 'papaparse';

const UploadCSV = ({ onDataParsed }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("Parsed CSV:", results.data);
        onDataParsed(results.data); // Send to grid generator
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
      }
    });
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
    </div>
  );
};

export default UploadCSV;