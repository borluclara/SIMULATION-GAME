/**
 * SaveLoadPanel Component
 * Unified panel for save, load, and export functionality with collapsible interface
 */

import React, { useState, useRef } from 'react';
import './SaveLoadPanel.css';

const SaveLoadPanel = ({ 
  onSave,
  onLoad,
  onExport,
  onImport,
  gameState,
  isVisible = true,
  position = 'right' // 'left', 'right', 'top'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle save functionality
  const handleSave = async () => {
    if (!gameState) {
      showFeedback('No game state to save', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const saveData = {
        ...gameState,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(saveData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `blastsim-save-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      showFeedback('Game saved successfully!', 'success');
      
      if (onSave) onSave(saveData);
    } catch (error) {
      console.error('Save error:', error);
      showFeedback('Failed to save game', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle load functionality
  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection for loading
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      processLoadFile(file);
    }
  };

  // Process loaded file
  const processLoadFile = async (file) => {
    try {
      setIsLoading(true);
      
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        // Load game save file
        const text = await file.text();
        const saveData = JSON.parse(text);
        
        if (saveData.version && onLoad) {
          onLoad(saveData);
          showFeedback('Game loaded successfully!', 'success');
        } else {
          showFeedback('Invalid save file format', 'error');
        }
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Load CSV ore data
        const text = await file.text();
        
        if (onImport) {
          onImport(text);
          showFeedback('CSV data imported successfully!', 'success');
        }
      } else {
        showFeedback('Unsupported file type. Use .json or .csv files.', 'error');
      }
    } catch (error) {
      console.error('Load error:', error);
      showFeedback('Failed to load file', 'error');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle export functionality
  const handleExport = async () => {
    if (!gameState) {
      showFeedback('No data to export', 'error');
      return;
    }

    try {
      setIsLoading(true);
      
      // Export as CSV if grid data exists
      if (gameState.grid || gameState.csvData) {
        const csvData = gameState.csvData || generateCSVFromGrid(gameState.grid);
        const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
        
        const exportFileDefaultName = `blastsim-export-${Date.now()}.csv`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showFeedback('Data exported successfully!', 'success');
        
        if (onExport) onExport(csvData);
      } else {
        showFeedback('No grid data to export', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showFeedback('Failed to export data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate CSV from grid data (fallback)
  const generateCSVFromGrid = (grid) => {
    if (!grid || !grid.getAllBlocks) return '';
    
    const blocks = grid.getAllBlocks();
    const csvRows = ['x,y,ore_type,hardness,value'];
    
    blocks.forEach(block => {
      if (block) {
        csvRows.push(`${block.x},${block.y},${block.oreType},${block.hardness},${block.value}`);
      }
    });
    
    return csvRows.join('\n');
  };

  // Show feedback message
  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processLoadFile(files[0]);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`save-load-panel ${position} ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      {/* Toggle Button */}
      <button 
        className="panel-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand Save/Load Panel' : 'Collapse Save/Load Panel'}
      >
        <span className="material-symbols-outlined">
          {isCollapsed ? 'add' : 'chevron_right'}
        </span>
      </button>

      {/* Panel Content */}
      <div className="panel-content">
        {/* Panel Header */}
        <div className="panel-header">
          <h3 className="panel-title">
            <span className="material-symbols-outlined">folder_managed</span>
            File Manager
          </h3>
        </div>

        {/* Action Buttons */}
        <div className="panel-actions">
          {/* Save Button */}
          <button 
            className="action-button save"
            onClick={handleSave}
            disabled={isLoading || !gameState}
            title="Save current game state as JSON file"
          >
            <span className="material-symbols-outlined">save</span>
            <span className="action-text">Save Game</span>
          </button>

          {/* Load Button */}
          <button 
            className="action-button load"
            onClick={handleLoad}
            disabled={isLoading}
            title="Load game state or import CSV data"
          >
            <span className="material-symbols-outlined">folder_open</span>
            <span className="action-text">Load/Import</span>
          </button>

          {/* Export Button */}
          <button 
            className="action-button export"
            onClick={handleExport}
            disabled={isLoading || !gameState}
            title="Export grid data as CSV file"
          >
            <span className="material-symbols-outlined">file_download</span>
            <span className="action-text">Export CSV</span>
          </button>
        </div>

        {/* Drop Zone */}
        <div 
          className={`drop-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <span className="material-symbols-outlined">cloud_upload</span>
          <p>Drop files here or click Load/Import</p>
          <small>Supports .json (saves) and .csv (ore data)</small>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".json,.csv"
          style={{ display: 'none' }}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <span>Processing...</span>
          </div>
        )}

        {/* Feedback Message */}
        {feedback.message && (
          <div className={`feedback-message ${feedback.type}`}>
            <span className="material-symbols-outlined">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {feedback.message}
          </div>
        )}

        {/* Quick Info */}
        <div className="panel-info">
          <div className="info-item">
            <span className="material-symbols-outlined">info</span>
            <div className="info-text">
              <small>Save: Game state → JSON</small>
              <small>Export: Grid data → CSV</small>
              <small>Load: Both formats supported</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveLoadPanel;