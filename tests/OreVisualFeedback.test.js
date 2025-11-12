/**
 * OreVisualFeedback.test.js
 * 
 * Comprehensive tests for visual feedback system
 */

import {
  OreVisualFeedbackManager,
  CanvasOreRenderer,
  OUTCOME_STATES,
  OUTCOME_COLORS,
  BlockVisualState
} from '../src/utils/OreVisualFeedback.js';

import { generateMockBlast } from '../src/utils/MockBlastDataGenerator.js';

// ============================================================================
// Node.js Polyfills for Browser APIs
// ============================================================================

// Polyfill for requestAnimationFrame in Node.js
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (callback) => {
    return setTimeout(() => callback(Date.now()), 16);
  };
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

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
// Test Suite 1: Block Visual State
// ============================================================================

console.log('\n=== Test Suite 1: Block Visual State ===\n');

test('BlockVisualState initializes correctly', () => {
  const block = new BlockVisualState(5, 10, OUTCOME_STATES.RECOVERED, {
    oreType: 'gold',
    value: 100
  });

  assertEquals(block.x, 5, 'X coordinate should be 5');
  assertEquals(block.y, 10, 'Y coordinate should be 10');
  assertEquals(block.outcome, OUTCOME_STATES.RECOVERED, 'Outcome should be RECOVERED');
  assertEquals(block.oreType, 'gold', 'Ore type should be gold');
  assertEquals(block.value, 100, 'Value should be 100');
  assertEquals(block.opacity, 0, 'Initial opacity should be 0');
});

test('BlockVisualState returns correct colors', () => {
  const block = new BlockVisualState(0, 0, OUTCOME_STATES.RECOVERED);
  const colors = block.getCurrentColor();

  assertEquals(colors.base, OUTCOME_COLORS.recovered.base, 'Should return recovered color');
  assert(colors.glow, 'Should have glow color');
  assert(colors.border, 'Should have border color');
});

test('BlockVisualState animation updates opacity', () => {
  const block = new BlockVisualState(0, 0, OUTCOME_STATES.RECOVERED);
  const startTime = 1000;
  
  block.startAnimation(startTime, 0);
  
  // Simulate halfway through fade-in (200ms of 400ms)
  block.updateAnimation(startTime + 200, 16);
  
  assert(block.opacity > 0, 'Opacity should increase');
  assert(block.opacity < 1, 'Opacity should not be complete');
});

test('BlockVisualState completes fade-in animation', () => {
  const block = new BlockVisualState(0, 0, OUTCOME_STATES.RECOVERED);
  const startTime = 1000;
  
  block.startAnimation(startTime, 0);
  
  // Simulate after fade-in completion (500ms > 400ms)
  block.updateAnimation(startTime + 500, 16);
  
  assertEquals(block.opacity, 1, 'Opacity should be 1 after fade-in');
});

test('BlockVisualState stop animation resets state', () => {
  const block = new BlockVisualState(0, 0, OUTCOME_STATES.RECOVERED);
  
  block.startAnimation(1000, 0);
  block.updateAnimation(1200, 16);
  block.stopAnimation();
  
  assertEquals(block.isAnimating, false, 'Should not be animating');
  assertEquals(block.opacity, 1, 'Opacity should be 1');
  assertEquals(block.scale, 1, 'Scale should be 1');
});

// ============================================================================
// Test Suite 2: Visual Feedback Manager
// ============================================================================

console.log('\n=== Test Suite 2: Visual Feedback Manager ===\n');

test('OreVisualFeedbackManager initializes correctly', () => {
  const manager = new OreVisualFeedbackManager();

  assertEquals(manager.isActive, false, 'Should not be active initially');
  assertEquals(manager.blockStates.size, 0, 'Should have no block states');
  assert(manager.stats, 'Should have stats object');
});

test('Manager classifies recovered ores correctly', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [
      { x: 0, y: 0, oreType: 'gold', value: 100 }
    ]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false }
  ];
  
  const outcomes = manager.classifyBlockOutcomes(blastData, affectedBlocks);
  const outcome = outcomes.get('0,0');
  
  assertEquals(outcome.outcome, OUTCOME_STATES.RECOVERED, 'Should classify as RECOVERED');
});

test('Manager classifies wasted ores correctly', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [
      { x: 0, y: 0, oreType: 'gold', value: 100 }
    ]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: false, isDisplaced: true }
  ];
  
  const outcomes = manager.classifyBlockOutcomes(blastData, affectedBlocks);
  const outcome = outcomes.get('0,0');
  
  assertEquals(outcome.outcome, OUTCOME_STATES.WASTED, 'Should classify as WASTED');
});

test('Manager classifies diluted ores correctly', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [
      { x: 0, y: 0, oreType: 'gold', value: 100 }
    ]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: false, isDisplaced: false }
  ];
  
  const outcomes = manager.classifyBlockOutcomes(blastData, affectedBlocks);
  const outcome = outcomes.get('0,0');
  
  assertEquals(outcome.outcome, OUTCOME_STATES.DILUTED, 'Should classify as DILUTED');
});

test('Manager classifies waste collected correctly', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [
      { x: 0, y: 0, oreType: 'granite', value: 0 }
    ]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
  ];
  
  const outcomes = manager.classifyBlockOutcomes(blastData, affectedBlocks);
  const outcome = outcomes.get('0,0');
  
  assertEquals(outcome.outcome, OUTCOME_STATES.WASTE_COLLECTED, 'Should classify as WASTE_COLLECTED');
});

test('Manager applies feedback and updates stats', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [
      { x: 0, y: 0, oreType: 'gold', value: 100 },
      { x: 1, y: 0, oreType: 'granite', value: 0 }
    ]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 1, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
  ];
  
  const stats = manager.applyFeedback(blastData, affectedBlocks);
  
  assertEquals(stats.recovered, 1, 'Should have 1 recovered');
  assertEquals(stats.waste_collected, 1, 'Should have 1 waste collected');
  assertEquals(manager.isActive, true, 'Should be active');
  assertEquals(manager.blockStates.size, 2, 'Should have 2 block states');
});

test('Manager gets block state by coordinates', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [{ x: 5, y: 10, oreType: 'gold', value: 100 }]
  };
  
  const affectedBlocks = [
    { x: 5, y: 10, oreType: 'gold', isInCollectionZone: true, isDisplaced: false }
  ];
  
  manager.applyFeedback(blastData, affectedBlocks);
  
  const blockState = manager.getBlockState(5, 10);
  
  assert(blockState, 'Should find block state');
  assertEquals(blockState.x, 5, 'X should be 5');
  assertEquals(blockState.y, 10, 'Y should be 10');
});

test('Manager gets blocks by outcome', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [
      { x: 0, y: 0, oreType: 'gold', value: 100 },
      { x: 1, y: 0, oreType: 'hematite', value: 50 },
      { x: 2, y: 0, oreType: 'granite', value: 0 }
    ]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 1, y: 0, oreType: 'hematite', isInCollectionZone: true, isDisplaced: false },
    { x: 2, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
  ];
  
  manager.applyFeedback(blastData, affectedBlocks);
  
  const recovered = manager.getBlocksByOutcome(OUTCOME_STATES.RECOVERED);
  assertEquals(recovered.length, 2, 'Should have 2 recovered blocks');
});

test('Manager reset clears all states', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [{ x: 0, y: 0, oreType: 'gold', value: 100 }]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false }
  ];
  
  manager.applyFeedback(blastData, affectedBlocks);
  manager.reset();
  
  assertEquals(manager.isActive, false, 'Should not be active');
  assertEquals(manager.blockStates.size, 0, 'Should have no blocks');
  assertEquals(manager.stats.recovered, 0, 'Stats should be reset');
});

test('Manager exports render data correctly', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = {
    gridBlocks: [
      { x: 0, y: 0, oreType: 'gold', value: 100 },
      { x: 1, y: 0, oreType: 'granite', value: 0 }
    ]
  };
  
  const affectedBlocks = [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 1, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
  ];
  
  manager.applyFeedback(blastData, affectedBlocks);
  const renderData = manager.exportRenderData();
  
  assert(renderData.all, 'Should have all blocks');
  assert(renderData.byOutcome, 'Should have blocks by outcome');
  assertEquals(renderData.all.length, 2, 'Should have 2 total blocks');
  assert(renderData.byOutcome[OUTCOME_STATES.RECOVERED], 'Should have recovered group');
});

// ============================================================================
// Test Suite 3: Integration Tests
// ============================================================================

console.log('\n=== Test Suite 3: Integration Tests ===\n');

test('Works with mock blast data', () => {
  const manager = new OreVisualFeedbackManager();
  const mockBlast = generateMockBlast({ difficulty: 'easy', seed: 12345 });
  
  const blastData = {
    gridBlocks: mockBlast.affectedBlocks.map(b => ({
      x: b.x,
      y: b.y,
      oreType: b.oreType,
      value: b.value || 0
    }))
  };
  
  const stats = manager.applyFeedback(blastData, mockBlast.affectedBlocks);
  
  assert(stats.recovered >= 0, 'Should have recovered count');
  assert(manager.blockStates.size > 0, 'Should create block states');
});

test('Handles large blast data efficiently', () => {
  const manager = new OreVisualFeedbackManager();
  const largeMockBlast = generateMockBlast({
    gridSize: { width: 100, height: 100 },
    blastRadius: 15,
    seed: 99999
  });
  
  const blastData = {
    gridBlocks: largeMockBlast.affectedBlocks.map(b => ({
      x: b.x,
      y: b.y,
      oreType: b.oreType,
      value: b.value || 0
    }))
  };
  
  const start = performance.now();
  manager.applyFeedback(blastData, largeMockBlast.affectedBlocks);
  const elapsed = performance.now() - start;
  
  assert(elapsed < 100, `Should process large data quickly, took ${elapsed.toFixed(2)}ms`);
});

test('Handles empty blast data gracefully', () => {
  const manager = new OreVisualFeedbackManager();
  
  const blastData = { gridBlocks: [] };
  const affectedBlocks = [];
  
  const stats = manager.applyFeedback(blastData, affectedBlocks);
  
  assertEquals(manager.blockStates.size, 0, 'Should have no blocks');
  assertEquals(stats.recovered, 0, 'Should have 0 recovered');
});

// ============================================================================
// Test Suite 4: Performance Tests
// ============================================================================

console.log('\n=== Test Suite 4: Performance Tests ===\n');

test('Animation loop starts and stops cleanly', () => {
  const manager = new OreVisualFeedbackManager();
  
  manager.startAnimationLoop();
  assert(manager.animationFrameId !== null, 'Animation should start');
  
  manager.stopAnimationLoop();
  assertEquals(manager.animationFrameId, null, 'Animation should stop');
});

test('Handles 10,000 blocks without lag', () => {
  const manager = new OreVisualFeedbackManager();
  
  // Create 10,000 blocks
  const gridBlocks = [];
  const affectedBlocks = [];
  
  for (let i = 0; i < 10000; i++) {
    const x = i % 100;
    const y = Math.floor(i / 100);
    const isOre = i % 3 === 0;
    
    gridBlocks.push({
      x,
      y,
      oreType: isOre ? 'gold' : 'granite',
      value: isOre ? 100 : 0
    });
    
    affectedBlocks.push({
      x,
      y,
      oreType: isOre ? 'gold' : 'granite',
      isInCollectionZone: i % 2 === 0,
      isDisplaced: i % 2 === 1
    });
  }
  
  const start = performance.now();
  manager.applyFeedback({ gridBlocks }, affectedBlocks);
  const elapsed = performance.now() - start;
  
  assert(elapsed < 500, `Should handle 10k blocks in <500ms, took ${elapsed.toFixed(2)}ms`);
  assertEquals(manager.blockStates.size, 10000, 'Should have 10,000 block states');
});

test('Export render data is performant', () => {
  const manager = new OreVisualFeedbackManager();
  const mockBlast = generateMockBlast({ 
    gridSize: { width: 50, height: 50 },
    blastRadius: 10,
    seed: 12345 
  });
  
  const blastData = {
    gridBlocks: mockBlast.affectedBlocks.map(b => ({
      x: b.x,
      y: b.y,
      oreType: b.oreType,
      value: b.value || 0
    }))
  };
  
  manager.applyFeedback(blastData, mockBlast.affectedBlocks);
  
  const start = performance.now();
  const renderData = manager.exportRenderData();
  const elapsed = performance.now() - start;
  
  assert(elapsed < 50, `Export should be fast, took ${elapsed.toFixed(2)}ms`);
  assert(renderData.all.length > 0, 'Should export blocks');
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
  console.log('\n✅ All tests passed! Visual feedback system is working correctly.');
} else {
  console.log(`\n❌ ${testCount - passCount} test(s) failed. Please review errors above.`);
  process.exit(1);
}
