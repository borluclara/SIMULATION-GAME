import React, { useRef, useState } from "react";
import "./csvErrorUI.css";

export default function CSVErrorUI({ onRetry, setHasError }) {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requiredColumns = ['x', 'y', 'z', 'density', 'material_type', 'hardness'];

  // CSV validation functions (copied from uploadcsv.jsx)
  const checkFileType = (file) => {
    const validExtensions = ['.csv'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension && file.type !== 'text/csv') {
      return {
        valid: false,
        errorType: 'INVALID_FILE_TYPE',
        message: 'Only CSV files are allowed. Please select a .csv file.'
      };
    }
    return { valid: true };
  };

  const checkFileSize = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      return {
        valid: false,
        errorType: 'FILE_SIZE_EXCEEDED',
        message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit.`
      };
    }
    return { valid: true };
  };

  const parseCSVContent = (content) => {
    const rows = content.trim().split('\n');
    
    if (rows.length === 0 || (rows.length === 1 && rows[0].trim() === '')) {
      return {
        valid: false,
        errorType: 'EMPTY_FILE',
        message: 'The CSV file appears to be empty.'
      };
    }

    if (rows.length < 2) {
      return {
        valid: false,
        errorType: 'NO_DATA_ROWS',
        message: 'CSV file must contain at least one data row besides the header.'
      };
    }

    return { valid: true, rows };
  };

  const validateHeaders = (headerRow) => {
    const headers = headerRow.split(',').map(h => h.trim().toLowerCase());
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      return {
        valid: false,
        errorType: 'MISSING_COLUMNS',
        message: `Required columns are missing: ${missingColumns.join(', ')}`,
        extraInfo: {
          missing: missingColumns,
          found: headers,
          required: requiredColumns
        }
      };
    }

    return { valid: true, headers };
  };

  const validateDataRows = (rows, headers) => {
    const columnCount = headers.length;
    const numericColumns = ['x', 'y', 'z', 'density', 'hardness'];
    const validMaterials = ['rock', 'ore', 'coal', 'mineral', 'stone', 'metal', 'granite', 'limestone'];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].split(',').map(cell => cell.trim());
      
      // Check column count
      if (cells.length !== columnCount) {
        return {
          valid: false,
          errorType: 'COLUMN_COUNT_MISMATCH',
          message: `Row ${rowIndex + 1} has ${cells.length} columns, but expected ${columnCount}.`,
          extraInfo: { rowNumber: rowIndex + 1, expected: columnCount, actual: cells.length }
        };
      }

      // Validate numeric columns
      for (const numCol of numericColumns) {
        const colIndex = headers.indexOf(numCol);
        if (colIndex !== -1) {
          const cellValue = cells[colIndex];
          if (cellValue === '' || isNaN(Number(cellValue))) {
            return {
              valid: false,
              errorType: 'INVALID_NUMERIC_VALUE',
              message: `Row ${rowIndex + 1}, column '${numCol}' contains invalid numeric value: '${cellValue}'`,
              extraInfo: { rowNumber: rowIndex + 1, column: numCol, value: cellValue }
            };
          }
        }
      }

      // Validate material type
      const materialIndex = headers.indexOf('material_type');
      if (materialIndex !== -1) {
        const materialValue = cells[materialIndex].toLowerCase();
        if (!validMaterials.includes(materialValue)) {
          return {
            valid: false,
            errorType: 'INVALID_MATERIAL_TYPE',
            message: `Row ${rowIndex + 1}: '${cells[materialIndex]}' is not a valid material type.`,
            extraInfo: { 
              rowNumber: rowIndex + 1, 
              value: cells[materialIndex], 
              validOptions: validMaterials 
            }
          };
        }
      }
    }

    return { valid: true };
  };

  // Process the uploaded file directly in the error component
  const processUploadedFile = async (file) => {
    setIsProcessing(true);

    try {
      // Step 1: Check file type
      const typeCheck = checkFileType(file);
      if (!typeCheck.valid) {
        setHasError({
          type: typeCheck.errorType,
          message: typeCheck.message
        });
        return;
      }

      // Step 2: Check file size
      const sizeCheck = checkFileSize(file);
      if (!sizeCheck.valid) {
        setHasError({
          type: sizeCheck.errorType,
          message: sizeCheck.message
        });
        return;
      }

      // Step 3: Read file content
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error('Failed to read the file'));
        reader.readAsText(file);
      });

      // Step 4: Parse CSV content
      const contentCheck = parseCSVContent(fileContent);
      if (!contentCheck.valid) {
        setHasError({
          type: contentCheck.errorType,
          message: contentCheck.message
        });
        return;
      }

      // Step 5: Validate headers
      const headerCheck = validateHeaders(contentCheck.rows[0]);
      if (!headerCheck.valid) {
        setHasError({
          type: headerCheck.errorType,
          message: headerCheck.message,
          details: headerCheck.extraInfo
        });
        return;
      }

      // Step 6: Validate data rows
      const dataCheck = validateDataRows(contentCheck.rows, headerCheck.headers);
      if (!dataCheck.valid) {
        setHasError({
          type: dataCheck.errorType,
          message: dataCheck.message,
          details: dataCheck.extraInfo
        });
        return;
      }

      // Success - file is valid, remove error screen
      console.log('CSV validation successful!');
      setHasError(false);
      
    } catch (error) {
      setHasError({
        type: 'FILE_PROCESSING_ERROR',
        message: 'An error occurred while processing the file.',
        details: { error: error.message }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger hidden file input when "Quick Re-upload" is clicked
  const handleQuickReupload = () => {
    fileInputRef.current.click();
  };

  // Handle when a file is selected - parse immediately
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("📂 Player selected file:", file.name);
      processUploadedFile(file);
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
