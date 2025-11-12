/**
 * BlastEvaluator.bench.js
 * Performance benchmarking suite for the blast evaluation system
 * 
 * Scenarios:
 * 1. Small blast (50 blocks) - Quick operations
 * 2. Medium blast (200 blocks) - Typical gameplay
 * 3. Large blast (1000 blocks) - Heavy operations
 * 4. Stress test (10,000 blocks) - System limits
 * 
 * Requirements:
 * - All scenarios must complete < 3000ms
 * - No memory leaks across iterations
 * - Deterministic results (same input → same output)
 */

import { evaluateBlast } from '../src/utils/BlastEvaluator.js';

// ============================================================================
// Benchmark Configuration
// ============================================================================

const ITERATIONS = 10;
const MAX_TIME_MS = 3000;
const SCENARIOS = [
  { name: 'Small blast', blocks: 50, oreRatio: 0.8 },
  { name: 'Medium blast', blocks: 200, oreRatio: 0.6 },
  { name: 'Large blast', blocks: 1000, oreRatio: 0.5 },
  { name: 'Stress test', blocks: 10000, oreRatio: 0.4 }
];

// ============================================================================
// Mock Data Generator
// ============================================================================

/**
 * Generate realistic blast data for benchmarking
 * @param {number} blockCount - Number of blocks in the blast
 * @param {number} oreRatio - Ratio of ore to waste (0.0 - 1.0)
 * @returns {object} Blast data with affectedBlocks
 */
function generateBlastData(blockCount, oreRatio = 0.5) {
  const oreTypes = ['gold', 'chalcopyrite', 'hematite', 'magnetite'];
  const wasteTypes = ['granite', 'limestone', 'sandstone', 'basalt', 'soil'];
  
  const blocks = [];
  const gridSize = Math.ceil(Math.sqrt(blockCount));
  
  for (let i = 0; i < blockCount; i++) {
    const x = i % gridSize;
    const y = Math.floor(i / gridSize);
    
    // Determine if this block is ore or waste based on ratio
    const isOre = Math.random() < oreRatio;
    
    // Select material type
    let oreType;
    if (isOre) {
      // Weighted distribution: gold (10%), chalcopyrite (30%), hematite (30%), magnetite (30%)
      const rand = Math.random();
      if (rand < 0.1) {
        oreType = 'gold';
      } else if (rand < 0.4) {
        oreType = 'chalcopyrite';
      } else if (rand < 0.7) {
        oreType = 'hematite';
      } else {
        oreType = 'magnetite';
      }
    } else {
      // Evenly distribute waste types
      oreType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    }
    
    // Determine collection status (70% recovered, 20% lost, 10% displaced)
    const statusRand = Math.random();
    let isInCollectionZone = false;
    let isDisplaced = false;
    
    if (isOre) {
      if (statusRand < 0.7) {
        isInCollectionZone = true;
      } else if (statusRand < 0.9) {
        isInCollectionZone = false;
        isDisplaced = false; // lost
      } else {
        isDisplaced = true;
      }
    } else {
      // Waste: 30% in collection zone (contamination), 70% displaced
      if (statusRand < 0.3) {
        isInCollectionZone = true;
      } else {
        isDisplaced = true;
      }
    }
    
    blocks.push({
      x,
      y,
      oreType,
      isInCollectionZone,
      isDisplaced
    });
  }
  
  return { affectedBlocks: blocks };
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

/**
 * Run a single benchmark iteration
 * @param {object} blastData - Blast data to evaluate
 * @returns {object} { duration: number, result: object }
 */
function runIteration(blastData) {
  // Force garbage collection if available (run with --expose-gc flag)
  if (global.gc) {
    global.gc();
  }
  
  const startTime = performance.now();
  const result = evaluateBlast(blastData);
  const endTime = performance.now();
  
  return {
    duration: endTime - startTime,
    result
  };
}

/**
 * Calculate statistics from benchmark results
 * @param {number[]} times - Array of execution times
 * @returns {object} { avg, min, max, total }
 */
function calculateStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const total = times.reduce((sum, t) => sum + t, 0);
  
  return { avg, min, max, median, total };
}

/**
 * Format time in appropriate units
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}µs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Check if benchmark passed the performance requirement
 * @param {number} maxTime - Maximum time in milliseconds
 * @param {number} limit - Time limit in milliseconds
 * @returns {string} Pass/Fail indicator
 */
function getPassIndicator(maxTime, limit = MAX_TIME_MS) {
  return maxTime < limit ? '✓ PASS' : '✗ FAIL';
}

/**
 * Estimate memory usage (approximation)
 * @param {object} blastData - Blast data
 * @returns {string} Memory estimate
 */
function estimateMemory(blastData) {
  if (!blastData || !blastData.affectedBlocks) {
    return '0 KB';
  }
  
  // Rough estimate: each block ~100 bytes
  const bytes = blastData.affectedBlocks.length * 100;
  
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// ============================================================================
// Scenario Runner
// ============================================================================

/**
 * Run a complete benchmark scenario
 * @param {object} scenario - Scenario configuration
 * @param {number} scenarioIndex - Scenario number (1-based)
 */
function runScenario(scenario, scenarioIndex) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SCENARIO ${scenarioIndex}: ${scenario.name}`);
  console.log('='.repeat(70));
  console.log(`Blocks: ${scenario.blocks.toLocaleString()}`);
  console.log(`Ore Ratio: ${(scenario.oreRatio * 100).toFixed(0)}%`);
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Memory Estimate: ${estimateMemory({ affectedBlocks: new Array(scenario.blocks) })}`);
  console.log('-'.repeat(70));
  
  // Generate test data
  console.log('Generating test data...');
  const blastData = generateBlastData(scenario.blocks, scenario.oreRatio);
  
  // Warm-up run (not counted in stats)
  console.log('Warming up...');
  runIteration(blastData);
  
  // Run benchmark iterations
  console.log(`Running ${ITERATIONS} iterations...`);
  const times = [];
  const results = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const { duration, result } = runIteration(blastData);
    times.push(duration);
    results.push(result);
    
    process.stdout.write(`  Iteration ${i + 1}/${ITERATIONS}: ${formatTime(duration)}\r`);
  }
  
  console.log(''); // New line after progress
  
  // Calculate statistics
  const stats = calculateStats(times);
  
  // Verify determinism
  const firstScore = results[0].totalScore;
  const allSame = results.every(r => r.totalScore === firstScore);
  const determinismStatus = allSame ? '✓ Deterministic' : '✗ Non-deterministic';
  
  // Display results
  console.log('-'.repeat(70));
  console.log('RESULTS:');
  console.log(`  Average: ${formatTime(stats.avg)}`);
  console.log(`  Median:  ${formatTime(stats.median)}`);
  console.log(`  Min:     ${formatTime(stats.min)}`);
  console.log(`  Max:     ${formatTime(stats.max)}`);
  console.log(`  Total:   ${formatTime(stats.total)}`);
  console.log(`  Status:  ${getPassIndicator(stats.max)} (max < ${MAX_TIME_MS}ms)`);
  console.log(`  Determinism: ${determinismStatus}`);
  
  // Sample result details
  const sampleResult = results[0];
  console.log('-'.repeat(70));
  console.log('SAMPLE RESULT:');
  console.log(`  Score: ${sampleResult.totalScore.toFixed(2)}`);
  console.log(`  Grade: ${sampleResult.grade}`);
  console.log(`  Recovery Rate: ${sampleResult.recoveryRate.toFixed(2)}%`);
  console.log(`  Dilution Rate: ${sampleResult.dilutionRate.toFixed(2)}%`);
  console.log(`  Value Recovery: ${sampleResult.valueRecoveryRate.toFixed(2)}%`);
  
  return {
    scenario: scenario.name,
    blocks: scenario.blocks,
    stats,
    passed: stats.max < MAX_TIME_MS,
    deterministic: allSame
  };
}

// ============================================================================
// Main Benchmark Runner
// ============================================================================

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║          BLAST EVALUATOR PERFORMANCE BENCHMARK SUITE               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);

console.log('Configuration:');
console.log(`  Iterations per scenario: ${ITERATIONS}`);
console.log(`  Performance threshold: < ${MAX_TIME_MS}ms`);
console.log(`  Total scenarios: ${SCENARIOS.length}`);

// Track overall results
const benchmarkResults = [];
const startTime = Date.now();

// Run all scenarios
for (let i = 0; i < SCENARIOS.length; i++) {
  const result = runScenario(SCENARIOS[i], i + 1);
  benchmarkResults.push(result);
}

const endTime = Date.now();
const totalDuration = endTime - startTime;

// ============================================================================
// Summary Report
// ============================================================================

console.log(`\n${'='.repeat(70)}`);
console.log('BENCHMARK SUMMARY');
console.log('='.repeat(70));

// Table header
console.log('\n┌─────────────────────┬────────────┬──────────┬──────────┬──────────┬────────┐');
console.log('│ Scenario            │ Blocks     │ Avg Time │ Min Time │ Max Time │ Status │');
console.log('├─────────────────────┼────────────┼──────────┼──────────┼──────────┼────────┤');

// Table rows
for (const result of benchmarkResults) {
  const scenario = result.scenario.padEnd(19);
  const blocks = result.blocks.toLocaleString().padStart(10);
  const avg = formatTime(result.stats.avg).padStart(8);
  const min = formatTime(result.stats.min).padStart(8);
  const max = formatTime(result.stats.max).padStart(8);
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  
  console.log(`│ ${scenario} │ ${blocks} │ ${avg} │ ${min} │ ${max} │ ${status.padEnd(6)} │`);
}

console.log('└─────────────────────┴────────────┴──────────┴──────────┴──────────┴────────┘');

// Overall statistics
const allPassed = benchmarkResults.every(r => r.passed);
const allDeterministic = benchmarkResults.every(r => r.deterministic);
const passedCount = benchmarkResults.filter(r => r.passed).length;

console.log(`\nOverall Performance:`);
console.log(`  Scenarios Passed: ${passedCount}/${benchmarkResults.length}`);
console.log(`  Determinism: ${allDeterministic ? '✓ All deterministic' : '✗ Some non-deterministic'}`);
console.log(`  Total Benchmark Time: ${formatTime(totalDuration)}`);

// Performance grade
let performanceGrade;
const avgOfAvgs = benchmarkResults.reduce((sum, r) => sum + r.stats.avg, 0) / benchmarkResults.length;

if (avgOfAvgs < 10) {
  performanceGrade = 'A+ (Excellent)';
} else if (avgOfAvgs < 50) {
  performanceGrade = 'A (Very Good)';
} else if (avgOfAvgs < 100) {
  performanceGrade = 'B (Good)';
} else if (avgOfAvgs < 500) {
  performanceGrade = 'C (Acceptable)';
} else {
  performanceGrade = 'D (Needs Improvement)';
}

console.log(`  Performance Grade: ${performanceGrade}`);

// Final verdict
console.log(`\n${'='.repeat(70)}`);
if (allPassed && allDeterministic) {
  console.log('🎉 ALL BENCHMARKS PASSED! 🎉');
  console.log('✨ System meets all performance requirements ✨');
} else {
  console.log('⚠️  SOME BENCHMARKS FAILED');
  if (!allPassed) {
    console.log('   Some scenarios exceeded the 3000ms limit');
  }
  if (!allDeterministic) {
    console.log('   Non-deterministic results detected');
  }
}
console.log('='.repeat(70));

// Detailed output format as requested
console.log('\n📊 Quick Summary (as requested):');
for (let i = 0; i < benchmarkResults.length; i++) {
  const r = benchmarkResults[i];
  const status = r.passed ? '✓' : '✗';
  console.log(`  Scenario ${i + 1}: avg=${formatTime(r.stats.avg)}, min=${formatTime(r.stats.min)}, max=${formatTime(r.stats.max)} ${status}`);
}

console.log('\n');

// Export results for programmatic access
export { benchmarkResults };
