/**
 * BlastHistoryStore
 * 
 * In-memory storage for blast history across multiple rounds.
 * Tracks each blast's performance metrics for session-based analysis.
 * Designed for easy migration to IndexedDB in Sprint 10.
 * 
 * Data Structure:
 * {
 *   sessionId: string,
 *   playerName: string,
 *   startTime: Date,
 *   blastHistory: [
 *     {
 *       round: number,
 *       timestamp: Date,
 *       recovery: number,
 *       dilution: number,
 *       efficiency: number,
 *       oresRecovered: number,
 *       wasteCollected: number,
 *       totalValue: number,
 *       score: number,
 *       totalScore: number,
 *       blastsUsed: number,
 *       blastRadius: number,
 *       cellsDestroyed: number,
 *       cellsAffected: number
 *     }
 *   ]
 * }
 */

class BlastHistoryStore {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.playerName = '';
    this.startTime = new Date();
    this.blastHistory = [];
    this.currentRound = 0;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize new session with player name
   */
  initializeSession(playerName) {
    this.sessionId = this.generateSessionId();
    this.playerName = playerName;
    this.startTime = new Date();
    this.blastHistory = [];
    this.currentRound = 0;
    
    console.log('📊 BlastHistoryStore: Session initialized', {
      sessionId: this.sessionId,
      playerName: this.playerName,
      startTime: this.startTime
    });
  }

  /**
   * Add a blast record to history
   * 
   * @param {Object} blastData - Blast performance data
   * @returns {Object} - The created blast record
   */
  addBlastRecord(blastData) {
    this.currentRound++;
    
    const record = {
      round: this.currentRound,
      timestamp: new Date(),
      
      // Performance metrics
      recovery: blastData.recovery || 0,
      dilution: blastData.dilution || 0,
      efficiency: blastData.efficiency || 0,
      
      // Material counts
      oresRecovered: blastData.oresRecovered || 0,
      wasteCollected: blastData.wasteCollected || 0,
      totalValue: blastData.totalValue || 0,
      
      // Scoring
      score: blastData.score || 0,
      totalScore: blastData.totalScore || 0,
      
      // Blast details
      blastsUsed: blastData.blastsUsed || 0,
      blastRadius: blastData.blastRadius || 0,
      cellsDestroyed: blastData.cellsDestroyed || 0,
      cellsAffected: blastData.cellsAffected || 0,
      
      // Material breakdown (optional)
      materialBreakdown: blastData.materialBreakdown || null,
      
      // Session metadata
      sessionId: this.sessionId,
      playerName: this.playerName
    };
    
    this.blastHistory.push(record);
    
    console.log('✅ BlastHistoryStore: Record added', {
      round: record.round,
      recovery: record.recovery,
      score: record.score,
      totalScore: record.totalScore
    });
    
    return record;
  }

  /**
   * Get all blast records for current session
   */
  getAllRecords() {
    return [...this.blastHistory];
  }

  /**
   * Get specific blast record by round number
   */
  getRecordByRound(roundNumber) {
    return this.blastHistory.find(record => record.round === roundNumber);
  }

  /**
   * Get last N blast records
   */
  getRecentRecords(count = 5) {
    return this.blastHistory.slice(-count);
  }

  /**
   * Get current round number
   */
  getCurrentRound() {
    return this.currentRound;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    if (this.blastHistory.length === 0) {
      return {
        totalRounds: 0,
        averageRecovery: 0,
        averageDilution: 0,
        averageEfficiency: 0,
        totalOresRecovered: 0,
        totalWasteCollected: 0,
        totalValue: 0,
        totalScore: 0,
        bestRound: null,
        worstRound: null
      };
    }

    const totalRounds = this.blastHistory.length;
    const lastRecord = this.blastHistory[this.blastHistory.length - 1];
    
    // Calculate averages
    const averageRecovery = this.blastHistory.reduce((sum, r) => sum + r.recovery, 0) / totalRounds;
    const averageDilution = this.blastHistory.reduce((sum, r) => sum + r.dilution, 0) / totalRounds;
    const averageEfficiency = this.blastHistory.reduce((sum, r) => sum + r.efficiency, 0) / totalRounds;
    
    // Calculate totals
    const totalOresRecovered = this.blastHistory.reduce((sum, r) => sum + r.oresRecovered, 0);
    const totalWasteCollected = this.blastHistory.reduce((sum, r) => sum + r.wasteCollected, 0);
    const totalValue = this.blastHistory.reduce((sum, r) => sum + r.totalValue, 0);
    
    // Find best and worst rounds
    const bestRound = this.blastHistory.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    );
    const worstRound = this.blastHistory.reduce((worst, current) => 
      current.efficiency < worst.efficiency ? current : worst
    );

    return {
      totalRounds,
      averageRecovery: Math.round(averageRecovery),
      averageDilution: Math.round(averageDilution),
      averageEfficiency: Math.round(averageEfficiency),
      totalOresRecovered,
      totalWasteCollected,
      totalValue,
      totalScore: lastRecord.totalScore,
      bestRound: {
        round: bestRound.round,
        efficiency: bestRound.efficiency,
        recovery: bestRound.recovery
      },
      worstRound: {
        round: worstRound.round,
        efficiency: worstRound.efficiency,
        recovery: worstRound.recovery
      }
    };
  }

  /**
   * Clear all blast history (for reset)
   */
  clearHistory() {
    this.blastHistory = [];
    this.currentRound = 0;
    console.log('🗑️ BlastHistoryStore: History cleared');
  }

  /**
   * Reset entire store (new session)
   */
  reset() {
    this.sessionId = this.generateSessionId();
    this.playerName = '';
    this.startTime = new Date();
    this.blastHistory = [];
    this.currentRound = 0;
    console.log('🔄 BlastHistoryStore: Store reset');
  }

  /**
   * Export session data (for IndexedDB migration or download)
   */
  exportSessionData() {
    return {
      sessionId: this.sessionId,
      playerName: this.playerName,
      startTime: this.startTime,
      endTime: new Date(),
      totalRounds: this.currentRound,
      blastHistory: this.getAllRecords(),
      sessionStats: this.getSessionStats()
    };
  }

  /**
   * Import session data (for IndexedDB restoration)
   */
  importSessionData(sessionData) {
    if (!sessionData || !sessionData.blastHistory) {
      console.error('❌ BlastHistoryStore: Invalid session data');
      return false;
    }

    this.sessionId = sessionData.sessionId || this.generateSessionId();
    this.playerName = sessionData.playerName || '';
    this.startTime = new Date(sessionData.startTime) || new Date();
    this.blastHistory = sessionData.blastHistory || [];
    this.currentRound = sessionData.totalRounds || this.blastHistory.length;

    console.log('📥 BlastHistoryStore: Session data imported', {
      sessionId: this.sessionId,
      rounds: this.currentRound
    });

    return true;
  }

  /**
   * Get data for leaderboard integration
   */
  getLeaderboardData() {
    const stats = this.getSessionStats();
    return {
      playerName: this.playerName,
      sessionId: this.sessionId,
      totalScore: stats.totalScore,
      totalRounds: stats.totalRounds,
      averageEfficiency: stats.averageEfficiency,
      totalOresRecovered: stats.totalOresRecovered,
      bestRoundEfficiency: stats.bestRound?.efficiency || 0,
      sessionDuration: new Date() - this.startTime,
      timestamp: new Date()
    };
  }

  /**
   * Prepare for IndexedDB migration (Sprint 10)
   * This structure will be used for database schema
   */
  getDatabaseSchema() {
    return {
      storeName: 'blastHistory',
      keyPath: 'sessionId',
      indexes: [
        { name: 'playerName', keyPath: 'playerName', unique: false },
        { name: 'timestamp', keyPath: 'startTime', unique: false },
        { name: 'totalScore', keyPath: 'blastHistory[-1].totalScore', unique: false }
      ],
      version: 1
    };
  }
}

// Create singleton instance
const blastHistoryStore = new BlastHistoryStore();

export default blastHistoryStore;
export { BlastHistoryStore };
