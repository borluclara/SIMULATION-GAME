# Blast History Tracking - Session Memory Implementation

## Overview
Implemented session-based memory storage for blast performance tracking across multiple rounds. Blast scores and metrics are stored in-memory during active sessions and prepared for future IndexedDB integration.

## Features Implemented

### ✅ Session Memory Store
- **BlastHistoryStore**: Singleton class managing blast records in memory
- **Unique Session IDs**: Each gameplay session gets a unique identifier
- **Round Tracking**: Automatic round numbering for each blast
- **No Data Loss**: Data persists throughout active session until page refresh
- **Structured Data**: Consistent format for all blast records

### ✅ Comprehensive Metrics Tracking
Each blast record stores:
- **Performance**: Recovery %, Dilution %, Efficiency %
- **Materials**: Ores recovered, waste collected, total value
- **Scoring**: Individual blast score, cumulative total score
- **Blast Details**: Blasts used, radius, cells destroyed/affected
- **Material Breakdown**: Count by material type
- **Metadata**: Timestamp, session ID, player name, round number

### ✅ Session Statistics
Real-time calculation of:
- Total rounds completed
- Average recovery rate
- Average dilution rate
- Average efficiency
- Total ores recovered across all rounds
- Total waste collected
- Cumulative value
- Best performing round
- Worst performing round

### ✅ Leaderboard-Ready Data
Prepared data structure for leaderboard:
- Player name
- Session ID
- Total score
- Total rounds
- Average efficiency
- Best round efficiency
- Session duration
- Timestamp

### ✅ IndexedDB Preparation (Sprint 10 Ready)
- Database schema defined
- Import/export methods implemented
- Data structure compatible with IndexedDB
- Migration path documented

## Files Created

### 1. BlastHistoryStore.js
**Location**: `src/utils/BlastHistoryStore.js`

**Purpose**: Core storage and management class

**Key Methods**:
```javascript
// Session Management
initializeSession(playerName)
reset()
clearHistory()

// Data Storage
addBlastRecord(blastData)
getAllRecords()
getRecordByRound(roundNumber)
getRecentRecords(count)

// Statistics
getSessionStats()
getCurrentRound()
getLeaderboardData()

// IndexedDB Preparation
exportSessionData()
importSessionData(sessionData)
getDatabaseSchema()
```

**Data Structure**:
```javascript
{
  sessionId: "session_1699999999999_abc123",
  playerName: "Player1",
  startTime: Date,
  currentRound: 5,
  blastHistory: [
    {
      round: 1,
      timestamp: Date,
      recovery: 75,
      dilution: 15,
      efficiency: 60,
      oresRecovered: 45,
      wasteCollected: 9,
      totalValue: 850,
      score: 450,
      totalScore: 450,
      blastsUsed: 2,
      blastRadius: 5,
      cellsDestroyed: 60,
      cellsAffected: 120,
      materialBreakdown: {
        iron: 20,
        gold: 15,
        stone: 8
      },
      sessionId: "session_...",
      playerName: "Player1"
    }
  ]
}
```

### 2. useBlastHistory.js
**Location**: `src/hooks/useBlastHistory.js`

**Purpose**: React hook for easy access to blast history

**Usage**:
```javascript
const { 
  history, 
  sessionStats, 
  currentRound,
  refresh,
  getLeaderboardData 
} = useBlastHistory();
```

**Features**:
- Reactive state management
- Auto-refresh capability
- Direct access to store methods
- Simplified API for components

## Integration Points

### App.jsx Modifications

#### 1. Import and Initialize
```javascript
import blastHistoryStore from './utils/BlastHistoryStore'

// Initialize on player name change
useEffect(() => {
  if (playerName && playerName.trim().length > 0) {
    blastHistoryStore.initializeSession(playerName);
  }
}, [playerName]);
```

#### 2. Save Blast Records
```javascript
const handleTriggerBlasts = async (result) => {
  // ... calculate metrics ...
  
  const blastRecord = blastHistoryStore.addBlastRecord({
    recovery,
    dilution,
    efficiency,
    oresRecovered,
    wasteCollected,
    totalValue,
    score: scoreIncrease,
    totalScore: score + scoreIncrease,
    blastsUsed: result.blasts.length,
    blastRadius: result.blastRadius,
    cellsDestroyed: materialsDestroyed,
    cellsAffected: result.affectedCells?.length,
    materialBreakdown
  });
}
```

#### 3. Clear on Reset
```javascript
const handleResetSimulation = async () => {
  // ... reset logic ...
  blastHistoryStore.clearHistory();
}
```

### BlastFeedback.jsx Modifications

#### 1. Display Round Number
```javascript
import blastHistoryStore from '../utils/BlastHistoryStore';

const [currentRound, setCurrentRound] = useState(0);
const [sessionStats, setSessionStats] = useState(null);

useEffect(() => {
  if (isVisible) {
    setCurrentRound(blastHistoryStore.getCurrentRound());
    setSessionStats(blastHistoryStore.getSessionStats());
  }
}, [isVisible]);
```

#### 2. Show Session Statistics
```html
<span className="round-badge">Round {currentRound}</span>

{sessionStats && sessionStats.totalRounds > 1 && (
  <>
    <h4>Session Statistics</h4>
    <div>Total Rounds: {sessionStats.totalRounds}</div>
    <div>Average Recovery: {sessionStats.averageRecovery}%</div>
    <div>Best Round: Round {sessionStats.bestRound?.round}</div>
  </>
)}
```

## Usage Examples

### Getting Session Data
```javascript
// Get all records
const allRecords = blastHistoryStore.getAllRecords();

// Get specific round
const round3 = blastHistoryStore.getRecordByRound(3);

// Get last 5 rounds
const recent = blastHistoryStore.getRecentRecords(5);

// Get session stats
const stats = blastHistoryStore.getSessionStats();
console.log(`Average efficiency: ${stats.averageEfficiency}%`);
console.log(`Best round: ${stats.bestRound.round}`);
```

### Exporting Session
```javascript
// Export for download or storage
const sessionData = blastHistoryStore.exportSessionData();

// Convert to JSON
const json = JSON.stringify(sessionData, null, 2);

// Download or save to IndexedDB
```

### Leaderboard Integration
```javascript
// Get formatted data for leaderboard
const leaderboardEntry = blastHistoryStore.getLeaderboardData();

// Structure:
{
  playerName: "Player1",
  sessionId: "session_...",
  totalScore: 2500,
  totalRounds: 10,
  averageEfficiency: 68,
  totalOresRecovered: 450,
  bestRoundEfficiency: 92,
  sessionDuration: 900000, // milliseconds
  timestamp: Date
}
```

## Performance Considerations

### Memory Management
- **In-Memory Storage**: Fast access, no I/O operations
- **Array-Based**: O(n) for most operations, acceptable for session data
- **Cleanup**: History cleared on reset, preventing memory bloat
- **Session Scope**: Data tied to browser tab/session

### Scalability
- **Current Limit**: No hard limit, practical limit ~1000 rounds
- **Typical Usage**: 10-50 rounds per session
- **Memory Footprint**: ~1-2 KB per record
- **Migration Path**: Ready for IndexedDB when needed

## IndexedDB Migration Plan (Sprint 10)

### Database Schema
```javascript
{
  storeName: 'blastHistory',
  keyPath: 'sessionId',
  indexes: [
    { name: 'playerName', keyPath: 'playerName', unique: false },
    { name: 'timestamp', keyPath: 'startTime', unique: false },
    { name: 'totalScore', keyPath: 'blastHistory[-1].totalScore', unique: false }
  ],
  version: 1
}
```

### Migration Steps
1. Create IndexedDB wrapper
2. Import `getDatabaseSchema()` from BlastHistoryStore
3. Replace `addBlastRecord()` to write to both memory and DB
4. Add persistence toggle in settings
5. Implement session recovery on page refresh
6. Add data export/import UI

### Data Persistence Flow
```
Memory (Current) → IndexedDB (Sprint 10) → Cloud Backup (Future)
```

## Testing Checklist

- [x] Session initializes with player name
- [x] Round numbers increment correctly
- [x] Blast records saved with all metrics
- [x] Session stats calculate correctly
- [x] History clears on reset
- [x] Round badge displays in feedback
- [x] Session stats show after multiple rounds
- [x] No data loss during active session
- [x] Export/import functions work
- [x] Leaderboard data format correct

## Acceptance Criteria Status

✅ **Scores stored locally in memory per round**
- BlastHistoryStore manages in-memory array
- Each blast automatically saved with round number
- Complete metrics tracked per round

✅ **No data lost while the session is active**
- Singleton pattern ensures single store instance
- Data persists across component re-renders
- Only cleared on explicit reset or page refresh

✅ **Data accessible for leaderboard integration later**
- `getLeaderboardData()` method provides formatted data
- Session statistics readily available
- Export/import ready for database migration

## Future Enhancements

### Sprint 10 - Persistence
- IndexedDB integration
- Session recovery after page refresh
- Cross-tab data synchronization
- Data export to JSON/CSV

### Future Sprints
- Cloud synchronization
- Historical session comparison
- Performance trend graphs
- Achievement tracking based on history
- AI-powered blast recommendations
- Replay system using historical data

## API Reference

### BlastHistoryStore

#### Session Management
- `initializeSession(playerName)` - Start new session
- `reset()` - Reset entire store
- `clearHistory()` - Clear blast history, keep session

#### Data Access
- `addBlastRecord(blastData)` - Add new blast record
- `getAllRecords()` - Get all blast records
- `getRecordByRound(roundNumber)` - Get specific round
- `getRecentRecords(count)` - Get last N records
- `getCurrentRound()` - Get current round number

#### Statistics
- `getSessionStats()` - Get comprehensive session statistics
- `getLeaderboardData()` - Get leaderboard-formatted data

#### Export/Import
- `exportSessionData()` - Export full session
- `importSessionData(data)` - Import session data
- `getDatabaseSchema()` - Get IndexedDB schema

### useBlastHistory Hook

#### State
- `history` - Array of all blast records
- `sessionStats` - Session statistics object
- `currentRound` - Current round number

#### Methods
- `refresh()` - Force refresh state
- All BlastHistoryStore methods available
- `store` - Direct access to store instance

## Console Logging

The system logs important events:
- `📊 BlastHistoryStore: Session initialized` - Session started
- `✅ BlastHistoryStore: Record added` - Blast saved
- `🗑️ BlastHistoryStore: History cleared` - History cleared
- `🔄 BlastHistoryStore: Store reset` - Store reset
- `📥 BlastHistoryStore: Session data imported` - Data imported

## Conclusion

The blast history tracking system successfully implements session-based memory storage with comprehensive metrics tracking. All data is stored in-memory during active sessions and is ready for leaderboard integration. The system is architecturally prepared for IndexedDB migration in Sprint 10, ensuring no code rewrites will be needed.

Players can now track their progress across multiple rounds, view session statistics, and see their performance improve over time. The round badge and session stats in the feedback modal provide immediate context and motivation for continued play.
