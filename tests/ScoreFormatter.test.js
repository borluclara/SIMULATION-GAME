/**
 * ScoreFormatter.test.js
 * Tests for score formatting utilities
 */

import {
  formatScoreDisplay,
  formatPercentage,
  formatScore,
  formatPerformanceTime,
  getScoreColorClass,
  getGradeColorClass,
  getRecoveryColorClass,
  getDilutionColorClass,
  getPerformanceColorClass,
  getScoreDescription,
  getRecommendations,
  createCompactSummary
} from '../src/utils/ScoreFormatter.js';

import { evaluateBlast, countAffectedOres } from '../src/utils/BlastEvaluator.js';

// ============================================================================
// Test Utilities
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    testsPassed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`❌ FAIL: ${testName}`);
  }
}

function assertEquals(actual, expected, testName) {
  if (actual === expected) {
    testsPassed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
  }
}

// ============================================================================
// Mock Data
// ============================================================================

function createMockScoreMetrics(score, grade, recoveryRate, dilutionRate, valueRecoveryRate, performanceTime) {
  return {
    recoveryRate: recoveryRate || 0,
    dilutionRate: dilutionRate || 0,
    valueRecoveryRate: valueRecoveryRate || 0,
    totalScore: score,
    grade: grade,
    performanceTime: performanceTime || 0
  };
}

function createMockBlastData() {
  return {
    affectedBlocks: [
      { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
      { x: 1, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
      { x: 2, y: 0, oreType: 'chalcopyrite', isInCollectionZone: true, isDisplaced: false },
      { x: 3, y: 0, oreType: 'hematite', isInCollectionZone: false, isDisplaced: false },
      { x: 4, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
    ]
  };
}

// ============================================================================
// Tests
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('SCORE FORMATTER TESTS');
console.log('='.repeat(70));

// Test 1: Format Percentage
console.log('\n--- Test 1: Format Percentage ---');
assertEquals(formatPercentage(85.5), '85.50%', 'Format 85.5%');
assertEquals(formatPercentage(100), '100.00%', 'Format 100%');
assertEquals(formatPercentage(0), '0.00%', 'Format 0%');
assertEquals(formatPercentage(33.333, 1), '33.3%', 'Format with 1 decimal');

// Test 2: Format Score
console.log('\n--- Test 2: Format Score ---');
assertEquals(formatScore(95.5), '95.50', 'Format score 95.5');
assertEquals(formatScore(100), '100.00', 'Format score 100');
assertEquals(formatScore(0), '0.00', 'Format score 0');

// Test 3: Format Performance Time
console.log('\n--- Test 3: Format Performance Time ---');
assertEquals(formatPerformanceTime(0.5), '500µs', 'Format microseconds');
assertEquals(formatPerformanceTime(5), '5ms', 'Format milliseconds');
assertEquals(formatPerformanceTime(1500), '1.50s', 'Format seconds');

// Test 4: Score Color Classes
console.log('\n--- Test 4: Score Color Classes ---');
assertEquals(getScoreColorClass(95), 'excellent', 'Score 95 = excellent');
assertEquals(getScoreColorClass(80), 'good', 'Score 80 = good');
assertEquals(getScoreColorClass(65), 'fair', 'Score 65 = fair');
assertEquals(getScoreColorClass(55), 'poor', 'Score 55 = poor');
assertEquals(getScoreColorClass(30), 'terrible', 'Score 30 = terrible');

// Test 5: Grade Color Classes
console.log('\n--- Test 5: Grade Color Classes ---');
assertEquals(getGradeColorClass('A'), 'excellent', 'Grade A = excellent');
assertEquals(getGradeColorClass('B'), 'good', 'Grade B = good');
assertEquals(getGradeColorClass('C'), 'fair', 'Grade C = fair');
assertEquals(getGradeColorClass('D'), 'poor', 'Grade D = poor');
assertEquals(getGradeColorClass('F'), 'terrible', 'Grade F = terrible');

// Test 6: Recovery Color Classes
console.log('\n--- Test 6: Recovery Color Classes ---');
assertEquals(getRecoveryColorClass(95), 'excellent', 'Recovery 95% = excellent');
assertEquals(getRecoveryColorClass(80), 'good', 'Recovery 80% = good');
assertEquals(getRecoveryColorClass(65), 'fair', 'Recovery 65% = fair');
assertEquals(getRecoveryColorClass(50), 'poor', 'Recovery 50% = poor');
assertEquals(getRecoveryColorClass(30), 'terrible', 'Recovery 30% = terrible');

// Test 7: Dilution Color Classes (inverted)
console.log('\n--- Test 7: Dilution Color Classes ---');
assertEquals(getDilutionColorClass(5), 'excellent', 'Dilution 5% = excellent');
assertEquals(getDilutionColorClass(20), 'good', 'Dilution 20% = good');
assertEquals(getDilutionColorClass(35), 'fair', 'Dilution 35% = fair');
assertEquals(getDilutionColorClass(50), 'poor', 'Dilution 50% = poor');
assertEquals(getDilutionColorClass(80), 'terrible', 'Dilution 80% = terrible');

// Test 8: Performance Color Classes
console.log('\n--- Test 8: Performance Color Classes ---');
assertEquals(getPerformanceColorClass(5), 'excellent', 'Performance 5ms = excellent');
assertEquals(getPerformanceColorClass(25), 'good', 'Performance 25ms = good');
assertEquals(getPerformanceColorClass(75), 'fair', 'Performance 75ms = fair');
assertEquals(getPerformanceColorClass(500), 'poor', 'Performance 500ms = poor');
assertEquals(getPerformanceColorClass(2000), 'terrible', 'Performance 2000ms = terrible');

// Test 9: Simple Format
console.log('\n--- Test 9: Simple Format ---');
{
  const mockMetrics = createMockScoreMetrics(85.5, 'B', 90, 15, 88, 5);
  const formatted = formatScoreDisplay(mockMetrics);
  
  assert(formatted !== null, 'Simple format returns data');
  assert(formatted.type === 'simple', 'Type is simple');
  assert(formatted.data['Recovery Rate'].value === '90.00%', 'Recovery rate formatted');
  assert(formatted.data['Dilution Rate'].value === '15.00%', 'Dilution rate formatted');
  assert(formatted.data['Total Score'].value === '85.50', 'Total score formatted');
  assert(formatted.data['Grade'].value === 'B', 'Grade formatted');
  assert(formatted.data['Performance'].value === '5ms', 'Performance formatted');
  assert(formatted.data['Total Score'].colorClass === 'good', 'Score color class correct');
  assert(formatted.metadata.grade === 'B', 'Metadata includes grade');
}

// Test 10: Detailed Format with Real Data
console.log('\n--- Test 10: Detailed Format with Real Data ---');
{
  const blastData = createMockBlastData();
  const blastResult = countAffectedOres(blastData);
  const scoreMetrics = evaluateBlast(blastData);
  
  const formatted = formatScoreDisplay(scoreMetrics, blastResult, true);
  
  assert(formatted !== null, 'Detailed format returns data');
  assert(formatted.type === 'detailed', 'Type is detailed');
  assert(formatted.data['Value Recovery'] !== undefined, 'Value Recovery included');
  assert(formatted.data['Ore Breakdown'] !== undefined, 'Ore breakdown included');
  assert(formatted.data['Waste Breakdown'] !== undefined, 'Waste breakdown included');
  assert(formatted.data['Totals'] !== undefined, 'Totals included');
  assert(formatted.metadata.blastId !== undefined, 'Metadata includes blast ID');
}

// Test 11: Ore Breakdown Formatting
console.log('\n--- Test 11: Ore Breakdown Formatting ---');
{
  const blastData = createMockBlastData();
  const blastResult = countAffectedOres(blastData);
  const scoreMetrics = evaluateBlast(blastData);
  const formatted = formatScoreDisplay(scoreMetrics, blastResult, true);
  
  const oreBreakdown = formatted.data['Ore Breakdown'];
  assert(oreBreakdown['Gold'] !== undefined, 'Gold in breakdown');
  assert(oreBreakdown['Gold'].recovered === 2, 'Gold recovered count correct');
  assert(oreBreakdown['Gold'].value === 200, 'Gold value correct (2 * 100)');
  assert(oreBreakdown['Chalcopyrite'] !== undefined, 'Chalcopyrite in breakdown');
}

// Test 12: Waste Breakdown Formatting
console.log('\n--- Test 12: Waste Breakdown Formatting ---');
{
  const blastData = createMockBlastData();
  const blastResult = countAffectedOres(blastData);
  const scoreMetrics = evaluateBlast(blastData);
  const formatted = formatScoreDisplay(scoreMetrics, blastResult, true);
  
  const wasteBreakdown = formatted.data['Waste Breakdown'];
  assert(wasteBreakdown['Granite'] !== undefined, 'Granite in breakdown');
  assert(wasteBreakdown['Granite'].inZone === 1, 'Granite in zone count correct');
}

// Test 13: Score Descriptions
console.log('\n--- Test 13: Score Descriptions ---');
{
  const desc95 = getScoreDescription(95);
  const desc80 = getScoreDescription(80);
  const desc65 = getScoreDescription(65);
  const desc55 = getScoreDescription(55);
  const desc30 = getScoreDescription(30);
  
  assert(desc95.includes('Excellent'), 'Score 95 description mentions Excellent');
  assert(desc80.includes('Good'), 'Score 80 description mentions Good');
  assert(desc65.includes('Fair'), 'Score 65 description mentions Fair');
  assert(desc55.includes('Poor'), 'Score 55 description mentions Poor');
  assert(desc30.includes('Terrible'), 'Score 30 description mentions Terrible');
}

// Test 14: Recommendations
console.log('\n--- Test 14: Recommendations ---');
{
  const lowRecovery = createMockScoreMetrics(40, 'F', 30, 10, 25, 5);
  const highDilution = createMockScoreMetrics(50, 'F', 80, 50, 75, 5);
  const perfect = createMockScoreMetrics(95, 'A', 95, 5, 95, 5);
  
  const recsLow = getRecommendations(lowRecovery);
  const recsHigh = getRecommendations(highDilution);
  const recsPerfect = getRecommendations(perfect);
  
  assert(recsLow.some(r => r.includes('recovery') || r.includes('recover')), 'Low recovery recommendation');
  assert(recsHigh.some(r => r.includes('waste') || r.includes('contamination')), 'High dilution recommendation');
  assert(recsPerfect.some(r => r.includes('Excellent') || r.includes('good')), 'Perfect score recommendation');
}

// Test 15: Compact Summary
console.log('\n--- Test 15: Compact Summary ---');
{
  const metrics = createMockScoreMetrics(85.5, 'B', 90, 15, 88, 5);
  const summary = createCompactSummary(metrics);
  
  assert(summary.includes('Grade B'), 'Summary includes grade');
  assert(summary.includes('85.50'), 'Summary includes score');
  assert(summary.includes('90.00%'), 'Summary includes recovery');
  assert(summary.includes('15.00%'), 'Summary includes dilution');
  assert(summary.includes('5ms'), 'Summary includes performance');
}

// Test 16: Edge Cases
console.log('\n--- Test 16: Edge Cases ---');
{
  // Null input
  const nullResult = formatScoreDisplay(null);
  assert(nullResult === null, 'Null input returns null');
  
  // Detailed without blast result
  const metrics = createMockScoreMetrics(85.5, 'B', 90, 15, 88, 5);
  const noBlastResult = formatScoreDisplay(metrics, null, true);
  assert(noBlastResult.type === 'simple', 'Falls back to simple if no blast result');
}

// Test 17: Raw Values Included
console.log('\n--- Test 17: Raw Values Included ---');
{
  const metrics = createMockScoreMetrics(85.5, 'B', 90.123, 15.456, 88.789, 5);
  const formatted = formatScoreDisplay(metrics);
  
  assert(formatted.data['Recovery Rate'].raw === 90.123, 'Raw recovery value preserved');
  assert(formatted.data['Dilution Rate'].raw === 15.456, 'Raw dilution value preserved');
  assert(formatted.data['Total Score'].raw === 85.5, 'Raw score value preserved');
}

// ============================================================================
// Test Summary
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('TEST SUMMARY');
console.log('='.repeat(70));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! 🎉');
  console.log('✨ Score Formatter is ready for UI integration ✨\n');
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review.\n`);
}
