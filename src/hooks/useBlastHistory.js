/**
 * useBlastHistory Hook
 * 
 * React hook to access blast history store
 * Provides easy access to blast records and session statistics
 */

import { useState, useEffect, useCallback } from 'react';
import blastHistoryStore from '../utils/BlastHistoryStore';
import {
  getRecentScores,
  refreshScoreStorage,
  clearPersistentScoreStorage
} from '../utils/ScoreStorage';

export const useBlastHistory = () => {
  const [history, setHistory] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);

  // Force update by creating a refresh function
  const refresh = useCallback(async () => {
    try {
      await refreshScoreStorage();
    } catch (error) {
      console.warn('Leaderboard: failed to load persisted scores, using in-memory snapshot.', error);
    } finally {
      setHistory(getRecentScores(50));
      setSessionStats(blastHistoryStore.getSessionStats());
      setCurrentRound(blastHistoryStore.getCurrentRound());
    }
  }, []);

  const clearLeaderboardStorage = useCallback(async () => {
    blastHistoryStore.clearHistory();
    await clearPersistentScoreStorage();
    setHistory([]);
    refresh();
  }, [refresh]);

  useEffect(() => {
    // Initial load
    refresh();
  }, [refresh]);

  return {
    // Data
    history,
    sessionStats,
    currentRound,
    
    // Methods
    refresh,
    getAllRecords: () => blastHistoryStore.getAllRecords(),
    getRecordByRound: (round) => blastHistoryStore.getRecordByRound(round),
    getRecentRecords: (count) => blastHistoryStore.getRecentRecords(count),
    getSessionStats: () => blastHistoryStore.getSessionStats(),
    getCurrentRound: () => blastHistoryStore.getCurrentRound(),
    getLeaderboardData: () => blastHistoryStore.getLeaderboardData(),
    exportSessionData: () => blastHistoryStore.exportSessionData(),
    
    // Store instance (for advanced usage)
    store: {
      ...blastHistoryStore,
      clearHistory: clearLeaderboardStorage
    },
    clearLeaderboardStorage
  };
};

export default useBlastHistory;
