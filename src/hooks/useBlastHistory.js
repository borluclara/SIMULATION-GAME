/**
 * useBlastHistory Hook
 * 
 * React hook to access blast history store
 * Provides easy access to blast records and session statistics
 */

import { useState, useEffect } from 'react';
import blastHistoryStore from '../utils/BlastHistoryStore';

export const useBlastHistory = () => {
  const [history, setHistory] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);

  // Force update by creating a refresh function
  const refresh = () => {
    setHistory(blastHistoryStore.getAllRecords());
    setSessionStats(blastHistoryStore.getSessionStats());
    setCurrentRound(blastHistoryStore.getCurrentRound());
  };

  useEffect(() => {
    // Initial load
    refresh();
  }, []);

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
    store: blastHistoryStore
  };
};

export default useBlastHistory;
