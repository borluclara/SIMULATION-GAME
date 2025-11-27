import { getAllOreTypes } from './OreClassification.js';

// Runtime capability detection for persistence backends
const hasWindow = typeof window !== 'undefined';
const hasIndexedDB = hasWindow && typeof window.indexedDB !== 'undefined';
const hasLocalStorage = hasWindow && typeof window.localStorage !== 'undefined';

const PERSISTED_SCORE_LIMIT = 5;
const STORAGE_KEY = 'blastScoreHistory';
const DB_NAME = 'BlastSimulationStorage';
const DB_VERSION = 1;
const STORE_NAME = 'scoreHistory';
const STORE_KEY = 'scores';

/**
 * ScoreStorage.js
 * In-memory storage for blast evaluation scores and history
 * 
 * Purpose: Store and retrieve blast scores for leaderboards, stats, and replay
 * Storage: In-memory array (resets on page reload)
 * Capacity: Last 100 entries (automatically trimmed)
 */

/**
 * Storage structure:
 * - timestamp: Date when score was stored
 * - playerID: String identifier for player (null for anonymous)
 * - blastHash: Unique hash identifying the blast configuration
 * - scoreMetrics: ScoreMetrics object with all evaluation results
 * - blastResult: Optional BlastResult object with detailed ore/waste breakdown
 */
const scoreHistory = [];

/**
 * Maximum number of scores to keep in memory
 */
const MAX_HISTORY_SIZE = 100;

const persistenceLayer = createPersistenceLayer();
let initializationPromise = loadFromPersistence();

function createPersistenceLayer() {
  if (hasIndexedDB) {
    return createIndexedDBLayer();
  }

  if (hasLocalStorage) {
    return createLocalStorageLayer();
  }

  return null;
}

function createIndexedDBLayer() {
  const openDatabase = () => new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });

  const loadScores = async () => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(STORE_KEY);

      request.onsuccess = () => {
        resolve(request.result?.entries || []);
      };

      request.onerror = () => reject(request.error);

      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    });
  };

  const saveScores = async (entries) => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ entries }, STORE_KEY);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };

      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
    });
  };

  return {
    type: 'indexedDB',
    async loadScoresSafe() {
      try {
        return await loadScores();
      } catch (error) {
        console.warn('ScoreStorage: IndexedDB load failed, falling back to in-memory only.', error);
        return [];
      }
    },
    async saveScoresSafe(entries) {
      try {
        await saveScores(entries);
      } catch (error) {
        console.warn('ScoreStorage: IndexedDB save failed, scores will remain in-memory only.', error);
      }
    }
  };
}

function createLocalStorageLayer() {
  return {
    type: 'localStorage',
    async loadScoresSafe() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn('ScoreStorage: localStorage load failed, clearing stored scores.', error);
        window.localStorage.removeItem(STORAGE_KEY);
        return [];
      }
    },
    async saveScoresSafe(entries) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.warn('ScoreStorage: localStorage save failed, continuing in-memory only.', error);
      }
    }
  };
}

async function loadFromPersistence() {
  if (!persistenceLayer) {
    return scoreHistory;
  }

  try {
    const persistedEntries = await persistenceLayer.loadScoresSafe();
    if (Array.isArray(persistedEntries) && persistedEntries.length > 0) {
      mergeScoreHistoryFromPersistence(persistedEntries);
    }
  } catch (error) {
    console.warn('ScoreStorage: Failed to load persisted scores.', error);
  }

  return scoreHistory;
}

function mergeScoreHistoryFromPersistence(entries) {
  const hydrated = entries.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
  }));

  const existingKeys = new Set(scoreHistory.map((entry) => getEntryKey(entry)));
  const combined = [...scoreHistory];

  hydrated.forEach((entry) => {
    const key = getEntryKey(entry);
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      combined.push(entry);
    }
  });

  combined.sort((a, b) => a.timestamp - b.timestamp);

  scoreHistory.length = 0;
  combined.slice(-MAX_HISTORY_SIZE).forEach((entry) => scoreHistory.push(entry));
}

function getEntryKey(entry) {
  if (entry?.blastHash) {
    return entry.blastHash;
  }
  const player = entry?.playerID || 'anon';
  const stamp = entry?.timestamp instanceof Date ? entry.timestamp.toISOString() : String(entry?.timestamp || '');
  return `${player}_${stamp}`;
}

function serializeEntries(entries) {
  return entries.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp
  }));
}

function persistScoreHistory() {
  if (!persistenceLayer) {
    return Promise.resolve();
  }

  const sorted = [...scoreHistory].sort((a, b) => b.timestamp - a.timestamp);
  const limited = sorted.slice(0, PERSISTED_SCORE_LIMIT);
  const serializable = serializeEntries(limited);

  return initializationPromise
    .catch(() => scoreHistory)
    .then(() => persistenceLayer.saveScoresSafe(serializable));
}

/**
 * Store Score
 * Adds a new score entry to the history
 * 
 * @param {string|null} playerID - Player identifier (null for anonymous)
 * @param {object} scoreMetrics - ScoreMetrics object from evaluateBlast()
 * @param {string} blastHash - Unique blast hash from hashBlastData()
 * @param {object} blastResult - Optional BlastResult object with detailed breakdown
 * @returns {number} Index of stored entry
 */
export function storeScore(playerID, scoreMetrics, blastHash, blastResult = null) {
  const entry = {
    timestamp: new Date(),
    playerID: playerID || null,
    blastHash: blastHash,
    scoreMetrics: scoreMetrics,
    blastResult: blastResult
  };

  // Add to history
  scoreHistory.push(entry);

  // Trim to max size (remove oldest entries)
  if (scoreHistory.length > MAX_HISTORY_SIZE) {
    const removeCount = scoreHistory.length - MAX_HISTORY_SIZE;
    scoreHistory.splice(0, removeCount);
  }

  // Persist latest scores asynchronously (best-effort)
  persistScoreHistory();

  // Return index of stored entry
  return scoreHistory.length - 1;
}

/**
 * Get Recent Scores
 * Retrieves the most recent score entries
 * 
 * @param {number} limit - Maximum number of scores to return (default: 10)
 * @param {string|null} playerID - Optional player filter (default: null = all players)
 * @returns {Array} Array of score entries, sorted by timestamp descending
 */
export function getRecentScores(limit = 10, playerID = null) {
  // Filter by player if specified
  let filteredScores = scoreHistory;
  if (playerID !== null) {
    filteredScores = scoreHistory.filter(entry => entry.playerID === playerID);
  }

  // Sort by timestamp descending (newest first)
  const sorted = [...filteredScores].sort((a, b) => b.timestamp - a.timestamp);

  // Limit results
  return sorted.slice(0, limit);
}

/**
 * Get Top Scores
 * Retrieves the highest scoring entries
 * 
 * @param {number} limit - Maximum number of scores to return (default: 10)
 * @returns {Array} Array of score entries, sorted by totalScore descending
 */
export function getTopScores(limit = 10) {
  // Sort by totalScore descending (highest first)
  const sorted = [...scoreHistory].sort((a, b) => {
    return b.scoreMetrics.totalScore - a.scoreMetrics.totalScore;
  });

  // Limit results
  return sorted.slice(0, limit);
}

/**
 * Clear Scores
 * Resets the score history (removes all entries)
 * 
 * @returns {number} Number of entries cleared
 */
export function clearScores() {
  const count = scoreHistory.length;
  scoreHistory.length = 0;  // Clear array efficiently
  persistScoreHistory();
  return count;
}

/**
 * Get Score by Hash
 * Finds a score entry by its blast hash
 * 
 * @param {string} blastHash - Blast hash to search for
 * @returns {object|null} Score entry if found, null otherwise
 */
export function getScoreByHash(blastHash) {
  const entry = scoreHistory.find(entry => entry.blastHash === blastHash);
  return entry || null;
}

/**
 * Get Player Stats
 * Calculates aggregate statistics for a specific player
 * 
 * @param {string} playerID - Player identifier
 * @returns {object|null} Player statistics object or null if no data
 */
export function getPlayerStats(playerID) {
  // Filter scores for this player
  const playerScores = scoreHistory.filter(entry => entry.playerID === playerID);

  // Return null if no data for this player
  if (playerScores.length === 0) {
    return null;
  }

  // Calculate average score
  const totalScore = playerScores.reduce((sum, entry) => sum + entry.scoreMetrics.totalScore, 0);
  const avgScore = totalScore / playerScores.length;

  // Find best score
  const bestScoreEntry = playerScores.reduce((best, entry) => {
    return entry.scoreMetrics.totalScore > best.scoreMetrics.totalScore ? entry : best;
  });
  const bestScore = bestScoreEntry.scoreMetrics.totalScore;

  // Total blasts
  const totalBlasts = playerScores.length;

  // Aggregate ore breakdown (only if blastResult is available)
  const oreBreakdown = {
    totalOresRecovered: 0,
    totalOresLost: 0,
    totalWasteInZone: 0,
    totalValueRecovered: 0,
    byOreType: getAllOreTypes().reduce((acc, oreType) => {
      acc[oreType] = { recovered: 0, lost: 0, displaced: 0 };
      return acc;
    }, {})
  };

  // Sum up ore data from all blasts (if available)
  for (const entry of playerScores) {
    if (entry.blastResult && entry.blastResult.totals) {
      oreBreakdown.totalOresRecovered += entry.blastResult.totals.totalOresRecovered || 0;
      oreBreakdown.totalOresLost += entry.blastResult.totals.totalOresLost || 0;
      oreBreakdown.totalWasteInZone += entry.blastResult.totals.totalWasteInZone || 0;
      oreBreakdown.totalValueRecovered += entry.blastResult.totals.totalValueRecovered || 0;

      // Aggregate by ore type
      if (entry.blastResult.oreBreakdown) {
        for (const oreType of Object.keys(oreBreakdown.byOreType)) {
          const oreData = entry.blastResult.oreBreakdown[oreType];
          if (!oreData) {
            continue;
          }

          oreBreakdown.byOreType[oreType].recovered += oreData.recovered || 0;
          oreBreakdown.byOreType[oreType].lost += oreData.lost || 0;
          oreBreakdown.byOreType[oreType].displaced += oreData.displaced || 0;
        }
      }
    }
  }

  return {
    avgScore: parseFloat(avgScore.toFixed(2)),
    bestScore: bestScore,
    totalBlasts: totalBlasts,
    oreBreakdown: oreBreakdown
  };
}

/**
 * Get Storage Info
 * Returns information about the current storage state
 * 
 * @returns {object} Storage statistics
 */
export function getStorageInfo() {
  return {
    totalEntries: scoreHistory.length,
    maxCapacity: MAX_HISTORY_SIZE,
    utilizationPercent: ((scoreHistory.length / MAX_HISTORY_SIZE) * 100).toFixed(1),
    oldestEntry: scoreHistory.length > 0 ? scoreHistory[0].timestamp : null,
    newestEntry: scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].timestamp : null
  };
}

/**
 * Export Score History (for debugging/testing)
 * Returns a copy of the entire score history
 * 
 * @returns {Array} Copy of scoreHistory array
 */
export function exportScoreHistory() {
  return [...scoreHistory];
}

export function initializeScoreStorage() {
  return initializationPromise;
}

export async function refreshScoreStorage() {
  initializationPromise = loadFromPersistence();
  return initializationPromise;
}
