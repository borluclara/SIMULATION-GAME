# Mock Blast Data Generator

**Deterministic test data generation for blast evaluation system**

---

## Overview

The Mock Blast Data Generator creates reproducible blast scenarios for testing, development, and demonstration purposes. It uses seeded random number generation to ensure consistent test data across runs.

## Quick Start

```javascript
import { generateMockBlast, generateEasyBlast } from '@/utils/MockBlastDataGenerator.js';

// Quick easy scenario
const blast = generateEasyBlast();

// Custom configuration
const customBlast = generateMockBlast({
  gridSize: { width: 10, height: 10 },
  difficulty: 'medium',
  blastRadius: 3,
  seed: 12345  // For reproducibility
});
```

---

## Features

✅ **Deterministic Generation** - Same seed always produces identical data  
✅ **Difficulty Presets** - Easy, Medium, Hard configurations  
✅ **Seeded Random** - Mulberry32 PRNG for reproducible randomness  
✅ **Natural Ore Distribution** - Weighted by rarity (gold < iron)  
✅ **Configurable Densities** - Control ore/waste ratios  
✅ **Blast Simulation** - Distance-based collection zones  
✅ **Edge Case Generation** - Empty, single block, massive grids  
✅ **Performance Tested** - Handles 100x100 grids in <10ms  

---

## API Reference

### Core Function

#### `generateMockBlast(config)`

Generate mock blast data with full configuration control.

**Parameters:**
```javascript
{
  gridSize: { width: 10, height: 10 },
  oreDensity: 0.4,          // 40% of blocks are ores (0-1)
  wasteDensity: 0.6,        // 60% are waste (0-1)
  blastRadius: 3,           // Blast effect radius
  seed: 12345,              // Random seed for reproducibility
  difficulty: 'medium',     // 'easy' | 'medium' | 'hard'
  blastCenter: { x: 5, y: 5 },  // Center point (defaults to grid center)
  collectionEfficiency: 0.7,    // Collection success rate (0-1)
  oreWeights: {             // Ore distribution weights
    gold: 0.05,
    hematite: 0.45,
    magnetite: 0.30,
    chalcopyrite: 0.20
  }
}
```

**Returns:**
```javascript
{
  affectedBlocks: [
    {
      x: 0,
      y: 0,
      position: { x: 0, y: 0 },
      oreType: 'gold',
      isInCollectionZone: true,
      isDisplaced: false,
      distance: 1.4,
      value: 100
    },
    // ... more blocks
  ],
  metadata: {
    seed: 12345,
    difficulty: 'medium',
    gridSize: { width: 10, height: 10 },
    totalBlocks: 29,
    blastCenter: { x: 5, y: 5 },
    blastRadius: 3
  }
}
```

---

### Preset Generators

#### `generateEasyBlast(seed?)`
High ore density (60%), good collection (95%), large radius (4)

#### `generateHardBlast(seed?)`
Low ore density (25%), poor collection (50%), small radius (2)

#### `generateRealisticBlast(seed?)`
Balanced distribution mimicking actual gameplay

#### `generatePerfectBlast(seed?)`
All ores (100%), perfect collection (100%)

#### `generateWorstBlast(seed?)`
Minimal ores (10%), poor collection (30%)

#### `generateMultiBlast(count, config?)`
Generate sequence of multiple blasts

#### `generateComparisonSet(seed?)`
Returns `{ easy, medium, hard }` with same seed

#### `generateEdgeCases()`
Returns collection of edge case scenarios:
- `empty` - No affected blocks
- `singleOre` - Single gold block
- `missedOres` - All ores, none collected
- `wasteOnly` - Only waste collected
- `massive` - 100x100 grid stress test

---

### Difficulty Presets

```javascript
export const DIFFICULTY_PRESETS = {
  easy: {
    oreDensity: 0.6,
    wasteDensity: 0.4,
    collectionEfficiency: 0.95,
    blastRadius: 4,
    oreWeights: { gold: 0.15, hematite: 0.35, magnetite: 0.30, chalcopyrite: 0.20 }
  },
  
  medium: {
    oreDensity: 0.4,
    wasteDensity: 0.6,
    collectionEfficiency: 0.7,
    blastRadius: 3,
    oreWeights: { gold: 0.05, hematite: 0.45, magnetite: 0.30, chalcopyrite: 0.20 }
  },
  
  hard: {
    oreDensity: 0.25,
    wasteDensity: 0.75,
    collectionEfficiency: 0.5,
    blastRadius: 2,
    oreWeights: { gold: 0.02, hematite: 0.48, magnetite: 0.30, chalcopyrite: 0.20 }
  }
};
```

---

### Utility Functions

#### `printBlastStats(blastData)`
Print detailed statistics to console

**Returns:**
```javascript
{
  totalBlocks: 29,
  oreCount: 9,
  wasteCount: 20,
  collected: 16,
  displaced: 10,
  oreTypes: {
    gold: 2,
    hematite: 4,
    granite: 8,
    // ...
  }
}
```

#### `validateBlastData(blastData)`
Validate blast data structure

**Throws:** Error if invalid  
**Returns:** `true` if valid

---

### SeededRandom Class

Mulberry32 pseudo-random number generator for deterministic randomness.

```javascript
const rng = new SeededRandom(12345);

rng.next()                    // → 0.0 to 1.0 (float)
rng.nextInt(10, 20)           // → 10 to 20 (integer)
rng.nextFloat(1.5, 2.5)       // → 1.5 to 2.5 (float)
rng.choice(['a', 'b', 'c'])   // → Random element
rng.weightedChoice(items, weights)  // → Weighted selection
```

---

## Usage Examples

### Basic Usage

```javascript
const blast = generateMockBlast({
  gridSize: { width: 10, height: 10 },
  difficulty: 'medium',
  seed: 12345
});

const result = evaluateBlast(blast);
console.log(`Grade ${result.grade}: ${result.totalScore}`);
```

### Reproducible Tests

```javascript
const seed = 42;

const test1 = generateMockBlast({ seed });
const test2 = generateMockBlast({ seed });

// Both produce identical data
assert.deepEqual(test1, test2);
```

### Difficulty Comparison

```javascript
const set = generateComparisonSet(99999);

Object.entries(set).forEach(([difficulty, blast]) => {
  const result = evaluateBlast(blast);
  console.log(`${difficulty}: Grade ${result.grade}`);
});
```

### Custom Ore Distribution

```javascript
const goldRush = generateMockBlast({
  oreDensity: 0.8,
  oreWeights: {
    gold: 0.50,        // 50% gold!
    hematite: 0.20,
    magnetite: 0.20,
    chalcopyrite: 0.10
  },
  seed: 777
});
```

### Tutorial Levels

```javascript
function generateTutorial(level) {
  const configs = {
    1: { difficulty: 'easy', blastRadius: 4 },
    2: { difficulty: 'medium', blastRadius: 3 },
    3: { difficulty: 'hard', blastRadius: 2 }
  };
  
  return generateMockBlast({ ...configs[level], seed: 1000 + level });
}
```

---

## Algorithm Details

### Grid Generation

1. Create NxM grid based on `gridSize`
2. For each position:
   - Roll random number (0-1)
   - If < `oreDensity`: assign random ore (weighted by `oreWeights`)
   - Else: assign random waste material
3. Store with position, type, and value

### Blast Simulation

1. Calculate distance from each block to `blastCenter`
2. Include only blocks within `blastRadius`
3. For each included block:
   - **Collection Zone**: Probability = `collectionEfficiency * (1 - distance/radius * 0.2)`
   - **Displacement**: Probability = `distance/radius * 0.3`
4. Return affected blocks array

### Ore Rarity Weighting

Default weights reflect natural scarcity:
- **Gold**: 5% (rare, highest value)
- **Hematite**: 45% (common iron ore)
- **Magnetite**: 30% (magnetic iron ore)
- **Chalcopyrite**: 20% (copper ore)

---

## Testing

### Run Tests

```bash
node tests/MockBlastDataGenerator.test.js
```

**Test Coverage:**
- 5 Seeded Random tests
- 6 Basic generation tests
- 5 Difficulty preset tests
- 8 Preset generator tests
- 3 Validation tests
- 4 Integration tests
- 3 Performance tests

**Total: 34 tests, 100% passing**

### Run Examples

```bash
node examples/MockBlastDataGeneratorExamples.js
```

Demonstrates:
- Basic usage
- Difficulty presets
- Deterministic testing
- Custom configurations
- Multi-blast sequences
- Edge cases
- Full integration
- Performance benchmarks

---

## Performance

| Grid Size | Blocks Generated | Time | Status |
|-----------|-----------------|------|--------|
| 10x10 | ~100 | 0.2ms | ✅ Excellent |
| 25x25 | ~300 | 0.7ms | ✅ Excellent |
| 50x50 | ~300 | 3.3ms | ✅ Excellent |
| 100x100 | ~300 | 5.4ms | ✅ Excellent |

*Note: Actual block count depends on blast radius*

---

## Integration with Blast Evaluator

```javascript
import { generateMockBlast } from '@/utils/MockBlastDataGenerator.js';
import { evaluateBlast } from '@/utils/BlastEvaluator.js';

const blast = generateMockBlast({ difficulty: 'medium', seed: 12345 });
const metrics = evaluateBlast(blast);

console.log(metrics);
// → { totalScore: 45.2, grade: 'F', recoveryRate: 60, dilutionRate: 40, ... }
```

---

## Best Practices

### ✅ Do

- Always use seeds for reproducible tests
- Validate generated data before use
- Use difficulty presets for quick scenarios
- Check blast stats with `printBlastStats()`
- Test edge cases in your integration

### ❌ Don't

- Rely on random (unseeded) data for tests
- Ignore densities sum validation warnings
- Use massive grids in production (memory)
- Modify generated data directly

---

## Troubleshooting

### "Densities sum to X, normalizing to 1.0"

**Cause:** `oreDensity + wasteDensity ≠ 1.0`  
**Solution:** Densities are auto-normalized, but specify exact values to avoid warning

```javascript
// ❌ Warning
{ oreDensity: 0.4, wasteDensity: 0.5 }  // Sums to 0.9

// ✅ No warning
{ oreDensity: 0.4, wasteDensity: 0.6 }  // Sums to 1.0
```

### Generated blast has no blocks

**Cause:** `blastRadius` too small or grid too small  
**Solution:** Increase radius or grid size

```javascript
// ❌ No blocks
{ gridSize: { width: 3, height: 3 }, blastRadius: 1 }

// ✅ Blocks generated
{ gridSize: { width: 10, height: 10 }, blastRadius: 3 }
```

### Scores too low/high

**Cause:** Difficulty preset doesn't match expectations  
**Solution:** Use custom `collectionEfficiency` and densities

```javascript
const highScoring = generateMockBlast({
  oreDensity: 0.8,
  collectionEfficiency: 0.9,
  blastRadius: 5
});
```

---

## File Structure

```
src/utils/
  └── MockBlastDataGenerator.js    (569 lines)

tests/
  └── MockBlastDataGenerator.test.js (480 lines)

examples/
  └── MockBlastDataGeneratorExamples.js (350 lines)

docs/
  └── MOCK_BLAST_GENERATOR.md (this file)
```

---

## API Summary

| Function | Purpose | Returns |
|----------|---------|---------|
| `generateMockBlast(config)` | Full control generation | BlastData |
| `generateEasyBlast(seed)` | Quick easy scenario | BlastData |
| `generateHardBlast(seed)` | Quick hard scenario | BlastData |
| `generateRealisticBlast(seed)` | Balanced scenario | BlastData |
| `generatePerfectBlast(seed)` | All ores collected | BlastData |
| `generateWorstBlast(seed)` | Maximum dilution | BlastData |
| `generateMultiBlast(count, config)` | Multiple blasts | BlastData[] |
| `generateComparisonSet(seed)` | Easy/Med/Hard set | Object |
| `generateEdgeCases()` | Edge case scenarios | Object |
| `printBlastStats(blastData)` | Print statistics | Stats object |
| `validateBlastData(blastData)` | Validate structure | boolean |
| `SeededRandom(seed)` | PRNG instance | SeededRandom |

---

## Version History

**v1.0.0** - Initial release
- Seeded random generation
- Difficulty presets (easy/medium/hard)
- Natural ore distribution
- Distance-based blast simulation
- 34 comprehensive tests
- 13 usage examples
- Full integration with BlastEvaluator

---

## License

[Your License Here]

---

**Built for the Mining Simulation Game**  
*Last Updated: November 12, 2025*
