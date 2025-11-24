/**
 * SimulationStorage - Advanced simulation state persistence
 * Uses IndexedDB with localStorage fallback for robust data storage
 * Features: Auto-cleanup, performance optimization, compression
 */

class SimulationStorage {
  constructor() {
    this.dbName = 'BlastSimDB';
    this.dbVersion = 1;
    this.storeName = 'simulations';
    this.maxSaves = 10; // Maximum number of saves to retain
    this.db = null;
    this.isIndexedDBSupported = this.checkIndexedDBSupport();
  }

  /**
   * Check if IndexedDB is supported
   */
  checkIndexedDBSupport() {
    return 'indexedDB' in window && indexedDB !== null;
  }

  /**
   * Initialize the database
   */
  async init() {
    if (this.isIndexedDBSupported) {
      return this.initIndexedDB();
    } else {
      console.warn('IndexedDB not supported, using localStorage fallback');
      return true;
    }
  }

  /**
   * Initialize IndexedDB
   */
  initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create simulations store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: false 
          });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('playerName', 'playerName', { unique: false });
        }
      };
    });
  }

  /**
   * Define the simulation state schema
   */
  createSimulationState(gameData) {
    const timestamp = Date.now();
    const simulationId = `sim_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: simulationId,
      timestamp,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      
      // Player Information
      player: {
        name: gameData.playerName || 'Anonymous',
        score: gameData.score || 0
      },

      // Scenario Data
      scenario: {
        name: gameData.currentScenario?.fileName || 'Unknown Scenario',
        data: gameData.currentScenario?.data || null,
        grid: this.compressGridData(gameData.oreGrid),
        originalCsvData: gameData.originalCsvData || null
      },

      // Blast Information
      blasts: {
        history: gameData.blasts || [],
        placements: gameData.blastPlacements || [],
        currentPower: gameData.blastPower || 500,
        currentDirection: gameData.blastDirection || 180
      },

      // Simulation Settings
      settings: {
        mineralRecovery: gameData.mineralRecovery || 100,
        dilution: gameData.dilution || 0,
        gameMode: gameData.gameMode || 'standard'
      },

      // Game Progress
      progress: {
        currentView: gameData.currentView || 'game',
        simulationResults: gameData.simulationResults || null,
        isComplete: gameData.isComplete || false
      },

      // Metadata
      metadata: {
        gridSize: this.calculateGridSize(gameData.oreGrid),
        totalBlasts: (gameData.blasts || []).length,
        saveReason: gameData.saveReason || 'manual',
        autoSaveRound: gameData.autoSaveRound || null,
        autoSaveLabel: gameData.autoSaveLabel || null
      }
    };
  }

  /**
   * Compress grid data to reduce storage size
   */
  compressGridData(grid) {
    if (!grid) return null;
    
    try {
      // For large grids, store only essential data
      if (grid.data && Array.isArray(grid.data)) {
        return {
          width: grid.width,
          height: grid.height,
          data: grid.data.map(block => ({
            x: block.x,
            y: block.y,
            material: block.material,
            type: block.type,
            value: block.value || block.game_value,
            hardness: block.hardness || block.hardness_mohs,
            density: block.density || block.density_g_cm3,
            // Only store essential visual properties
            isBlasted: block.isBlasted || false,
            isDisplaced: block.isDisplaced || false
          }))
        };
      }
      return grid;
    } catch (error) {
      console.error('Error compressing grid data:', error);
      return grid;
    }
  }

  /**
   * Calculate grid size for metadata
   */
  calculateGridSize(grid) {
    if (!grid) return { width: 0, height: 0, totalBlocks: 0 };
    
    return {
      width: grid.width || 0,
      height: grid.height || 0,
      totalBlocks: (grid.data && Array.isArray(grid.data)) ? grid.data.length : 0
    };
  }

  /**
   * Save simulation state
   */
  async saveSimulation(gameData, customName = null) {
    try {
      await this.init();
      
      const simulationState = this.createSimulationState(gameData);
      
      // Add custom name if provided
      if (customName) {
        simulationState.customName = customName;
      }

      if (this.isIndexedDBSupported && this.db) {
        await this.saveToIndexedDB(simulationState);
      } else {
        await this.saveToLocalStorage(simulationState);
      }

      // Auto-cleanup old saves
      await this.cleanupOldSaves();
      await this.pruneAutoSaves();

      return {
        success: true,
        simulationId: simulationState.id,
        timestamp: simulationState.timestamp,
        message: 'Simulation saved successfully!'
      };

    } catch (error) {
      console.error('Error saving simulation:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to save simulation'
      };
    }
  }

  /**
   * Ensure only the most recent auto-saves are retained
   */
  async pruneAutoSaves(limit = 3) {
    try {
      const allSimulations = await this.getAllSimulations();
      const autoSaves = allSimulations.filter(sim => sim.metadata?.saveReason === 'auto');

      if (autoSaves.length > limit) {
        const sortedAuto = autoSaves.sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = sortedAuto.slice(limit);

        for (const sim of toDelete) {
          await this.deleteSimulation(sim.id);
        }

        if (toDelete.length > 0) {
          console.log(`Pruned ${toDelete.length} auto-saves (limit ${limit})`);
        }
      }
    } catch (error) {
      console.error('Error pruning auto-saves:', error);
    }
  }

  /**
   * Save to IndexedDB
   */
  saveToIndexedDB(simulationState) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(simulationState);

      request.onsuccess = () => resolve(simulationState.id);
      request.onerror = () => reject(new Error('Failed to save to IndexedDB'));
    });
  }

  /**
   * Save to localStorage fallback
   */
  async saveToLocalStorage(simulationState) {
    try {
      const storageKey = `blastsim_saves`;
      const existingSaves = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      existingSaves.push(simulationState);
      
      // Sort by timestamp (newest first)
      existingSaves.sort((a, b) => b.timestamp - a.timestamp);
      
      localStorage.setItem(storageKey, JSON.stringify(existingSaves));
      return simulationState.id;
    } catch (error) {
      throw new Error('Failed to save to localStorage: ' + error.message);
    }
  }

  /**
   * Get all saved simulations
   */
  async getAllSimulations() {
    try {
      await this.init();

      if (this.isIndexedDBSupported && this.db) {
        return this.getAllFromIndexedDB();
      } else {
        return this.getAllFromLocalStorage();
      }
    } catch (error) {
      console.error('Error getting simulations:', error);
      return [];
    }
  }

  /**
   * Get all simulations from IndexedDB
   */
  getAllFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const simulations = request.result || [];
        // Sort by timestamp (newest first)
        simulations.sort((a, b) => b.timestamp - a.timestamp);
        resolve(simulations);
      };

      request.onerror = () => reject(new Error('Failed to retrieve from IndexedDB'));
    });
  }

  /**
   * Get all simulations from localStorage
   */
  getAllFromLocalStorage() {
    try {
      const storageKey = `blastsim_saves`;
      const saves = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return saves.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  /**
   * Load specific simulation
   */
  async loadSimulation(simulationId) {
    try {
      await this.init();

      if (this.isIndexedDBSupported && this.db) {
        return this.loadFromIndexedDB(simulationId);
      } else {
        return this.loadFromLocalStorage(simulationId);
      }
    } catch (error) {
      console.error('Error loading simulation:', error);
      throw new Error('Failed to load simulation');
    }
  }

  /**
   * Load from IndexedDB
   */
  loadFromIndexedDB(simulationId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(simulationId);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error('Simulation not found'));
        }
      };

      request.onerror = () => reject(new Error('Failed to load from IndexedDB'));
    });
  }

  /**
   * Load from localStorage
   */
  loadFromLocalStorage(simulationId) {
    try {
      const storageKey = `blastsim_saves`;
      const saves = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const simulation = saves.find(save => save.id === simulationId);
      
      if (!simulation) {
        throw new Error('Simulation not found');
      }
      
      return simulation;
    } catch (error) {
      throw new Error('Failed to load from localStorage: ' + error.message);
    }
  }

  /**
   * Delete simulation
   */
  async deleteSimulation(simulationId) {
    try {
      await this.init();

      if (this.isIndexedDBSupported && this.db) {
        return this.deleteFromIndexedDB(simulationId);
      } else {
        return this.deleteFromLocalStorage(simulationId);
      }
    } catch (error) {
      console.error('Error deleting simulation:', error);
      throw new Error('Failed to delete simulation');
    }
  }

  /**
   * Delete from IndexedDB
   */
  deleteFromIndexedDB(simulationId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(simulationId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error('Failed to delete from IndexedDB'));
    });
  }

  /**
   * Delete from localStorage
   */
  deleteFromLocalStorage(simulationId) {
    try {
      const storageKey = `blastsim_saves`;
      const saves = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedSaves = saves.filter(save => save.id !== simulationId);
      
      localStorage.setItem(storageKey, JSON.stringify(updatedSaves));
      return true;
    } catch (error) {
      throw new Error('Failed to delete from localStorage: ' + error.message);
    }
  }

  /**
   * Auto-cleanup old saves beyond the limit
   */
  async cleanupOldSaves() {
    try {
      const allSimulations = await this.getAllSimulations();
      
      if (allSimulations.length > this.maxSaves) {
        // Sort by timestamp and keep only the most recent
        const sortedSims = allSimulations.sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = sortedSims.slice(this.maxSaves);
        
        // Delete old simulations
        for (const sim of toDelete) {
          await this.deleteSimulation(sim.id);
        }
        
        console.log(`Cleaned up ${toDelete.length} old simulation saves`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const allSimulations = await this.getAllSimulations();
      const totalSize = JSON.stringify(allSimulations).length;
      
      return {
        totalSaves: allSimulations.length,
        maxSaves: this.maxSaves,
        storageType: this.isIndexedDBSupported ? 'IndexedDB' : 'localStorage',
        approximateSize: this.formatBytes(totalSize),
        oldestSave: allSimulations.length > 0 ? 
          new Date(Math.min(...allSimulations.map(s => s.timestamp))) : null,
        newestSave: allSimulations.length > 0 ? 
          new Date(Math.max(...allSimulations.map(s => s.timestamp))) : null
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export default new SimulationStorage();