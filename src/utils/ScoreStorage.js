import { getAllOreTypes } from './OreClassification.js';

const hasWindow = typeof window !== 'undefined';
const hasIndexedDB = hasWindow && typeof window.indexedDB !== 'undefined';
const hasLocalStorage = hasWindow && typeof window.localStorage !== 'undefined';

const STORAGE_KEY = 'blastScoreHistory';
const LOCAL_STORAGE_KEY = STORAGE_KEY;
const DB_NAME = 'BlastLeaderboard';
const LEGACY_DB_NAME = 'BlastSimulationStorage';
const DB_VERSION = 1;
const STORE_NAME = 'scoreHistory';
const STORE_KEY = 'scores';
const PERSISTED_SCORE_LIMIT = 50;
const MAX_HISTORY_SIZE = 100;

const scoreHistory = [];
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
  const openDatabase = (name) => new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(name, DB_VERSION);

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

  const getDatabase = async () => {
    try {
      return await openDatabase(DB_NAME);
    } catch (primaryError) {
      if (LEGACY_DB_NAME && LEGACY_DB_NAME !== DB_NAME) {
        console.warn('ScoreStorage: primary IndexedDB unavailable, using legacy store.', primaryError);
        return openDatabase(LEGACY_DB_NAME);
      }
      throw primaryError;
    }
  };

  const loadScoresSafe = async () => {
    try {
      const db = await getDatabase();

      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(STORE_KEY);

        request.onsuccess = () => resolve(request.result?.entries || []);
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          const error = tx.error || new Error('IndexedDB read failed');
          db.close();
          reject(error);
        };
      });
    } catch (error) {
      console.warn('ScoreStorage: IndexedDB load failed, continuing in-memory only.', error);
      return [];
    }
  };

  const saveScoresSafe = async (entries) => {
    try {
      const db = await getDatabase();

      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ entries }, STORE_KEY);

        tx.oncomplete = () => {
          db.close();
          resolve();
        };

        tx.onerror = () => {
          const error = tx.error || new Error('IndexedDB write failed');
          db.close();
          reject(error);
        };
      });
    } catch (error) {
      console.warn('ScoreStorage: IndexedDB save failed, scores will remain in-memory only.', error);
    }
  };

  const clearScoresSafe = async () => {
    try {
      const db = await getDatabase();

      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(STORE_KEY);

        tx.oncomplete = () => {
          db.close();
          resolve();
        };

        tx.onerror = () => {
          const error = tx.error || new Error('IndexedDB delete failed');
          db.close();
          reject(error);
        };
      });
    } catch (error) {
      console.warn('ScoreStorage: IndexedDB clear failed.', error);
    }
  };

  return {
    type: 'indexedDB',
    loadScoresSafe,
    saveScoresSafe,
    clearScoresSafe
  };
}

function createLocalStorageLayer() {
  return {
    type: 'localStorage',
    async loadScoresSafe() {
      try {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn('ScoreStorage: localStorage load failed, clearing stored scores.', error);
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        if (LOCAL_STORAGE_KEY !== STORAGE_KEY) {
          window.localStorage.removeItem(STORAGE_KEY);
        }
        return [];
      }
    },
    async saveScoresSafe(entries) {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.warn('ScoreStorage: localStorage save failed, continuing in-memory only.', error);
      }
    },
    async clearScoresSafe() {
      try {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
        if (LOCAL_STORAGE_KEY !== STORAGE_KEY) {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.warn('ScoreStorage: unable to clear localStorage payload.', error);
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
    timestamp: entry?.timestamp ? new Date(entry.timestamp) : new Date()
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
  const payload = serializeEntries(limited);

  return initializationPromise
    .catch(() => undefined)
    .then(() => persistenceLayer.saveScoresSafe(payload));
}

export function initializeScoreStorage() {
  return initializationPromise;
}

export function refreshScoreStorage() {
  initializationPromise = loadFromPersistence();
  return initializationPromise;
}

export async function clearPersistentScoreStorage() {
  scoreHistory.length = 0;
  if (persistenceLayer?.clearScoresSafe) {
    try {
      await persistenceLayer.clearScoresSafe();
    } catch (error) {
      console.warn('ScoreStorage: Failed to clear persisted data.', error);
    }
  } else if (hasLocalStorage) {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      if (LOCAL_STORAGE_KEY !== STORAGE_KEY) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('ScoreStorage: unable to clear localStorage payload.', error);
    }
  }

  initializationPromise = Promise.resolve(scoreHistory);
}

export function storeScore(playerID, scoreMetrics, blastHash, blastResult = null) {
  const entry = {
    timestamp: new Date(),
    playerID: playerID || null,
    blastHash: blastHash,
    scoreMetrics: scoreMetrics,
    blastResult: blastResult
  };

  scoreHistory.push(entry);

  if (scoreHistory.length > MAX_HISTORY_SIZE) {
    const removeCount = scoreHistory.length - MAX_HISTORY_SIZE;
    scoreHistory.splice(0, removeCount);
  }

  persistScoreHistory();

  return scoreHistory.length - 1;
}

export function getRecentScores(limit = 10, playerID = null) {
  let filteredScores = scoreHistory;
  if (playerID !== null) {
    filteredScores = scoreHistory.filter(entry => entry.playerID === playerID);
  }

  const sorted = [...filteredScores].sort((a, b) => b.timestamp - a.timestamp);
  return sorted.slice(0, limit);
}

export function getTopScores(limit = 10) {
  const sorted = [...scoreHistory].sort((a, b) => {
    return b.scoreMetrics.totalScore - a.scoreMetrics.totalScore;
  });

  return sorted.slice(0, limit);
}

export function clearScores() {
  const count = scoreHistory.length;
  scoreHistory.length = 0;
  persistScoreHistory();
  return count;
}

export function getScoreByHash(blastHash) {
  const entry = scoreHistory.find(entry => entry.blastHash === blastHash);
  return entry || null;
}

export function getPlayerStats(playerID) {
  const playerScores = scoreHistory.filter(entry => entry.playerID === playerID);

  if (playerScores.length === 0) {
    return null;
  }

  const totalScore = playerScores.reduce((sum, entry) => sum + entry.scoreMetrics.totalScore, 0);
  const avgScore = totalScore / playerScores.length;

  const bestScoreEntry = playerScores.reduce((best, entry) => {
    return entry.scoreMetrics.totalScore > best.scoreMetrics.totalScore ? entry : best;
  });
  const bestScore = bestScoreEntry.scoreMetrics.totalScore;

  const totalBlasts = playerScores.length;

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

  for (const entry of playerScores) {
    if (entry.blastResult && entry.blastResult.totals) {
      oreBreakdown.totalOresRecovered += entry.blastResult.totals.totalOresRecovered || 0;
      oreBreakdown.totalOresLost += entry.blastResult.totals.totalOresLost || 0;
      oreBreakdown.totalWasteInZone += entry.blastResult.totals.totalWasteInZone || 0;
      oreBreakdown.totalValueRecovered += entry.blastResult.totals.totalValueRecovered || 0;

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

export function getStorageInfo() {
  return {
    totalEntries: scoreHistory.length,
    maxCapacity: MAX_HISTORY_SIZE,
    utilizationPercent: ((scoreHistory.length / MAX_HISTORY_SIZE) * 100).toFixed(1),
    oldestEntry: scoreHistory.length > 0 ? scoreHistory[0].timestamp : null,
    newestEntry: scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1].timestamp : null
  };
}

export function exportScoreHistory() {
  return [...scoreHistory];
}
