/**
 * SaveLoadPanel Component
 * Unified panel for save, load, and export functionality with collapsible interface
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import './SaveLoadPanel.css';
import simulationStorage from '../utils/SimulationStorage';
import SavedSessionsModal from './SavedSessionsModal';
import { saveLoadManager } from '../utils/SaveLoadManager';

const REQUIRED_CSV_HEADERS = ['x', 'y', 'material', 'type', 'density_g_cm3', 'hardness_mohs', 'game_value', 'blast_hole'];

const normalizeHeaderValue = (value = '') => value
  .toLowerCase()
  .replace(/(^"|"$)/g, '')
  .replace(/[\s_-]/g, '');

const validateCsvStructure = (fileText) => {
  if (!fileText || typeof fileText !== 'string') {
    return { valid: false, error: 'The CSV file is empty.' };
  }

  const firstLine = fileText.split(/\r?\n/).find(Boolean);
  if (!firstLine) {
    return { valid: false, error: 'The CSV file has no header row.' };
  }

  const headers = firstLine.split(',').map(normalizeHeaderValue);
  const missing = REQUIRED_CSV_HEADERS.filter((required) => {
    const normalized = normalizeHeaderValue(required);
    return !headers.some((header) => header === normalized);
  });

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required columns: ${missing.join(', ')}`
    };
  }

  return { valid: true };
};

const analyzeJsonSaveFile = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return { valid: false, error: 'The JSON file is empty.' };
  }

  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Save data must be a JSON object.' };
    }

    const payload = parsed.gameState || parsed;
    const hasPlayerName = payload && typeof payload.playerName === 'string' && payload.playerName.trim().length > 0;
    const csvData = payload && payload.csvData;
    const hasStructuredCsv = Array.isArray(csvData) && csvData.length > 0;
    const hasRawCsvString = typeof csvData === 'string' && csvData.trim().length > 0;

    if (hasPlayerName && (hasStructuredCsv || hasRawCsvString)) {
      return { valid: true, type: 'standard-save', parsed };
    }

    const sessionMeta = parsed.metadata;
    const sessionCsv = parsed.rawData?.csvData;
    const sessionHasCsv = Array.isArray(sessionCsv) ? sessionCsv.length > 0 : typeof sessionCsv === 'string' && sessionCsv?.trim().length > 0;
    const sessionPlayer = sessionMeta?.playerName || parsed.scores?.playerName || ''; 

    if (sessionMeta && sessionHasCsv && sessionPlayer) {
      return { valid: true, type: 'session-export', parsed };
    }

    if (!hasPlayerName) {
      return { valid: false, error: 'Player name is missing from the save file.' };
    }

    return { valid: false, error: 'Unrecognized save file format.' };
  } catch (error) {
    return { valid: false, error: 'Save file is not valid JSON.' };
  }
};

const convertSessionExportToGameState = (sessionData) => {
  if (!sessionData || typeof sessionData !== 'object') {
    return null;
  }

  const playerName = sessionData.metadata?.playerName || sessionData.scores?.playerName || 'Imported Player';
  const csvData = sessionData.rawData?.csvData;
  const hasCsv = Array.isArray(csvData) ? csvData.length > 0 : typeof csvData === 'string' && csvData?.trim().length > 0;

  if (!hasCsv) {
    return null;
  }

  const simulationSettings = {
    blastPower: sessionData.simulationSettings?.blastPower,
    blastDirection: sessionData.simulationSettings?.blastDirection,
    mineralRecovery: sessionData.simulationSettings?.mineralRecovery ?? sessionData.scores?.mineralRecovery,
    dilution: sessionData.simulationSettings?.dilution ?? sessionData.scores?.dilution
  };

  return {
    playerName,
    score: sessionData.scores?.currentScore ?? 0,
    blasts: sessionData.blasts?.activeBlasts || [],
    csvData,
    gridState: sessionData.grid || null,
    currentScenario: sessionData.scenario || null,
    simulationSettings,
    timestamp: sessionData.metadata?.exportedAt || new Date().toISOString()
  };
};

const SaveLoadPanel = ({ 
  onSave,
  onLoad,
  onExport,
  onImport,
  onSaveSimulation, // New: Save to persistent storage
  onLoadSimulation, // New: Load from persistent storage
  onExportSession,
  canExportSession = true,
  gameState,
  isVisible = true,
  position = 'right' // 'left', 'right', 'top'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [savedSimulations, setSavedSimulations] = useState([]);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedSessions, setSavedSessions] = useState([]);

  // Load saved sessions on mount and when visibility changes
  useEffect(() => {
    if (isVisible) {
      loadSavedSessions();
    }
  }, [isVisible]);

  // Function to refresh saved sessions list
  const loadSavedSessions = () => {
    const sessions = saveLoadManager.getAllSaves();
    setSavedSessions(sessions);
  };

  // Load saved simulations on mount
  useEffect(() => {
    loadSavedSimulations();
  }, []);

  // Load saved simulations list
  const loadSavedSimulations = async () => {
    try {
      const simulations = await simulationStorage.getAllSimulations();
      const compatibleSimulations = simulations.filter(sim => !sim.isCorrupted && sim.isCompatible !== false);

      if (simulations.length > compatibleSimulations.length) {
        console.warn('Ignored incompatible or corrupted saves during load simulation list.');
        showFeedback('Some outdated saves were skipped due to version mismatch.', 'info');
      }

      setSavedSimulations(compatibleSimulations);
    } catch (error) {
      console.error('Error loading saved simulations:', error);
      showFeedback('Failed to read saved simulations', 'error');
    }
  };

  const buildSerializableGameState = () => {
    if (typeof onSave === 'function') {
      try {
        const enrichedState = onSave(gameState);
        if (enrichedState && typeof enrichedState === 'object') {
          return enrichedState;
        }
      } catch (error) {
        console.warn('onSave handler did not return a serializable state:', error);
      }
    }

    return {
      ...gameState,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  };

  // Handle save functionality - now supports both file download and persistent storage
  const handleSave = async (saveType = 'persistent') => {
    if (!gameState) {
      showFeedback('No game state to save', 'error');
      return;
    }

    try {
      setIsLoading(true);

      const serializableState = buildSerializableGameState();
      const saveName = `${serializableState.playerName || 'Player'} - ${new Date().toLocaleString()}`;

      // Save to localStorage using SaveLoadManager
      const result = saveLoadManager.saveGame(serializableState, saveName);
      
      if (result.success) {
        showFeedback('Game saved to browser storage!', 'success');
        loadSavedSessions(); // Refresh the list
      } else {
        showFeedback(result.error || 'Failed to save game', 'error');
      }
      
      if (saveType === 'persistent') {
        // Save to persistent storage (new functionality)
        await handleSaveSimulation();
      } else if (saveType === 'download') {
        // File download functionality using enriched state
        const downloadPayload = serializableState.timestamp
          ? serializableState
          : { ...serializableState, timestamp: new Date().toISOString(), version: '1.0.0' };

        const dataStr = JSON.stringify(downloadPayload, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `blastsim-save-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        showFeedback('Game file downloaded!', 'success');
      }
    } catch (error) {
      console.error('Save error:', error);
      showFeedback('Failed to save game', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create simulation entries formatted for modal display
  const simulationSessions = useMemo(() => {
    return (savedSimulations || []).map((sim) => ({
      id: sim.id,
      saveName: sim.customName || sim.scenario?.name || 'Saved Simulation',
      playerName: sim.player?.name || sim.player?.playerName || 'Unknown Miner',
      timestamp: sim.timestamp,
      score: sim.player?.score ?? 0,
      blastCount: sim.metadata?.totalBlasts ?? sim.blasts?.history?.length ?? 0,
      isCorrupted: sim.isCorrupted,
      isCompatible: sim.isCompatible,
      version: sim.version,
      summary: sim.summary,
      source: 'simulation'
    }));
  }, [savedSimulations]);

  // Handle load functionality - Show saved sessions modal
  const handleLoad = () => {
    loadSavedSessions();
    loadSavedSimulations();
    setShowLoadModal(true);
  };

  // Handle loading a specific save from modal
  const handleLoadSave = async (saveId) => {
    try {
      setIsLoading(true);
      const result = saveLoadManager.loadGame(saveId);
      
      if (!result.success) {
        showFeedback(result.error || 'Failed to load game', 'error');
        return;
      }

      if (onLoad) {
        try {
          await onLoad(result.gameState);
          showFeedback(`Loaded: ${result.metadata.saveName}`, 'success');
          setShowLoadModal(false);
        } catch (loadError) {
          console.error('Load handler rejected save:', loadError);
          showFeedback(loadError.message || 'Save file is incompatible with this build.', 'error');
        }
      }
    } catch (error) {
      console.error('Load error:', error);
      showFeedback('Failed to load game', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a save from modal
  const handleDeleteSave = (saveId) => {
    try {
      const success = saveLoadManager.deleteSave(saveId);
      if (success) {
        loadSavedSessions(); // Refresh the list
        showFeedback('Save deleted successfully', 'success');
      } else {
        showFeedback('Failed to delete save', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showFeedback('Failed to delete save', 'error');
    }
  };

  // Handle exporting a save from modal
  const handleExportSave = (saveId) => {
    try {
      const result = saveLoadManager.exportSave(saveId);
      if (result.success) {
        showFeedback('Save exported successfully!', 'success');
      } else {
        showFeedback(result.error || 'Failed to export save', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showFeedback('Failed to export save', 'error');
    }
  };

  // Handle importing a save file
  const handleImportSave = async (file) => {
    try {
      setIsLoading(true);
      const result = await saveLoadManager.importSave(file);
      
      if (result.success) {
        loadSavedSessions(); // Refresh the list
        showFeedback(`Imported: ${result.saveName}`, 'success');
      } else {
        showFeedback(result.error || 'Failed to import save', 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showFeedback('Failed to import save', 'error');
    } finally {
      setIsLoading(false);
    }
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
      const extension = file.name?.split('.').pop()?.toLowerCase() || '';
      const isJson = file.type === 'application/json' || extension === 'json';
      const isCsv = file.type === 'text/csv' || extension === 'csv';

      if (isJson) {
        const fileText = await file.text();
        const analysis = analyzeJsonSaveFile(fileText);

        if (!analysis.valid) {
          showFeedback(`${analysis.error} Supported files include File Manager saves and Session exports.`, 'error');
          return;
        }

        if (analysis.type === 'session-export') {
          const converted = convertSessionExportToGameState(analysis.parsed);
          if (!converted) {
            showFeedback('Session export is missing required data.', 'error');
            return;
          }

          if (!onLoad) {
            showFeedback('Session files cannot be loaded in this context.', 'error');
            return;
          }

          try {
            await onLoad(converted);
            showFeedback('Session file loaded successfully!', 'success');
          } catch (loadError) {
            console.error('Session load error:', loadError);
            showFeedback(loadError.message || 'Failed to load session file.', 'error');
          }
          return;
        }

        await handleImportSave(file);
        return;
      }

      if (isCsv) {
        const text = await file.text();
        const validation = validateCsvStructure(text);

        if (!validation.valid) {
          showFeedback(`${validation.error}. Ensure your CSV includes all standard columns.`, 'error');
          return;
        }

        if (onImport) {
          await onImport(text);
          showFeedback('CSV data imported successfully!', 'success');
        }
        return;
      }

      showFeedback('Unsupported file type. Please select a .json save or .csv ore grid.', 'error');
    } catch (error) {
      console.error('Load error:', error);
      showFeedback('Failed to load file. Please verify the file and try again.', 'error');
    } finally {
      setIsLoading(false);
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
      if (gameState.grid || gameState.gridState || gameState.csvData) {
        const csvData = gameState.csvData || generateCSVFromGrid(gameState.grid, gameState.gridState);
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

  const handleExportSession = async () => {
    if (!onExportSession) {
      showFeedback('Export data not available', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await onExportSession();
      showFeedback('Session data exported!', 'success');
    } catch (error) {
      console.error('Session export error:', error);
      showFeedback('Failed to export session data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate CSV from grid data (fallback)
  const generateCSVFromGrid = (grid, gridSnapshot) => {
    const blocks = grid && typeof grid.getAllBlocks === 'function'
      ? grid.getAllBlocks()
      : (gridSnapshot?.blocks || []);

    if (!blocks || blocks.length === 0) {
      return '';
    }
    const csvRows = ['x,y,ore_type,hardness,value'];
    
    blocks.forEach(block => {
      if (block) {
        csvRows.push(`${block.x},${block.y},${block.oreType},${block.hardness},${block.value}`);
      }
    });
    
    return csvRows.join('\n');
  };

  // Handle save simulation to persistent storage
  const handleSaveSimulation = async () => {
    if (!onSaveSimulation) {
      showFeedback('Save simulation not available', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await onSaveSimulation();
      await loadSavedSimulations(); // Refresh the list
      showFeedback('Simulation saved to storage!', 'success');
    } catch (error) {
      console.error('Save simulation error:', error);
      showFeedback('Failed to save simulation', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle load simulation from persistent storage
  const handleLoadSimulation = async (simulationId) => {
    if (!onLoadSimulation) {
      showFeedback('Load simulation not available', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await onLoadSimulation(simulationId);
      showFeedback('Simulation loaded successfully!', 'success');
    } catch (error) {
      console.error('Load simulation error:', error);
      showFeedback('Failed to load simulation', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSimulation = async (simulationId) => {
    try {
      const simulation = savedSimulations.find((sim) => sim.id === simulationId)
        || await simulationStorage.loadSimulation(simulationId);

      if (!simulation) {
        showFeedback('Simulation not found for export', 'error');
        return;
      }

      const dataStr = JSON.stringify(simulation, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${simulation.customName || simulation.scenario?.name || 'blastsim-simulation'}-${simulationId}.json`;
      link.click();
      URL.revokeObjectURL(url);

      showFeedback('Simulation exported successfully', 'success');
    } catch (error) {
      console.error('Export simulation error:', error);
      showFeedback('Failed to export simulation', 'error');
    }
  };

  // Handle delete simulation
  const handleDeleteSimulation = async (simulationId) => {
    try {
      await simulationStorage.deleteSimulation(simulationId);
      await loadSavedSimulations(); // Refresh the list
      showFeedback('Simulation deleted', 'info');
    } catch (error) {
      console.error('Delete simulation error:', error);
      showFeedback('Failed to delete simulation', 'error');
    }
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
    <>
      {/* Saved Sessions Modal */}
      <SavedSessionsModal
        isVisible={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoadSave={handleLoadSave}
        onDeleteSave={handleDeleteSave}
        onExportSave={handleExportSave}
        savedSessions={savedSessions}
        simulationSessions={simulationSessions}
        onLoadSimulation={handleLoadSimulation}
        onDeleteSimulation={handleDeleteSimulation}
        onExportSimulation={handleExportSimulation}
      />

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

        {/* Unified Action Menu */}
        <div className="action-menu" role="toolbar" aria-label="Simulation save and load actions">
          <button 
            className="menu-button save"
            onClick={handleSave}
            disabled={isLoading || !gameState}
            title="Save current simulation to browser and persistent storage"
            aria-label="Save simulation"
          >
            <span className="menu-icon material-symbols-outlined">bookmark_add</span>
            <span className="menu-label">Save</span>
          </button>

          <button 
            className="menu-button load"
            onClick={handleLoad}
            disabled={isLoading}
            title="Load previous simulations or import CSV data"
            aria-label="Load or import data"
          >
            <span className="menu-icon material-symbols-outlined">folder_open</span>
            <span className="menu-label">Load</span>
          </button>

          <button 
            className="menu-button export"
            onClick={handleExport}
            disabled={isLoading || !gameState}
            title="Export the current grid as CSV"
            aria-label="Export grid CSV"
          >
            <span className="menu-icon material-symbols-outlined">file_download</span>
            <span className="menu-label">CSV</span>
          </button>

          {onExportSession && (
            <button 
              className="menu-button export-json"
              onClick={handleExportSession}
              disabled={isLoading || !gameState || !canExportSession}
              title="Export extended session analytics as JSON"
              aria-label="Export session JSON"
            >
              <span className="menu-icon material-symbols-outlined">system_update_alt</span>
              <span className="menu-label">⬇ Export Data</span>
            </button>
          )}
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
    </>
  );
};

export default SaveLoadPanel;