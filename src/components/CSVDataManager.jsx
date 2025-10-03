import React, { useState } from 'react';
import CSVUploader from './CSVUploader';
import GridManager from './GridManager';
import useCSVData from '../hooks/useCSVData';

const CSVDataManager = () => {
  const [csvData, setCsvData] = useState(null);
  const [error, setError] = useState(null);
  
  const handleDataLoaded = (data) => {
    setCsvData(data);
    setError(null);
  };

  const handleError = (err) => {
    setError(err);
    setCsvData(null);
  };

  return (
    <div className="csv-data-manager">
      {error ? (
        <div className="error-container">
          <h2>Error Loading CSV</h2>
          <p>{error.message}</p>
          <button onClick={() => setError(null)}>Try Again</button>
        </div>
      ) : (
        <>
          <CSVUploader onDataLoaded={handleDataLoaded} onError={handleError} />
          {csvData && <GridManager data={csvData} />}
        </>
      )}
    </div>
  );
};

export default CSVDataManager;
