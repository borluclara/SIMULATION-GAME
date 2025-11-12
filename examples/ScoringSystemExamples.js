/**
 * SCORING SYSTEM - QUICK START EXAMPLES
 * Copy and paste these examples into your code
 */

// ============================================
// EXAMPLE 1: Basic Blast Evaluation
// ============================================

import { evaluateBlast } from './src/utils/BlastEvaluator.js';

// Your blast data from game
const blastData = {
  affectedBlocks: [
    // Collected ores (in collection zone)
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 1, y: 0, oreType: 'hematite', isInCollectionZone: true, isDisplaced: false },
    
    // Lost ore (not in zone, not displaced)
    { x: 2, y: 0, oreType: 'chalcopyrite', isInCollectionZone: false, isDisplaced: false },
    
    // Waste contamination (in collection zone)
    { x: 3, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
  ]
};

// Evaluate the blast
const result = evaluateBlast(blastData);

// Display results
console.log('=== BLAST RESULTS ===');
console.log(`Grade: ${result.grade}`);
console.log(`Total Score: ${result.totalScore.toFixed(2)}`);
console.log(`Recovery Rate: ${result.recoveryRate.toFixed(2)}%`);
console.log(`Dilution Rate: ${result.dilutionRate.toFixed(2)}%`);
console.log(`Value Recovery: ${result.valueRecoveryRate.toFixed(2)}%`);
console.log(`Calculated in: ${result.performanceTime}ms`);

// ============================================
// EXAMPLE 2: Store Score for Leaderboard
// ============================================

import { evaluateBlast } from './src/utils/BlastEvaluator.js';
import { storeScore, getTopScores } from './src/utils/ScoreStorage.js';

// Evaluate blast
const result = evaluateBlast(blastData);

// Store the score
storeScore(
  'player123',        // Player ID (or null for anonymous)
  result,             // Score metrics
  result.blastId,     // Unique blast identifier
  result.breakdown    // Optional: detailed breakdown
);

// Get top 10 scores for leaderboard
const leaderboard = getTopScores(10);
console.log('=== LEADERBOARD ===');
leaderboard.forEach((entry, index) => {
  console.log(`${index + 1}. ${entry.playerID}: ${entry.scoreMetrics.totalScore} (${entry.scoreMetrics.grade})`);
});

// ============================================
// EXAMPLE 3: UI Integration with Formatting
// ============================================

import { evaluateBlast } from './src/utils/BlastEvaluator.js';
import {
  formatScore,
  formatPercentage,
  getGradeColorClass,
  getScoreColorClass,
  getDilutionColorClass
} from './src/utils/ScoreFormatter.js';

// Evaluate blast
const result = evaluateBlast(blastData);

// Format for UI display
const displayData = {
  // Formatted values
  score: formatScore(result.totalScore),                    // "75.50"
  recovery: formatPercentage(result.recoveryRate),          // "85.00%"
  dilution: formatPercentage(result.dilutionRate),          // "15.00%"
  valueRecovery: formatPercentage(result.valueRecoveryRate), // "90.00%"
  
  // CSS class hints for color coding
  gradeClass: getGradeColorClass(result.grade),             // "good", "excellent", etc.
  scoreClass: getScoreColorClass(result.totalScore),        // "good", "fair", etc.
  dilutionClass: getDilutionColorClass(result.dilutionRate) // "excellent", "poor", etc.
};

// Example: React component
/*
function BlastResults() {
  return (
    <div>
      <h2 className={displayData.gradeClass}>Grade: {result.grade}</h2>
      <div className={displayData.scoreClass}>Score: {displayData.score}</div>
      <div>Recovery: {displayData.recovery}</div>
      <div className={displayData.dilutionClass}>Dilution: {displayData.dilution}</div>
    </div>
  );
}
*/

// Example: Plain HTML/CSS
const html = `
  <div class="blast-results">
    <h2 class="grade ${displayData.gradeClass}">Grade: ${result.grade}</h2>
    <div class="score ${displayData.scoreClass}">Score: ${displayData.score}</div>
    <div class="recovery">Recovery: ${displayData.recovery}</div>
    <div class="dilution ${displayData.dilutionClass}">Dilution: ${displayData.dilution}</div>
  </div>
`;

// ============================================
// EXAMPLE 4: Custom Scoring Configuration
// ============================================

import { evaluateBlast, DEFAULT_SCORING_CONFIG } from './src/utils/BlastEvaluator.js';

// Create custom scoring weights
const customConfig = {
  ...DEFAULT_SCORING_CONFIG,
  recoveryWeight: 0.5,    // 50% weight on recovery (default: 60%)
  valueWeight: 0.3,       // 30% weight on value (default: 20%)
  dilutionPenalty: 0.2    // 20% penalty for dilution (default: 20%)
};

// Evaluate with custom config
const result = evaluateBlast(blastData, customConfig);

// This configuration prioritizes high-value ore recovery

// ============================================
// EXAMPLE 5: Verify Determinism (Testing)
// ============================================

import { verifyDeterminism } from './src/utils/BlastEvaluator.js';

// Test that same blast always produces same score
const verification = verifyDeterminism(blastData, 10); // Run 10 times

console.log('=== DETERMINISM TEST ===');
console.log(`Deterministic: ${verification.isDeterministic}`);
console.log(`Variance: ${verification.variance}`);
console.log(`Hash: ${verification.hash}`);
console.log(`All Scores: [${verification.scores.join(', ')}]`);

// Expected: All scores identical, variance = 0

// ============================================
// EXAMPLE 6: Get Detailed Breakdown
// ============================================

import { evaluateBlast } from './src/utils/BlastEvaluator.js';

const result = evaluateBlast(blastData);

// Get summary (quick overview)
const summary = result.getSummary();
console.log(summary);
/* Output:
{
  blastId: 'blast_abc123',
  grade: 'B',
  totalScore: '85.50',
  recoveryRate: '92.50%',
  valueRecoveryRate: '95.00%',
  dilutionRate: '10.00%',
  performanceTime: '2ms',
  oresRecovered: 37,
  oresLost: 3,
  wasteInZone: 4,
  valueRecovered: 1850
}
*/

// Get detailed breakdown (per-ore analysis)
const detailed = result.getDetailedBreakdown();
console.log('Gold:', detailed.oreBreakdown.gold);
// { recovered: 5, lost: 1, displaced: 0 }

console.log('Granite:', detailed.wasteBreakdown.granite);
// { inZone: 2, total: 5 }

// ============================================
// EXAMPLE 7: Player Statistics
// ============================================

import { getPlayerStats, storeScore } from './src/utils/ScoreStorage.js';

// After multiple blasts have been stored...
const stats = getPlayerStats('player123');

console.log('=== PLAYER STATS ===');
console.log(`Average Score: ${stats.averageScore.toFixed(2)}`);
console.log(`Best Score: ${stats.bestScore.toFixed(2)}`);
console.log(`Worst Score: ${stats.worstScore.toFixed(2)}`);
console.log(`Total Blasts: ${stats.totalBlasts}`);
console.log(`Total Ores Recovered: ${stats.totalOresRecovered}`);
console.log(`Total Value Recovered: ${stats.totalValueRecovered}`);

// ============================================
// EXAMPLE 8: Complete Game Integration
// ============================================

import { evaluateBlast } from './src/utils/BlastEvaluator.js';
import { storeScore, getTopScores, getRecentScores } from './src/utils/ScoreStorage.js';
import { formatScore, formatPercentage, getGradeColorClass } from './src/utils/ScoreFormatter.js';

/**
 * Call this function when player completes a blast
 */
function handleBlastComplete(blastData, playerID) {
  // 1. Evaluate blast performance
  const result = evaluateBlast(blastData);
  
  // 2. Store score for leaderboard
  storeScore(playerID, result, result.blastId, result.breakdown);
  
  // 3. Format for UI
  const display = {
    grade: result.grade,
    gradeClass: getGradeColorClass(result.grade),
    score: formatScore(result.totalScore),
    recovery: formatPercentage(result.recoveryRate),
    dilution: formatPercentage(result.dilutionRate),
    valueRecovery: formatPercentage(result.valueRecoveryRate),
    time: `${result.performanceTime}ms`,
    breakdown: result.getDetailedBreakdown()
  };
  
  // 4. Show feedback to player
  showBlastFeedbackUI(display);
  
  // 5. Update leaderboard
  const leaderboard = getTopScores(10);
  updateLeaderboardUI(leaderboard);
  
  // 6. Update player's recent scores
  const recentScores = getRecentScores(5, playerID);
  updatePlayerHistoryUI(recentScores);
  
  // 7. Log performance
  console.log(`Blast ${result.blastId} evaluated in ${result.performanceTime}ms`);
  console.log(result.getSummary());
  
  return display;
}

// Example usage in game
const gameBlastData = {
  affectedBlocks: [
    { x: 5, y: 10, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 6, y: 10, oreType: 'hematite', isInCollectionZone: true, isDisplaced: false },
    // ... more blocks from blast physics simulation
  ]
};

handleBlastComplete(gameBlastData, 'player123');

// ============================================
// EXAMPLE 9: Real-time Score Prediction
// ============================================

import { evaluateBlast } from './src/utils/BlastEvaluator.js';

/**
 * Predict score before finalizing blast placement
 * (helps player optimize blast position)
 */
function predictBlastScore(plannedBlastData) {
  const prediction = evaluateBlast(plannedBlastData);
  
  return {
    estimatedGrade: prediction.grade,
    estimatedScore: prediction.totalScore,
    estimatedRecovery: prediction.recoveryRate,
    estimatedDilution: prediction.dilutionRate
  };
}

// Use for real-time feedback as player positions blast
const prediction = predictBlastScore(tentativeBlastData);
console.log(`Predicted Grade: ${prediction.estimatedGrade}`);

// ============================================
// EXAMPLE 10: Testing Your Integration
// ============================================

/**
 * Quick test to verify scoring system works
 */
function testScoringSystem() {
  console.log('Testing Scoring System...\n');
  
  // Test 1: Perfect blast
  const perfectBlast = {
    affectedBlocks: [
      { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
      { x: 1, y: 0, oreType: 'hematite', isInCollectionZone: true, isDisplaced: false }
    ]
  };
  
  const result1 = evaluateBlast(perfectBlast);
  console.log(`Test 1 - Perfect Blast: Grade ${result1.grade}, Score ${result1.totalScore}`);
  console.assert(result1.recoveryRate === 100, 'Recovery should be 100%');
  console.assert(result1.dilutionRate === 0, 'Dilution should be 0%');
  
  // Test 2: Poor blast
  const poorBlast = {
    affectedBlocks: [
      { x: 0, y: 0, oreType: 'gold', isInCollectionZone: false, isDisplaced: false },
      { x: 1, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
    ]
  };
  
  const result2 = evaluateBlast(poorBlast);
  console.log(`Test 2 - Poor Blast: Grade ${result2.grade}, Score ${result2.totalScore}`);
  console.assert(result2.grade === 'F', 'Poor blast should get grade F');
  
  // Test 3: Determinism
  const result3a = evaluateBlast(perfectBlast);
  const result3b = evaluateBlast(perfectBlast);
  console.log(`Test 3 - Determinism: ${result3a.totalScore} === ${result3b.totalScore}`);
  console.assert(result3a.totalScore === result3b.totalScore, 'Scores should match');
  
  console.log('\n✅ All tests passed!');
}

// Run test
testScoringSystem();
