/**
 * MockBlastDataGenerator Usage Examples
 * 
 * Demonstrates how to use the mock blast data generator
 * for testing, development, and demonstrations
 */

import {
  generateMockBlast,
  generateEasyBlast,
  generateHardBlast,
  generateRealisticBlast,
  generatePerfectBlast,
  generateWorstBlast,
  generateMultiBlast,
  generateComparisonSet,
  generateEdgeCases,
  printBlastStats,
  validateBlastData,
  SeededRandom,
  DIFFICULTY_PRESETS
} from '../src/utils/MockBlastDataGenerator.js';

import { evaluateBlast } from '../src/utils/BlastEvaluator.js';
import { formatScoreDisplay } from '../src/utils/ScoreFormatter.js';

console.log('\n' + '='.repeat(70));
console.log('MOCK BLAST DATA GENERATOR - USAGE EXAMPLES');
console.log('='.repeat(70));

// ============================================================================
// Example 1: Basic Usage
// ============================================================================

console.log('\n--- Example 1: Basic Mock Blast Generation ---\n');

const basicBlast = generateMockBlast({
  gridSize: { width: 10, height: 10 },
  blastRadius: 3,
  seed: 12345
});

console.log(`Generated ${basicBlast.affectedBlocks.length} affected blocks`);
console.log(`Blast center: (${basicBlast.metadata.blastCenter.x}, ${basicBlast.metadata.blastCenter.y})`);
console.log(`Blast radius: ${basicBlast.metadata.blastRadius}`);

// Evaluate the blast
const basicResult = evaluateBlast(basicBlast);
console.log(`\nScore: ${basicResult.totalScore.toFixed(2)} | Grade: ${basicResult.grade}`);
console.log(`Recovery: ${basicResult.recoveryRate.toFixed(1)}% | Dilution: ${basicResult.dilutionRate.toFixed(1)}%`);

// ============================================================================
// Example 2: Difficulty Presets
// ============================================================================

console.log('\n--- Example 2: Using Difficulty Presets ---\n');

const difficulties = ['easy', 'medium', 'hard'];

difficulties.forEach(diff => {
  const blast = generateMockBlast({ difficulty: diff, seed: 99999 });
  const result = evaluateBlast(blast);
  
  console.log(`${diff.toUpperCase()}: Grade ${result.grade} | Score ${result.totalScore.toFixed(2)} | Blocks: ${blast.affectedBlocks.length}`);
});

// ============================================================================
// Example 3: Preset Generators
// ============================================================================

console.log('\n--- Example 3: Quick Preset Generators ---\n');

// Easy scenario
const easy = generateEasyBlast();
const easyResult = evaluateBlast(easy);
console.log(`Easy Blast: Grade ${easyResult.grade} | Score ${easyResult.totalScore.toFixed(2)}`);

// Hard scenario
const hard = generateHardBlast();
const hardResult = evaluateBlast(hard);
console.log(`Hard Blast: Grade ${hardResult.grade} | Score ${hardResult.totalScore.toFixed(2)}`);

// Realistic scenario
const realistic = generateRealisticBlast();
const realisticResult = evaluateBlast(realistic);
console.log(`Realistic Blast: Grade ${realisticResult.grade} | Score ${realisticResult.totalScore.toFixed(2)}`);

// Perfect scenario
const perfect = generatePerfectBlast();
const perfectResult = evaluateBlast(perfect);
console.log(`Perfect Blast: Grade ${perfectResult.grade} | Score ${perfectResult.totalScore.toFixed(2)}`);

// Worst scenario
const worst = generateWorstBlast();
const worstResult = evaluateBlast(worst);
console.log(`Worst Blast: Grade ${worstResult.grade} | Score ${worstResult.totalScore.toFixed(2)}`);

// ============================================================================
// Example 4: Deterministic Testing
// ============================================================================

console.log('\n--- Example 4: Deterministic Testing with Seeds ---\n');

const seed = 42;

const blast1 = generateMockBlast({ seed });
const blast2 = generateMockBlast({ seed });

console.log(`Blast 1 blocks: ${blast1.affectedBlocks.length}`);
console.log(`Blast 2 blocks: ${blast2.affectedBlocks.length}`);

const identical = blast1.affectedBlocks.every((block, i) => 
  block.x === blast2.affectedBlocks[i].x &&
  block.y === blast2.affectedBlocks[i].y &&
  block.oreType === blast2.affectedBlocks[i].oreType
);

console.log(`Same seed produces identical data: ${identical ? '✅' : '❌'}`);

// ============================================================================
// Example 5: Custom Configuration
// ============================================================================

console.log('\n--- Example 5: Custom Configuration ---\n');

const customBlast = generateMockBlast({
  gridSize: { width: 15, height: 15 },
  oreDensity: 0.7,          // 70% ores
  wasteDensity: 0.3,        // 30% waste
  blastRadius: 5,
  collectionEfficiency: 0.8, // 80% collection rate
  oreWeights: {
    gold: 0.25,             // More gold than usual
    hematite: 0.25,
    magnetite: 0.25,
    chalcopyrite: 0.25
  },
  blastCenter: { x: 7, y: 7 },
  seed: 54321
});

const customResult = evaluateBlast(customBlast);
console.log(`Custom Blast: ${customBlast.affectedBlocks.length} blocks`);
console.log(`Grade ${customResult.grade} | Score ${customResult.totalScore.toFixed(2)}`);

printBlastStats(customBlast);

// ============================================================================
// Example 6: Multiple Blast Sequences
// ============================================================================

console.log('\n--- Example 6: Multiple Blast Sequence ---\n');

const blasts = generateMultiBlast(3, {
  difficulty: 'medium',
  gridSize: { width: 12, height: 12 }
});

blasts.forEach((blast, i) => {
  const result = evaluateBlast(blast);
  console.log(`Blast ${i + 1}: Grade ${result.grade} | Score ${result.totalScore.toFixed(2)} | Blocks: ${blast.affectedBlocks.length}`);
});

// ============================================================================
// Example 7: Comparison Testing
// ============================================================================

console.log('\n--- Example 7: Difficulty Comparison (Same Seed) ---\n');

const compSet = generateComparisonSet(77777);

Object.entries(compSet).forEach(([difficulty, blast]) => {
  const result = evaluateBlast(blast);
  console.log(`${difficulty.padEnd(6)}: Grade ${result.grade} | Score ${result.totalScore.toFixed(2).padStart(5)} | Recovery ${result.recoveryRate.toFixed(1)}%`);
});

// ============================================================================
// Example 8: Edge Cases for Testing
// ============================================================================

console.log('\n--- Example 8: Edge Cases ---\n');

const edgeCases = generateEdgeCases();

Object.entries(edgeCases).forEach(([name, blast]) => {
  console.log(`${name.padEnd(12)}: ${blast.affectedBlocks.length} blocks`);
});

// Validate edge cases
try {
  validateBlastData(edgeCases.empty);
  validateBlastData(edgeCases.singleOre);
  validateBlastData(edgeCases.massive);
  console.log('\n✅ All edge cases validated successfully');
} catch (error) {
  console.error(`❌ Validation failed: ${error.message}`);
}

// ============================================================================
// Example 9: Integration with Score Formatter
// ============================================================================

console.log('\n--- Example 9: Full Integration Example ---\n');

const testBlast = generateMockBlast({ difficulty: 'medium', seed: 11111 });
const metrics = evaluateBlast(testBlast);
// ScoreFormatter expects blastResult from countAffectedOres, not the blastData
const formatted = formatScoreDisplay(metrics, undefined, true);

console.log('Formatted Display:');
console.log(`  Grade: ${formatted.data['Grade'].value} (${formatted.data['Grade'].colorClass})`);
console.log(`  Score: ${formatted.data['Total Score'].value}`);
console.log(`  Recovery: ${formatted.data['Recovery Rate'].value}`);
console.log(`  Dilution: ${formatted.data['Dilution Rate'].value}`);
console.log(`  Performance: ${formatted.data['Performance'].value}`);

if (formatted.oreBreakdown) {
  console.log('\nOre Breakdown:');
  Object.entries(formatted.oreBreakdown).forEach(([ore, data]) => {
    if (data.collected > 0) {
      console.log(`  ${ore}: ${data.collected}/${data.total} collected`);
    }
  });
}

// ============================================================================
// Example 10: Seeded Random Utilities
// ============================================================================

console.log('\n--- Example 10: Using SeededRandom Directly ---\n');

const rng = new SeededRandom(999);

console.log('Random floats:', Array.from({ length: 5 }, () => rng.next().toFixed(3)).join(', '));

rng.seed = 999; // Reset to same seed
console.log('Same seed again:', Array.from({ length: 5 }, () => rng.next().toFixed(3)).join(', '));

const ores = ['gold', 'hematite', 'magnetite'];
console.log('\nRandom ore choices:', Array.from({ length: 5 }, () => rng.choice(ores)).join(', '));

// ============================================================================
// Example 11: Performance Testing
// ============================================================================

console.log('\n--- Example 11: Performance Benchmark ---\n');

const sizes = [
  { width: 10, height: 10 },
  { width: 25, height: 25 },
  { width: 50, height: 50 },
  { width: 100, height: 100 }
];

sizes.forEach(gridSize => {
  const start = performance.now();
  const blast = generateMockBlast({ gridSize, blastRadius: 10, seed: 12345 });
  const elapsed = performance.now() - start;
  
  console.log(`${gridSize.width}x${gridSize.height} grid: ${blast.affectedBlocks.length.toString().padStart(4)} blocks in ${elapsed.toFixed(2)}ms`);
});

// ============================================================================
// Example 12: Tutorial Scenario
// ============================================================================

console.log('\n--- Example 12: Tutorial Scenario Generator ---\n');

function generateTutorialScenario(level) {
  const configs = {
    1: { difficulty: 'easy', gridSize: { width: 6, height: 6 }, blastRadius: 3 },
    2: { difficulty: 'medium', gridSize: { width: 8, height: 8 }, blastRadius: 3 },
    3: { difficulty: 'medium', gridSize: { width: 10, height: 10 }, blastRadius: 4 },
    4: { difficulty: 'hard', gridSize: { width: 12, height: 12 }, blastRadius: 3 }
  };

  const config = configs[level];
  return generateMockBlast({ ...config, seed: 10000 + level });
}

for (let level = 1; level <= 4; level++) {
  const tutorial = generateTutorialScenario(level);
  const result = evaluateBlast(tutorial);
  console.log(`Tutorial Level ${level}: Grade ${result.grade} | Score ${result.totalScore.toFixed(2)} | Blocks: ${tutorial.affectedBlocks.length}`);
}

// ============================================================================
// Example 13: Leaderboard Testing
// ============================================================================

console.log('\n--- Example 13: Leaderboard Test Data ---\n');

const leaderboardScenarios = [
  { player: 'Alice', seed: 1001, difficulty: 'easy' },
  { player: 'Bob', seed: 1002, difficulty: 'medium' },
  { player: 'Charlie', seed: 1003, difficulty: 'medium' },
  { player: 'Diana', seed: 1004, difficulty: 'hard' }
];

const scores = leaderboardScenarios.map(scenario => {
  const blast = generateMockBlast({ difficulty: scenario.difficulty, seed: scenario.seed });
  const result = evaluateBlast(blast);
  
  return {
    player: scenario.player,
    score: result.totalScore,
    grade: result.grade,
    difficulty: scenario.difficulty
  };
});

scores.sort((a, b) => b.score - a.score);

console.log('Leaderboard:');
scores.forEach((entry, i) => {
  console.log(`${i + 1}. ${entry.player.padEnd(8)} - ${entry.score.toFixed(2).padStart(5)} (${entry.grade}) [${entry.difficulty}]`);
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('✅ All examples completed successfully!');
console.log('='.repeat(70));
console.log('\nKey Takeaways:');
console.log('  • Use seeds for reproducible test data');
console.log('  • Difficulty presets provide quick scenario generation');
console.log('  • Custom configs allow fine-tuned control');
console.log('  • Edge cases help test boundary conditions');
console.log('  • Integration with evaluateBlast() validates scoring');
console.log('  • Performance is excellent even for large grids');
console.log('\n');
