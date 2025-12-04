/**
 * SaveLoadManager
 * Handles all save/load operations to localStorage with version control
 */

const SAVE_KEY_PREFIX = 'blastsim_save_';
const SAVE_INDEX_KEY = 'blastsim_save_index';
const CURRENT_VERSION = '1.0.0';

export class SaveLoadManager {
  constructor() {
    this.currentVersion = CURRENT_VERSION;
  }

  /**
   * Save game state to localStorage with timestamp and metadata
   * @param {Object} gameState - Complete game state to save
   * @param {String} saveName - Optional custom name for the save
   * @returns {Object} Save metadata
   */
  saveGame(gameState, saveName = null) {
    try {
      const timestamp = new Date().toISOString();
      const saveId = `${SAVE_KEY_PREFIX}${Date.now()}`;
      
      // Create save data with metadata
      const saveData = {
        id: saveId,
        version: this.currentVersion,
        timestamp,
        saveName: saveName || `Save ${new Date().toLocaleString()}`,
        gameState: {
          ...gameState,
          timestamp,
          version: this.currentVersion
        }
      };

      // Save to localStorage
      localStorage.setItem(saveId, JSON.stringify(saveData));
      
      // Update save index
      this._updateSaveIndex(saveId, saveData);
      
      console.log('Game saved successfully:', saveData);
      return { success: true, saveId, timestamp, saveName: saveData.saveName };
    } catch (error) {
      console.error('Error saving game:', error);
      
      // Check if quota exceeded
      if (error.name === 'QuotaExceededError') {
        return { 
          success: false, 
          error: 'Storage quota exceeded. Please delete old saves.' 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Load game state from localStorage by ID
   * @param {String} saveId - ID of the save to load
   * @returns {Object} Loaded game state or error
   */
  loadGame(saveId) {
    try {
      const saveDataStr = localStorage.getItem(saveId);
      
      if (!saveDataStr) {
        return { success: false, error: 'Save not found' };
      }

      const saveData = JSON.parse(saveDataStr);
      
      // Version compatibility check
      if (!this._isCompatibleVersion(saveData.version)) {
        return { 
          success: false, 
          error: `Incompatible save version (${saveData.version}). Current version: ${this.currentVersion}`,
          canMigrate: this._canMigrateVersion(saveData.version)
        };
      }

      // Validate save data structure
      if (!this._validateSaveData(saveData)) {
        return { 
          success: false, 
          error: 'Save data is corrupted or invalid' 
        };
      }

      console.log('Game loaded successfully:', saveData);
      return { 
        success: true, 
        gameState: saveData.gameState,
        metadata: {
          saveName: saveData.saveName,
          timestamp: saveData.timestamp,
          version: saveData.version
        }
      };
    } catch (error) {
      console.error('Error loading game:', error);
      return { 
        success: false, 
        error: 'Failed to load save data. File may be corrupted.' 
      };
    }
  }

  /**
   * Get all saved games from localStorage
   * @returns {Array} Array of save metadata
   */
  getAllSaves() {
    try {
      const index = this._getSaveIndex();
      const saves = [];

      for (const saveId in index) {
        try {
          const saveDataStr = localStorage.getItem(saveId);
          if (saveDataStr) {
            const saveData = JSON.parse(saveDataStr);
            const sessionHistory = saveData.gameState?.sessionHistory;
            const historyRounds = Array.isArray(sessionHistory?.blastHistory)
              ? sessionHistory.blastHistory.length
              : null;
            const totalRounds = sessionHistory?.totalRounds
              ?? historyRounds
              ?? saveData.gameState?.metadata?.autoSaveRound
              ?? saveData.gameState?.metadata?.lastCompletedRound
              ?? saveData.gameState?.metadata?.totalBlasts
              ?? saveData.gameState?.blasts?.length
              ?? 0;

            saves.push({
              id: saveId,
              saveName: saveData.saveName,
              timestamp: saveData.timestamp,
              version: saveData.version,
              playerName: saveData.gameState?.playerName || 'Unknown',
              score: saveData.gameState?.score || 0,
              blastCount: totalRounds,
              isCompatible: this._isCompatibleVersion(saveData.version)
            });
          }
        } catch (error) {
          console.warn(`Failed to load save ${saveId}:`, error);
          // Mark as corrupted but still show in list
          saves.push({
            id: saveId,
            saveName: index[saveId]?.saveName || 'Corrupted Save',
            timestamp: index[saveId]?.timestamp || 'Unknown',
            version: 'Unknown',
            playerName: 'Unknown',
            score: 0,
            blastCount: 0,
            isCompatible: false,
            isCorrupted: true
          });
        }
      }

      // Sort by timestamp (newest first)
      saves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return saves;
    } catch (error) {
      console.error('Error getting all saves:', error);
      return [];
    }
  }

  /**
   * Delete a save from localStorage
   * @param {String} saveId - ID of the save to delete
   * @returns {Boolean} Success status
   */
  deleteSave(saveId) {
    try {
      localStorage.removeItem(saveId);
      this._removeSaveFromIndex(saveId);
      console.log('Save deleted successfully:', saveId);
      return true;
    } catch (error) {
      console.error('Error deleting save:', error);
      return false;
    }
  }

  /**
   * Clear all saves from localStorage
   * @returns {Boolean} Success status
   */
  clearAllSaves() {
    try {
      const index = this._getSaveIndex();
      
      for (const saveId in index) {
        localStorage.removeItem(saveId);
      }
      
      localStorage.removeItem(SAVE_INDEX_KEY);
      console.log('All saves cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing all saves:', error);
      return false;
    }
  }

  /**
   * Export save to downloadable JSON file
   * @param {String} saveId - ID of the save to export
   * @returns {Object} Export result
   */
  exportSave(saveId) {
    try {
      const saveDataStr = localStorage.getItem(saveId);
      
      if (!saveDataStr) {
        return { success: false, error: 'Save not found' };
      }

      const saveData = JSON.parse(saveDataStr);
      const dataStr = JSON.stringify(saveData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileName = `blastsim-${saveData.saveName.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();

      return { success: true, fileName: exportFileName };
    } catch (error) {
      console.error('Error exporting save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Import save from JSON file
   * @param {File} file - JSON file to import
   * @returns {Promise<Object>} Import result
   */
  async importSave(file) {
    try {
      const text = await file.text();
      const saveData = JSON.parse(text);
      
      // Validate imported data
      if (!this._validateSaveData(saveData)) {
        return { 
          success: false, 
          error: 'Invalid save file format' 
        };
      }

      // Generate new ID to avoid conflicts
      const newSaveId = `${SAVE_KEY_PREFIX}${Date.now()}`;
      saveData.id = newSaveId;
      
      // Save to localStorage
      localStorage.setItem(newSaveId, JSON.stringify(saveData));
      this._updateSaveIndex(newSaveId, saveData);
      
      console.log('Save imported successfully:', saveData);
      return { 
        success: true, 
        saveId: newSaveId,
        saveName: saveData.saveName 
      };
    } catch (error) {
      console.error('Error importing save:', error);
      return { 
        success: false, 
        error: 'Failed to import save file. File may be corrupted or invalid.' 
      };
    }
  }

  // Private helper methods

  /**
   * Get save index from localStorage
   * @private
   */
  _getSaveIndex() {
    try {
      const indexStr = localStorage.getItem(SAVE_INDEX_KEY);
      return indexStr ? JSON.parse(indexStr) : {};
    } catch (error) {
      console.warn('Failed to load save index:', error);
      return {};
    }
  }

  /**
   * Update save index with new save
   * @private
   */
  _updateSaveIndex(saveId, saveData) {
    const index = this._getSaveIndex();
    index[saveId] = {
      saveName: saveData.saveName,
      timestamp: saveData.timestamp,
      version: saveData.version
    };
    localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
  }

  /**
   * Remove save from index
   * @private
   */
  _removeSaveFromIndex(saveId) {
    const index = this._getSaveIndex();
    delete index[saveId];
    localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
  }

  /**
   * Check if version is compatible
   * @private
   */
  _isCompatibleVersion(version) {
    // For now, only exact version match is compatible
    // Can be extended for backward compatibility
    return version === this.currentVersion;
  }

  /**
   * Check if version can be migrated
   * @private
   */
  _canMigrateVersion(version) {
    // Future: implement version migration logic
    return false;
  }

  /**
   * Validate save data structure
   * @private
   */
  _validateSaveData(saveData) {
    if (!saveData || typeof saveData !== 'object') {
      return false;
    }

    // Check required fields
    const requiredFields = ['version', 'timestamp', 'saveName', 'gameState'];
    const hasAllFields = requiredFields.every(field => field in saveData);

    if (!hasAllFields) {
      return false;
    }

    // Check gameState structure
    const gameState = saveData.gameState;
    if (!gameState || typeof gameState !== 'object') {
      return false;
    }

    // Validate critical gameState fields
    const hasValidState = 
      'playerName' in gameState &&
      'score' in gameState &&
      typeof gameState.score === 'number';

    return hasValidState;
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage statistics
   */
  getStorageInfo() {
    try {
      const saves = this.getAllSaves();
      let totalSize = 0;
      
      saves.forEach(save => {
        const saveDataStr = localStorage.getItem(save.id);
        if (saveDataStr) {
          totalSize += saveDataStr.length;
        }
      });

      return {
        saveCount: saves.length,
        totalSize: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        estimatedLimit: 5120, // ~5MB typical localStorage limit
        usagePercent: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const saveLoadManager = new SaveLoadManager();
export default saveLoadManager;
