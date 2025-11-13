/**
 * SavedSessionsModal Component
 * Displays a list of saved game sessions with metadata and actions
 */

import React, { useState, useEffect } from 'react';
import './SavedSessionsModal.css';

const SavedSessionsModal = ({ 
  isVisible, 
  onClose, 
  onLoadSave, 
  onDeleteSave,
  onExportSave,
  savedSessions 
}) => {
  const [selectedSaveId, setSelectedSaveId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp', 'score', 'name'
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  // Clear error when modal closes
  useEffect(() => {
    if (!isVisible) {
      setErrorMessage(null);
    }
  }, [isVisible]);

  // Filter and sort sessions
  const filteredSessions = savedSessions
    .filter(session => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        session.saveName.toLowerCase().includes(query) ||
        session.playerName.toLowerCase().includes(query) ||
        new Date(session.timestamp).toLocaleString().toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'name':
          return a.saveName.localeCompare(b.saveName);
        case 'timestamp':
        default:
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    });

  const handleLoadClick = (saveId) => {
    try {
      const session = savedSessions.find(s => s.id === saveId);
      
      // Check for compatibility issues
      if (session?.isCorrupted) {
        setErrorMessage('This save file is corrupted and cannot be loaded.');
        return;
      }
      
      if (!session?.isCompatible) {
        setErrorMessage(`This save is from version ${session?.version} and is not compatible with the current version.`);
        return;
      }
      
      onLoadSave(saveId);
      onClose();
    } catch (error) {
      console.error('Error loading save:', error);
      setErrorMessage('An unexpected error occurred while loading this save.');
    }
  };

  const handleDeleteClick = (saveId, saveName) => {
    setConfirmDelete({ saveId, saveName });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      onDeleteSave(confirmDelete.saveId);
      setConfirmDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const handleExportClick = (saveId) => {
    onExportSave(saveId);
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleString();
    } catch (error) {
      return 'Unknown';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="saved-sessions-overlay" onClick={onClose}>
      <div className="saved-sessions-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <span className="material-symbols-outlined">folder_open</span>
            <h2 className="modal-title">Load Simulation</h2>
          </div>
          <button className="close-button" onClick={onClose} title="Close (Esc)">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="modal-controls">
          <div className="search-box">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              placeholder="Search by name, player, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          <div className="sort-controls">
            <label className="sort-label">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="timestamp">Recent</option>
              <option value="score">Score</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="modal-error-message">
            <span className="material-symbols-outlined">error</span>
            <span>{errorMessage}</span>
            <button 
              className="error-close"
              onClick={() => setErrorMessage(null)}
              title="Dismiss"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Sessions List */}
        <div className="sessions-list">
          {filteredSessions.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined empty-icon">
                {searchQuery ? 'search_off' : 'folder_off'}
              </span>
              <p className="empty-message">
                {searchQuery ? 'No saves match your search' : 'No saved sessions found'}
              </p>
              {!searchQuery && (
                <p className="empty-hint">
                  Save your game progress to see it here
                </p>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div 
                key={session.id}
                className={`session-card ${selectedSaveId === session.id ? 'selected' : ''} ${session.isCorrupted ? 'corrupted' : ''} ${!session.isCompatible ? 'incompatible' : ''}`}
                onClick={() => setSelectedSaveId(session.id)}
              >
                {/* Session Info */}
                <div className="session-info">
                  <div className="session-header">
                    <h3 className="session-name">
                      {session.saveName}
                      {session.isCorrupted && (
                        <span className="badge corrupted-badge" title="Corrupted save file">
                          <span className="material-symbols-outlined">error</span>
                          Corrupted
                        </span>
                      )}
                      {!session.isCompatible && !session.isCorrupted && (
                        <span className="badge incompatible-badge" title={`Version ${session.version} not compatible`}>
                          <span className="material-symbols-outlined">warning</span>
                          Incompatible
                        </span>
                      )}
                    </h3>
                    <span className="session-timestamp" title={new Date(session.timestamp).toLocaleString()}>
                      {formatTimestamp(session.timestamp)}
                    </span>
                  </div>

                  <div className="session-details">
                    <div className="detail-item">
                      <span className="material-symbols-outlined detail-icon">person</span>
                      <span className="detail-text">{session.playerName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="material-symbols-outlined detail-icon">star</span>
                      <span className="detail-text">{session.score} pts</span>
                    </div>
                    <div className="detail-item">
                      <span className="material-symbols-outlined detail-icon">explosion</span>
                      <span className="detail-text">{session.blastCount} blast{session.blastCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Session Actions */}
                <div className="session-actions">
                  <button
                    className="action-btn load-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadClick(session.id);
                    }}
                    disabled={session.isCorrupted || !session.isCompatible}
                    title={session.isCorrupted ? 'Cannot load corrupted save' : !session.isCompatible ? 'Version incompatible' : 'Load this save'}
                  >
                    <span className="material-symbols-outlined">play_arrow</span>
                    Load
                  </button>

                  <button
                    className="action-btn export-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportClick(session.id);
                    }}
                    disabled={session.isCorrupted}
                    title="Export save to file"
                  >
                    <span className="material-symbols-outlined">file_download</span>
                  </button>

                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(session.id, session.saveName);
                    }}
                    title="Delete this save"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Info */}
        {filteredSessions.length > 0 && (
          <div className="modal-footer">
            <div className="footer-info">
              <span className="info-text">
                {filteredSessions.length} save{filteredSessions.length !== 1 ? 's' : ''} 
                {searchQuery && ` (filtered from ${savedSessions.length})`}
              </span>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {confirmDelete && (
          <div className="confirm-overlay" onClick={handleCancelDelete}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-header">
                <span className="material-symbols-outlined confirm-icon">warning</span>
                <h3>Delete Save?</h3>
              </div>
              <p className="confirm-message">
                Are you sure you want to delete <strong>"{confirmDelete.saveName}"</strong>?
                <br />
                This action cannot be undone.
              </p>
              <div className="confirm-actions">
                <button className="confirm-btn cancel-btn" onClick={handleCancelDelete}>
                  Cancel
                </button>
                <button className="confirm-btn delete-confirm-btn" onClick={handleConfirmDelete}>
                  <span className="material-symbols-outlined">delete</span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedSessionsModal;
