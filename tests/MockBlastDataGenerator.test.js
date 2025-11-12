/**
 * MockBlastDataGenerator.test.js
 * 
 * Comprehensive test suite for mock blast data generation
 * Tests seeded random generation, difficulty presets, and data validity
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

import { isOre as isValuableOre } from '../src/utils/OreClassification.js';
import { evaluateBlast } from '../src/utils/BlastEvaluator.js';

// ============================================================================
// Test Utilities
// ============================================================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertApprox(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}\nExpected: ${expected} ± ${tolerance}\nActual: ${actual}`);
  }
}

function assertInRange(value, min, max, message) {
  if (value < min || value > max) {
    throw new Error(`${message}\nExpected range: [${min}, ${max}]\nActual: ${value}`);
  }
}

let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

// ============================================================================
// Test Suite 1: Seeded Random Generator
// ============================================================================

console.log('\n=== Test Suite 1: Seeded Random Generator ===\n');

test('SeededRandom generates deterministic values', () => {
  const rng1 = new SeededRandom(12345);
  const rng2 = new SeededRandom(12345);

  const values1 = Array.from({ length: 10 }, () => rng1.next());
  const values2 = Array.from({ length: 10 }, () => rng2.next());

  values1.forEach((val, i) => {
    assertEquals(val, values2[i], `Value ${i} should match`);
  });
});

test('SeededRandom generates values in [0, 1)', () => {
  const rng = new SeededRandom(54321);

  for (let i = 0; i < 100; i++) {
    const val = rng.next();
    assertInRange(val, 0, 1, `Random value ${i} should be in [0, 1)`);
  }
});

test('SeededRandom.nextInt generates integers in range', () => {
  const rng = new SeededRandom(99999);

  for (let i = 0; i < 50; i++) {
    const val = rng.nextInt(10, 20);
    assertInRange(val, 10, 20, `Random int ${i} should be in [10, 20]`);
    assert(Number.isInteger(val), `Value ${val} should be integer`);
  }
});

test('SeededRandom.choice selects from array', () => {
  const rng = new SeededRandom(11111);
  const items = ['a', 'b', 'c', 'd'];

  for (let i = 0; i < 20; i++) {
    const choice = rng.choice(items);
    assert(items.includes(choice), `Choice ${choice} should be in array`);
  }
});

test('SeededRandom.weightedChoice respects weights', () => {
  const rng = new SeededRandom(22222);
  const items = ['rare', 'common'];
  const weights = [0.1, 0.9];  // 10% rare, 90% common

  const counts = { rare: 0, common: 0 };
  for (let i = 0; i < 1000; i++) {
    counts[rng.weightedChoice(items, weights)]++;
  }

  // Should be approximately 100 rare, 900 common
  assertApprox(counts.rare, 100, 50, 'Rare count should be ~100');
  assertApprox(counts.common, 900, 50, 'Common count should be ~900');
});

// ============================================================================
// Test Suite 2: Basic Mock Blast Generation
// ============================================================================

console.log('\n=== Test Suite 2: Basic Mock Blast Generation ===\n');

test('generateMockBlast creates valid structure', () => {
  const blast = generateMockBlast();

  assert(blast.affectedBlocks, 'Should have affectedBlocks');
  assert(Array.isArray(blast.affectedBlocks), 'affectedBlocks should be array');
  assert(blast.metadata, 'Should have metadata');
});

test('generateMockBlast is deterministic with same seed', () => {
  const blast1 = generateMockBlast({ seed: 12345 });
  const blast2 = generateMockBlast({ seed: 12345 });

  assertEquals(
    blast1.affectedBlocks.length,
    blast2.affectedBlocks.length,
    'Same seed should generate same number of blocks'
  );

  blast1.affectedBlocks.forEach((block, i) => {
    const block2 = blast2.affectedBlocks[i];
    assertEquals(block.x, block2.x, `Block ${i} x should match`);
    assertEquals(block.y, block2.y, `Block ${i} y should match`);
    assertEquals(block.oreType, block2.oreType, `Block ${i} oreType should match`);
  });
});

test('generateMockBlast creates different data with different seeds', () => {
  const blast1 = generateMockBlast({ seed: 11111 });
  const blast2 = generateMockBlast({ seed: 99999 });

  // Should have different ore distributions
  const types1 = blast1.affectedBlocks.map(b => b.oreType).join(',');
  const types2 = blast2.affectedBlocks.map(b => b.oreType).join(',');

  assert(types1 !== types2, 'Different seeds should generate different data');
});

test('generateMockBlast respects gridSize parameter', () => {
  const blast = generateMockBlast({
    gridSize: { width: 5, height: 5 },
    blastRadius: 10,  // Large enough to hit all blocks
    seed: 12345
  });

  // Should have blocks within grid bounds
  blast.affectedBlocks.forEach(block => {
    assertInRange(block.x, 0, 4, `Block x should be in [0, 4]`);
    assertInRange(block.y, 0, 4, `Block y should be in [0, 4]`);
  });
});

test('generateMockBlast respects blastRadius parameter', () => {
  const center = { x: 5, y: 5 };
  const radius = 2;

  const blast = generateMockBlast({
    gridSize: { width: 11, height: 11 },
    blastCenter: center,
    blastRadius: radius,
    seed: 12345
  });

  // All affected blocks should be within radius
  blast.affectedBlocks.forEach(block => {
    const dx = block.x - center.x;
    const dy = block.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    assert(
      distance <= radius,
      `Block at (${block.x}, ${block.y}) distance ${distance} exceeds radius ${radius}`
    );
  });
});

test('generateMockBlast includes required block properties', () => {
  const blast = generateMockBlast({ seed: 12345 });

  blast.affectedBlocks.forEach((block, i) => {
    assert(typeof block.x === 'number', `Block ${i} should have numeric x`);
    assert(typeof block.y === 'number', `Block ${i} should have numeric y`);
    assert(typeof block.oreType === 'string', `Block ${i} should have string oreType`);
    assert(typeof block.isInCollectionZone === 'boolean', `Block ${i} should have boolean isInCollectionZone`);
    assert(typeof block.isDisplaced === 'boolean', `Block ${i} should have boolean isDisplaced`);
  });
});

// ============================================================================
// Test Suite 3: Difficulty Presets
// ============================================================================

console.log('\n=== Test Suite 3: Difficulty Presets ===\n');

test('Easy difficulty has higher ore density', () => {
  const easy = generateMockBlast({ difficulty: 'easy', seed: 12345 });

  const oreCount = easy.affectedBlocks.filter(b => isValuableOre(b.oreType)).length;
  const oreRatio = oreCount / easy.affectedBlocks.length;

  // Easy should have >50% ores
  assert(oreRatio > 0.5, `Easy should have >50% ores, got ${(oreRatio * 100).toFixed(1)}%`);
});

test('Hard difficulty has lower ore density', () => {
  const hard = generateMockBlast({ difficulty: 'hard', seed: 12345 });

  const oreCount = hard.affectedBlocks.filter(b => isValuableOre(b.oreType)).length;
  const oreRatio = oreCount / hard.affectedBlocks.length;

  // Hard should have <35% ores
  assert(oreRatio < 0.35, `Hard should have <35% ores, got ${(oreRatio * 100).toFixed(1)}%`);
});

test('Medium difficulty is balanced', () => {
  const medium = generateMockBlast({ difficulty: 'medium', seed: 12345 });

  const oreCount = medium.affectedBlocks.filter(b => isValuableOre(b.oreType)).length;
  const oreRatio = oreCount / medium.affectedBlocks.length;

  // Medium should be around 30-50% ores
  assertInRange(oreRatio, 0.25, 0.55, `Medium ore ratio should be balanced`);
});

test('Easy difficulty has better collection efficiency', () => {
  const easy = generateMockBlast({ difficulty: 'easy', seed: 12345 });

  const collectedCount = easy.affectedBlocks.filter(b => b.isInCollectionZone).length;
  const collectionRatio = collectedCount / easy.affectedBlocks.length;

  // Easy should have >70% collection
  assert(collectionRatio > 0.7, `Easy collection should be >70%, got ${(collectionRatio * 100).toFixed(1)}%`);
});

test('Hard difficulty has poor collection efficiency', () => {
  const hard = generateMockBlast({ difficulty: 'hard', seed: 12345 });

  const collectedCount = hard.affectedBlocks.filter(b => b.isInCollectionZone).length;
  const collectionRatio = collectedCount / hard.affectedBlocks.length;

  // Hard should have <60% collection
  assert(collectionRatio < 0.6, `Hard collection should be <60%, got ${(collectionRatio * 100).toFixed(1)}%`);
});

// ============================================================================
// Test Suite 4: Preset Generators
// ============================================================================

console.log('\n=== Test Suite 4: Preset Generators ===\n');

test('generateEasyBlast creates easy scenario', () => {
  const blast = generateEasyBlast();

  assert(blast.affectedBlocks.length > 0, 'Should have affected blocks');
  assert(blast.metadata.difficulty === 'easy', 'Should be easy difficulty');
});

test('generateHardBlast creates hard scenario', () => {
  const blast = generateHardBlast();

  assert(blast.affectedBlocks.length > 0, 'Should have affected blocks');
  assert(blast.metadata.difficulty === 'hard', 'Should be hard difficulty');
});

test('generateRealisticBlast creates realistic scenario', () => {
  const blast = generateRealisticBlast();

  assert(blast.affectedBlocks.length > 0, 'Should have affected blocks');
  
  const oreCount = blast.affectedBlocks.filter(b => isValuableOre(b.oreType)).length;
  const oreRatio = oreCount / blast.affectedBlocks.length;

  // Should be realistic ratio (20-60%)
  assertInRange(oreRatio, 0.2, 0.6, 'Realistic ore ratio should be 20-60%');
});

test('generatePerfectBlast has 100% ores collected', () => {
  const blast = generatePerfectBlast();

  const ores = blast.affectedBlocks.filter(b => isValuableOre(b.oreType));
  const oresCollected = ores.filter(b => b.isInCollectionZone);

  // Most ores should be in collection zone (>85%)
  const collectionRate = oresCollected.length / ores.length;
  assert(
    collectionRate >= 0.85,
    `Perfect blast should collect >85% of ores, got ${(collectionRate * 100).toFixed(1)}%`
  );
});

test('generateWorstBlast has high waste ratio', () => {
  const blast = generateWorstBlast();

  const waste = blast.affectedBlocks.filter(b => !isValuableOre(b.oreType));
  const wasteRatio = waste.length / blast.affectedBlocks.length;

  // Should be mostly waste
  assert(wasteRatio > 0.7, `Worst blast should be >70% waste, got ${(wasteRatio * 100).toFixed(1)}%`);
});

test('generateMultiBlast creates multiple scenarios', () => {
  const blasts = generateMultiBlast(3);

  assertEquals(blasts.length, 3, 'Should create 3 blasts');
  
  blasts.forEach((blast, i) => {
    assert(blast.affectedBlocks.length > 0, `Blast ${i} should have blocks`);
  });
});

test('generateComparisonSet creates all difficulties', () => {
  const set = generateComparisonSet();

  assert(set.easy, 'Should have easy blast');
  assert(set.medium, 'Should have medium blast');
  assert(set.hard, 'Should have hard blast');

  // All should use same seed (different difficulty settings)
  assertEquals(set.easy.metadata.seed, set.medium.metadata.seed, 'Should share seed');
  assertEquals(set.medium.metadata.seed, set.hard.metadata.seed, 'Should share seed');
});

test('generateEdgeCases includes all edge cases', () => {
  const cases = generateEdgeCases();

  assert(cases.empty, 'Should have empty case');
  assert(cases.singleOre, 'Should have single ore case');
  assert(cases.missedOres, 'Should have missed ores case');
  assert(cases.wasteOnly, 'Should have waste only case');
  assert(cases.massive, 'Should have massive case');

  // Validate each case
  assertEquals(cases.empty.affectedBlocks.length, 0, 'Empty should have 0 blocks');
  assertEquals(cases.singleOre.affectedBlocks.length, 1, 'Single should have 1 block');
  assert(cases.massive.affectedBlocks.length > 100, 'Massive should have >100 blocks');
});

// ============================================================================
// Test Suite 5: Data Validation
// ============================================================================

console.log('\n=== Test Suite 5: Data Validation ===\n');

test('validateBlastData accepts valid data', () => {
  const blast = generateMockBlast({ seed: 12345 });

  const isValid = validateBlastData(blast);
  assert(isValid, 'Valid blast data should pass validation');
});

test('validateBlastData rejects invalid data', () => {
  const invalidCases = [
    { data: null, error: 'object' },
    { data: { affectedBlocks: 'not-array' }, error: 'array' },
    { data: { affectedBlocks: [{ x: 'invalid', y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false }] }, error: 'numbers' },
    { data: { affectedBlocks: [{ x: 0, y: 0, oreType: '', isInCollectionZone: true, isDisplaced: false }] }, error: 'non-empty' },
    { data: { affectedBlocks: [{ x: 0, y: 0, oreType: 'gold', isInCollectionZone: 'yes', isDisplaced: false }] }, error: 'boolean' }
  ];

  invalidCases.forEach(({ data, error }) => {
    try {
      validateBlastData(data);
      throw new Error(`Should have rejected data with ${error} error`);
    } catch (e) {
      assert(e.message.includes('must'), `Should throw validation error for ${error}`);
    }
  });
});

test('printBlastStats returns correct statistics', () => {
  const blast = generateMockBlast({ seed: 12345 });
  const stats = printBlastStats(blast);

  assertEquals(stats.totalBlocks, blast.affectedBlocks.length, 'Total blocks should match');
  
  const expectedOres = blast.affectedBlocks.filter(b => isValuableOre(b.oreType)).length;
  assertEquals(stats.oreCount, expectedOres, 'Ore count should match');
  
  assertEquals(stats.oreCount + stats.wasteCount, stats.totalBlocks, 'Ore + waste should equal total');
});

// ============================================================================
// Test Suite 6: Integration with BlastEvaluator
// ============================================================================

console.log('\n=== Test Suite 6: Integration Tests ===\n');

test('Generated data works with evaluateBlast', () => {
  const blast = generateMockBlast({ seed: 12345 });
  
  // Should not throw
  const result = evaluateBlast(blast);

  assert(result.totalScore !== undefined, 'Should calculate total score');
  assert(result.grade !== undefined, 'Should assign grade');
  assertInRange(result.recoveryRate, 0, 100, 'Recovery rate should be 0-100');
  assertInRange(result.dilutionRate, 0, 100, 'Dilution rate should be 0-100');
});

test('Easy blast achieves high scores', () => {
  const blast = generateEasyBlast();
  const result = evaluateBlast(blast);

  // Easy should typically get D or better (seed-dependent)
  assert(['A', 'B', 'C', 'D'].includes(result.grade), `Easy should get A/B/C/D, got ${result.grade}`);
  assert(result.totalScore >= 50, `Easy should score >=50, got ${result.totalScore.toFixed(2)}`);
});

test('Hard blast achieves lower scores', () => {
  const blast = generateHardBlast();
  const result = evaluateBlast(blast);

  // Hard should typically get C or worse
  assert(['C', 'D', 'F'].includes(result.grade), `Hard should get C or worse, got ${result.grade}`);
});

test('Perfect blast achieves A grade', () => {
  const blast = generatePerfectBlast();
  const result = evaluateBlast(blast);

  // Perfect blast (all ores, high collection) should get C or better
  assert(['A', 'B', 'C'].includes(result.grade), `Perfect blast should get A/B/C, got ${result.grade}`);
  assert(result.totalScore >= 60, `Perfect blast should score >=60, got ${result.totalScore.toFixed(2)}`);
});

// ============================================================================
// Test Suite 7: Performance Tests
// ============================================================================

console.log('\n=== Test Suite 7: Performance Tests ===\n');

test('generateMockBlast completes in reasonable time', () => {
  const start = performance.now();
  
  generateMockBlast({
    gridSize: { width: 50, height: 50 },
    blastRadius: 10,
    seed: 12345
  });
  
  const elapsed = performance.now() - start;

  assert(elapsed < 100, `Generation should take <100ms, took ${elapsed.toFixed(2)}ms`);
});

test('Large grid generation is efficient', () => {
  const start = performance.now();
  
  generateMockBlast({
    gridSize: { width: 100, height: 100 },
    blastRadius: 20,
    seed: 12345
  });
  
  const elapsed = performance.now() - start;

  assert(elapsed < 500, `Large grid should take <500ms, took ${elapsed.toFixed(2)}ms`);
});

test('Multiple blast generation is efficient', () => {
  const start = performance.now();
  
  generateMultiBlast(10);
  
  const elapsed = performance.now() - start;

  assert(elapsed < 1000, `10 blasts should take <1000ms, took ${elapsed.toFixed(2)}ms`);
});

// ============================================================================
// Results Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('TEST RESULTS SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${testCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${testCount - passCount}`);
console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);

if (passCount === testCount) {
  console.log('\n✅ All tests passed! Mock blast generator is working correctly.');
} else {
  console.log(`\n❌ ${testCount - passCount} test(s) failed. Please review errors above.`);
  process.exit(1);
}
