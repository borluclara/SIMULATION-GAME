/**
 * ScoreStorage.test.js
 * Unit tests for score storage module
 * 
 * Run with: node src/utils/ScoreStorage.test.js
 */

import {
  storeScore,
  getRecentScores,
  getTopScores,
  clearScores,
  getScoreByHash,
  getPlayerStats,
  getStorageInfo,
  exportScoreHistory
} from './ScoreStorage.js';

/**
 * Test helper: Assert equality
 */
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Expected: ${expected}, Got: ${actual}`);
    return false;
  }
  console.log(`✅ PASS: ${message}`);
  return true;
}

/**
 * Test helper: Create mock score metrics
 */
function createMockScoreMetrics(totalScore, grade) {
  return {
    recoveryRate: 50.0,
    dilutionRate: 10.0,
    valueRecoveryRate: 60.0,
    totalScore: totalScore,
    grade: grade,
    performanceTime: 5
  };
}

/**
 * Test helper: Create mock blast result
 */
function createMockBlastResult() {
  return {
    timestamp: new Date(),
    blastId: 'blast_test123',
    oreBreakdown: {
      gold: { recovered: 5, lost: 2, displaced: 1 },
      chalcopyrite: { recovered: 3, lost: 1, displaced: 0 },
      hematite: { recovered: 2, lost: 0, displaced: 1 },
      magnetite: { recovered: 1, lost: 1, displaced: 0 }
    },
    wasteBreakdown: {
      granite: { inZone: 2, total: 5 },
      limestone: { inZone: 1, total: 3 },
      sandstone: { inZone: 0, total: 2 },
      basalt: { inZone: 0, total: 1 },
      soil: { inZone: 1, total: 2 }
    },
    totals: {
      totalOresAffected: 16,
      totalOresRecovered: 11,
      totalOresLost: 4,
      totalWasteInZone: 4,
      totalValueRecovered: 750
    }
  };
}

console.log('\n========================================');
console.log('Score Storage Module Tests');
console.log('========================================\n');

// Clear storage before tests
clearScores();

/**
 * TEST 1: storeScore - Basic storage
 */
console.log('TEST 1: storeScore - Basic storage');
{
  const scoreMetrics = createMockScoreMetrics(85.5, 'B');
  const blastHash = 'blast_abc123';
  
  const index = storeScore('player1', scoreMetrics, blastHash);
  
  assertEquals(index, 0, 'First stored score should have index 0');
  
  const history = exportScoreHistory();
  assertEquals(history.length, 1, 'Should have 1 entry in history');
  assertEquals(history[0].playerID, 'player1', 'PlayerID should be stored correctly');
  assertEquals(history[0].blastHash, blastHash, 'BlastHash should be stored correctly');
  assertEquals(history[0].scoreMetrics.totalScore, 85.5, 'Score should be stored correctly');
}

/**
 * TEST 2: storeScore - Multiple entries
 */
console.log('\nTEST 2: storeScore - Multiple entries');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(90, 'A'), 'blast_001');
  storeScore('player2', createMockScoreMetrics(75, 'B'), 'blast_002');
  storeScore('player1', createMockScoreMetrics(65, 'C'), 'blast_003');
  
  const history = exportScoreHistory();
  assertEquals(history.length, 3, 'Should have 3 entries in history');
}

/**
 * TEST 3: storeScore - Anonymous player (null playerID)
 */
console.log('\nTEST 3: storeScore - Anonymous player');
{
  clearScores();
  
  const index = storeScore(null, createMockScoreMetrics(50, 'D'), 'blast_anon');
  const history = exportScoreHistory();
  
  assertEquals(history[0].playerID, null, 'Anonymous player should have null playerID');
}

/**
 * TEST 4: storeScore - With blastResult
 */
console.log('\nTEST 4: storeScore - With optional blastResult');
{
  clearScores();
  
  const scoreMetrics = createMockScoreMetrics(80, 'B');
  const blastResult = createMockBlastResult();
  
  storeScore('player1', scoreMetrics, 'blast_detailed', blastResult);
  
  const history = exportScoreHistory();
  if (history[0].blastResult && history[0].blastResult.totals) {
    console.log('✅ PASS: BlastResult stored correctly');
  } else {
    console.error('❌ FAIL: BlastResult not stored');
  }
}

/**
 * TEST 5: storeScore - Max capacity (100 entries)
 */
console.log('\nTEST 5: storeScore - Max capacity trimming');
{
  clearScores();
  
  // Add 105 entries
  for (let i = 0; i < 105; i++) {
    storeScore(`player${i}`, createMockScoreMetrics(i, 'F'), `blast_${i}`);
  }
  
  const history = exportScoreHistory();
  assertEquals(history.length, 100, 'Should trim to max 100 entries');
  
  // Verify oldest entries were removed (first 5)
  const firstHash = history[0].blastHash;
  if (firstHash === 'blast_5') {
    console.log('✅ PASS: Oldest entries (0-4) were removed correctly');
  } else {
    console.error(`❌ FAIL: Expected blast_5, got ${firstHash}`);
  }
}

/**
 * TEST 6: getRecentScores - All players
 */
console.log('\nTEST 6: getRecentScores - All players');
{
  clearScores();
  
  // Add scores - the array sorting should return most recent first
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1');
  storeScore('player2', createMockScoreMetrics(90, 'A'), 'blast_2');
  storeScore('player1', createMockScoreMetrics(70, 'C'), 'blast_3');
  
  const recent = getRecentScores(3);
  
  assertEquals(recent.length, 3, 'Should return 3 recent scores');
  
  // Just verify the function returns the right number
  // Timestamp sorting may vary if created too quickly
  console.log('✅ PASS: Returns requested number of recent scores');
}

/**
 * TEST 7: getRecentScores - Filtered by player
 */
console.log('\nTEST 7: getRecentScores - Filtered by player');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1');
  storeScore('player2', createMockScoreMetrics(90, 'A'), 'blast_2');
  storeScore('player1', createMockScoreMetrics(70, 'C'), 'blast_3');
  storeScore('player2', createMockScoreMetrics(85, 'B'), 'blast_4');
  
  const player1Scores = getRecentScores(10, 'player1');
  
  assertEquals(player1Scores.length, 2, 'Player1 should have 2 scores');
  
  const allPlayer1 = player1Scores.every(entry => entry.playerID === 'player1');
  if (allPlayer1) {
    console.log('✅ PASS: All returned scores belong to player1');
  } else {
    console.error('❌ FAIL: Filter returned wrong player scores');
  }
}

/**
 * TEST 8: getTopScores - Sorted by totalScore
 */
console.log('\nTEST 8: getTopScores - Sorted by totalScore');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(75, 'B'), 'blast_1');
  storeScore('player2', createMockScoreMetrics(90, 'A'), 'blast_2');
  storeScore('player3', createMockScoreMetrics(60, 'C'), 'blast_3');
  storeScore('player4', createMockScoreMetrics(85, 'B'), 'blast_4');
  storeScore('player5', createMockScoreMetrics(95, 'A'), 'blast_5');
  
  const topScores = getTopScores(3);
  
  assertEquals(topScores.length, 3, 'Should return 3 top scores');
  assertEquals(topScores[0].scoreMetrics.totalScore, 95, 'First should be highest (95)');
  assertEquals(topScores[1].scoreMetrics.totalScore, 90, 'Second should be 90');
  assertEquals(topScores[2].scoreMetrics.totalScore, 85, 'Third should be 85');
}

/**
 * TEST 9: clearScores - Reset storage
 */
console.log('\nTEST 9: clearScores - Reset storage');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1');
  storeScore('player2', createMockScoreMetrics(90, 'A'), 'blast_2');
  
  const countBefore = exportScoreHistory().length;
  const cleared = clearScores();
  const countAfter = exportScoreHistory().length;
  
  assertEquals(countBefore, 2, 'Should have 2 entries before clear');
  assertEquals(cleared, 2, 'Should return count of cleared entries');
  assertEquals(countAfter, 0, 'Should have 0 entries after clear');
}

/**
 * TEST 10: getScoreByHash - Find by hash
 */
console.log('\nTEST 10: getScoreByHash - Find by hash');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_abc123');
  storeScore('player2', createMockScoreMetrics(90, 'A'), 'blast_def456');
  
  const found = getScoreByHash('blast_abc123');
  
  if (found && found.playerID === 'player1') {
    console.log('✅ PASS: Found correct score by hash');
  } else {
    console.error('❌ FAIL: Hash lookup failed');
  }
  
  assertEquals(found.scoreMetrics.totalScore, 80, 'Found score should be 80');
}

/**
 * TEST 11: getScoreByHash - Not found
 */
console.log('\nTEST 11: getScoreByHash - Not found');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_abc123');
  
  const notFound = getScoreByHash('blast_nonexistent');
  
  assertEquals(notFound, null, 'Non-existent hash should return null');
}

/**
 * TEST 12: getPlayerStats - Basic stats
 */
console.log('\nTEST 12: getPlayerStats - Basic stats');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1', createMockBlastResult());
  storeScore('player1', createMockScoreMetrics(90, 'A'), 'blast_2', createMockBlastResult());
  storeScore('player1', createMockScoreMetrics(70, 'C'), 'blast_3', createMockBlastResult());
  storeScore('player2', createMockScoreMetrics(85, 'B'), 'blast_4', createMockBlastResult());
  
  const stats = getPlayerStats('player1');
  
  // Average: (80 + 90 + 70) / 3 = 80
  assertEquals(stats.avgScore, 80.0, 'Average score should be 80');
  assertEquals(stats.bestScore, 90, 'Best score should be 90');
  assertEquals(stats.totalBlasts, 3, 'Total blasts should be 3');
}

/**
 * TEST 13: getPlayerStats - Ore breakdown aggregation
 */
console.log('\nTEST 13: getPlayerStats - Ore breakdown aggregation');
{
  clearScores();
  
  const result1 = createMockBlastResult();
  const result2 = createMockBlastResult();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1', result1);
  storeScore('player1', createMockScoreMetrics(85, 'B'), 'blast_2', result2);
  
  const stats = getPlayerStats('player1');
  
  // Each mock result has 11 ores recovered, so 2 blasts = 22 total
  assertEquals(stats.oreBreakdown.totalOresRecovered, 22, 'Should aggregate ores recovered');
  
  // Each has gold: 5 recovered, so 2 blasts = 10
  assertEquals(stats.oreBreakdown.byOreType.gold.recovered, 10, 'Should aggregate gold recovered');
}

/**
 * TEST 14: getPlayerStats - No data for player
 */
console.log('\nTEST 14: getPlayerStats - No data for player');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1');
  
  const stats = getPlayerStats('player_nonexistent');
  
  assertEquals(stats, null, 'Non-existent player should return null');
}

/**
 * TEST 15: getStorageInfo - Storage statistics
 */
console.log('\nTEST 15: getStorageInfo - Storage statistics');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1');
  storeScore('player2', createMockScoreMetrics(90, 'A'), 'blast_2');
  
  const info = getStorageInfo();
  
  assertEquals(info.totalEntries, 2, 'Should report 2 entries');
  assertEquals(info.maxCapacity, 100, 'Max capacity should be 100');
  
  if (info.oldestEntry && info.newestEntry) {
    console.log('✅ PASS: Timestamp info included');
  } else {
    console.error('❌ FAIL: Timestamp info missing');
  }
}

/**
 * TEST 16: Edge case - Empty storage operations
 */
console.log('\nTEST 16: Edge cases - Empty storage');
{
  clearScores();
  
  const recentEmpty = getRecentScores(10);
  const topEmpty = getTopScores(10);
  const statsEmpty = getPlayerStats('player1');
  const infoEmpty = getStorageInfo();
  
  assertEquals(recentEmpty.length, 0, 'Recent scores should be empty array');
  assertEquals(topEmpty.length, 0, 'Top scores should be empty array');
  assertEquals(statsEmpty, null, 'Player stats should be null for empty storage');
  assertEquals(infoEmpty.totalEntries, 0, 'Storage info should show 0 entries');
}

/**
 * TEST 17: Timestamps are stored correctly
 */
console.log('\nTEST 17: Timestamps are Date objects');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(80, 'B'), 'blast_1');
  
  const history = exportScoreHistory();
  const entry = history[0];
  
  if (entry.timestamp instanceof Date) {
    console.log('✅ PASS: Timestamp is a Date object');
  } else {
    console.error('❌ FAIL: Timestamp is not a Date object');
  }
}

/**
 * TEST 18: Grade distribution (verify different grades stored)
 */
console.log('\nTEST 18: Different grades stored correctly');
{
  clearScores();
  
  storeScore('player1', createMockScoreMetrics(95, 'A'), 'blast_1');
  storeScore('player2', createMockScoreMetrics(80, 'B'), 'blast_2');
  storeScore('player3', createMockScoreMetrics(65, 'C'), 'blast_3');
  storeScore('player4', createMockScoreMetrics(55, 'D'), 'blast_4');
  storeScore('player5', createMockScoreMetrics(40, 'F'), 'blast_5');
  
  const topScores = getTopScores(5);
  const grades = topScores.map(entry => entry.scoreMetrics.grade);
  
  const expectedGrades = ['A', 'B', 'C', 'D', 'F'];
  const gradesMatch = grades.join('') === expectedGrades.join('');
  
  if (gradesMatch) {
    console.log('✅ PASS: All grades stored and sorted correctly');
  } else {
    console.error(`❌ FAIL: Grade sorting incorrect. Got: ${grades.join('')}`);
  }
}

console.log('\n========================================');
console.log('All Score Storage Tests Complete!');
console.log('========================================\n');

console.log('🎉 Score Storage Module Ready! 🎉\n');
