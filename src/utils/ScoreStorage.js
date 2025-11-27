import { getAllOreTypes } from './OreClassification.js';

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
