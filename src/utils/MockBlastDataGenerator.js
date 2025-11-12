/**
 * MockBlastDataGenerator.js
 * 
 * Generates deterministic mock blast scenarios for testing and development.
 * Uses seeded random generation for reproducible test data.
 * 
 * Features:
 * - Configurable grid size and densities
 * - Difficulty presets (easy/medium/hard)
 * - Seeded random generation for reproducibility
 * - Natural ore rarity distribution
 * - Compatible with BlastEvaluator.evaluateBlast()
 * 
 * @module MockBlastDataGenerator
 */

import { 
  ORE_TYPES,
  isOre as isValuableOre,
  getOreValue 
} from './OreClassification.js';

// ============================================================================
// Seeded Random Number Generator (PRNG)
// ============================================================================

/**
 * Simple seeded random number generator using mulberry32
 * Provides deterministic random values for reproducible test data
 */
export class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }

  /**
   * Generate next random float [0, 1)
   */
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer [min, max]
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float [min, max)
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * Pick random element from array
   */
  choice(array) {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Weighted random choice
   * @param {Array} items - Array of items
   * @param {Array} weights - Corresponding weights (must sum to 1)
   */
  weightedChoice(items, weights) {
    const rand = this.next();
    let cumulative = 0;
    
    for (let i = 0; i < items.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}

// ============================================================================
// Difficulty Presets
// ============================================================================

export const DIFFICULTY_PRESETS = {
  easy: {
    oreDensity: 0.6,        // 60% ores
    wasteDensity: 0.4,      // 40% waste
    collectionEfficiency: 0.95,  // 95% of affected ores collected
    blastRadius: 4,         // Larger blast
    oreWeights: {
      gold: 0.15,           // More gold
      hematite: 0.35,
      magnetite: 0.30,
      chalcopyrite: 0.20
    }
  },
  
  medium: {
    oreDensity: 0.4,        // 40% ores
    wasteDensity: 0.6,      // 60% waste
    collectionEfficiency: 0.7,  // 70% collected
    blastRadius: 3,         // Medium blast
    oreWeights: {
      gold: 0.05,           // Realistic rarity
      hematite: 0.45,
      magnetite: 0.30,
      chalcopyrite: 0.20
    }
  },
  
  hard: {
    oreDensity: 0.25,       // 25% ores
    wasteDensity: 0.75,     // 75% waste
    collectionEfficiency: 0.5,  // Only 50% collected
    blastRadius: 2,         // Smaller blast
    oreWeights: {
      gold: 0.02,           // Very rare gold
      hematite: 0.48,
      magnetite: 0.30,
      chalcopyrite: 0.20
    }
  }
};

// ============================================================================
// Main Generator Class
// ============================================================================

/**
 * Generate mock blast data with configurable parameters
 * 
 * @param {Object} config - Configuration object
 * @param {Object} config.gridSize - Grid dimensions {width, height}
 * @param {number} [config.oreDensity=0.4] - Percentage of blocks that are ores (0-1)
 * @param {number} [config.wasteDensity=0.6] - Percentage that are waste (0-1)
 * @param {number} [config.blastRadius=3] - Radius of blast effect
 * @param {number} [config.seed=12345] - Random seed for reproducibility
 * @param {string} [config.difficulty='medium'] - Difficulty preset (easy/medium/hard)
 * @param {Object} [config.blastCenter] - Center point {x, y}, defaults to grid center
 * @param {number} [config.collectionEfficiency] - Override collection rate
 * @param {Object} [config.oreWeights] - Custom ore distribution weights
 * 
 * @returns {Object} BlastData object compatible with evaluateBlast()
 */
export function generateMockBlast(config = {}) {
  // Apply difficulty preset if specified
  const preset = config.difficulty ? DIFFICULTY_PRESETS[config.difficulty] : null;
  
  // Merge config with preset defaults
  const settings = {
    gridSize: config.gridSize || { width: 10, height: 10 },
    oreDensity: config.oreDensity ?? preset?.oreDensity ?? 0.4,
    wasteDensity: config.wasteDensity ?? preset?.wasteDensity ?? 0.6,
    blastRadius: config.blastRadius ?? preset?.blastRadius ?? 3,
    seed: config.seed ?? 12345,
    collectionEfficiency: config.collectionEfficiency ?? preset?.collectionEfficiency ?? 0.7,
    oreWeights: config.oreWeights ?? preset?.oreWeights ?? {
      gold: 0.05,
      hematite: 0.45,
      magnetite: 0.30,
      chalcopyrite: 0.20
    },
    blastCenter: config.blastCenter || {
      x: Math.floor((config.gridSize?.width || 10) / 2),
      y: Math.floor((config.gridSize?.height || 10) / 2)
    }
  };

  // Validate densities sum to ~1.0
  const totalDensity = settings.oreDensity + settings.wasteDensity;
  if (Math.abs(totalDensity - 1.0) > 0.01) {
    console.warn(`Densities sum to ${totalDensity}, normalizing to 1.0`);
    settings.oreDensity = settings.oreDensity / totalDensity;
    settings.wasteDensity = settings.wasteDensity / totalDensity;
  }

  // Initialize seeded random generator
  const random = new SeededRandom(settings.seed);

  // Generate grid
  const grid = generateGrid(settings, random);

  // Simulate blast and extract affected blocks
  const affectedBlocks = simulateBlast(grid, settings, random);

  return {
    affectedBlocks,
    metadata: {
      seed: settings.seed,
      difficulty: config.difficulty || 'custom',
      gridSize: settings.gridSize,
      totalBlocks: affectedBlocks.length,
      blastCenter: settings.blastCenter,
      blastRadius: settings.blastRadius
    }
  };
}

/**
 * Generate grid populated with ores and waste
 */
function generateGrid(settings, random) {
  const { gridSize, oreDensity, oreWeights } = settings;
  const grid = [];

  const oreTypes = Object.keys(ORE_TYPES.VALUABLE);  // ['gold', 'chalcopyrite', 'hematite', 'magnetite']
  const oreWeightArray = [
    oreWeights.gold,
    oreWeights.hematite,
    oreWeights.magnetite,
    oreWeights.chalcopyrite
  ];

  const wasteTypes = Object.keys(ORE_TYPES.WASTE);  // ['granite', 'limestone', 'sandstone', 'basalt', 'soil']

  for (let y = 0; y < gridSize.height; y++) {
    for (let x = 0; x < gridSize.width; x++) {
      let materialType;

      // Determine if this block is ore or waste
      if (random.next() < oreDensity) {
        // Select ore type based on weighted distribution
        materialType = random.weightedChoice(oreTypes, oreWeightArray);
      } else {
        // Random waste material
        materialType = random.choice(wasteTypes);
      }

      grid.push({
        x,
        y,
        position: { x, y },
        oreType: materialType,
        isOre: isValuableOre(materialType),
        value: getOreValue(materialType)
      });
    }
  }

  return grid;
}

/**
 * Simulate blast effect and determine affected blocks
 */
function simulateBlast(grid, settings, random) {
  const { blastCenter, blastRadius, collectionEfficiency } = settings;
  const affectedBlocks = [];

  for (const block of grid) {
    // Calculate distance from blast center
    const dx = block.x - blastCenter.x;
    const dy = block.y - blastCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only include blocks within blast radius
    if (distance <= blastRadius) {
      // Determine collection zone inclusion
      // Closer blocks more likely to be collected
      const distanceRatio = distance / blastRadius;
      const baseCollectionChance = collectionEfficiency * (1 - distanceRatio * 0.2);
      const isInCollectionZone = random.next() < baseCollectionChance;

      // Determine if block was displaced
      // Farther blocks more likely to be displaced
      const displacementChance = distanceRatio * 0.3;
      const isDisplaced = random.next() < displacementChance;

      affectedBlocks.push({
        x: block.x,
        y: block.y,
        position: { x: block.x, y: block.y },
        oreType: block.oreType,
        isInCollectionZone,
        isDisplaced,
        distance: distance,
        value: block.value
      });
    }
  }

  return affectedBlocks;
}

// ============================================================================
// Preset Generators
// ============================================================================

/**
 * Generate easy blast scenario - high success rate
 * Perfect for testing optimal scoring
 * 
 * @param {number} [seed=11111] - Random seed
 * @returns {Object} BlastData object
 */
export function generateEasyBlast(seed = 11111) {
  return generateMockBlast({
    gridSize: { width: 8, height: 8 },
    difficulty: 'easy',
    seed,
    blastRadius: 4
  });
}

/**
 * Generate hard blast scenario - challenging conditions
 * Low ore density, scattered collection
 * 
 * @param {number} [seed=99999] - Random seed
 * @returns {Object} BlastData object
 */
export function generateHardBlast(seed = 99999) {
  return generateMockBlast({
    gridSize: { width: 12, height: 12 },
    difficulty: 'hard',
    seed,
    blastRadius: 2
  });
}

/**
 * Generate realistic blast scenario - mimics actual game patterns
 * Balanced distribution with natural randomness
 * 
 * @param {number} [seed] - Random seed (random if not provided)
 * @returns {Object} BlastData object
 */
export function generateRealisticBlast(seed) {
  const actualSeed = seed ?? Math.floor(Math.random() * 100000);
  
  return generateMockBlast({
    gridSize: { width: 10, height: 10 },
    difficulty: 'medium',
    seed: actualSeed,
    blastRadius: 3,
    // Add some natural variation
    oreDensity: 0.35 + Math.random() * 0.15,  // 35-50%
    collectionEfficiency: 0.65 + Math.random() * 0.2  // 65-85%
  });
}

/**
 * Generate perfect blast scenario - 100% collection
 * All ores collected, no waste
 * 
 * @param {number} [seed=77777] - Random seed
 * @returns {Object} BlastData object
 */
export function generatePerfectBlast(seed = 77777) {
  return generateMockBlast({
    gridSize: { width: 6, height: 6 },
    oreDensity: 1.0,
    wasteDensity: 0.0,
    blastRadius: 5,
    collectionEfficiency: 1.0,
    seed
  });
}

/**
 * Generate worst-case blast scenario - all waste
 * Maximum dilution scenario
 * 
 * @param {number} [seed=66666] - Random seed
 * @returns {Object} BlastData object
 */
export function generateWorstBlast(seed = 66666) {
  return generateMockBlast({
    gridSize: { width: 6, height: 6 },
    oreDensity: 0.1,
    wasteDensity: 0.9,
    blastRadius: 4,
    collectionEfficiency: 0.3,
    seed
  });
}

/**
 * Generate multi-blast scenario - multiple blast points
 * Simulates sequential blasts in same area
 * 
 * @param {number} blastCount - Number of blasts
 * @param {Object} config - Configuration for each blast
 * @returns {Array} Array of BlastData objects
 */
export function generateMultiBlast(blastCount = 3, config = {}) {
  const blasts = [];
  const baseSeed = config.seed || 12345;

  for (let i = 0; i < blastCount; i++) {
    const blastConfig = {
      ...config,
      seed: baseSeed + i * 1000,
      blastCenter: {
        x: 5 + i * 2,
        y: 5 + i * 2
      }
    };

    blasts.push(generateMockBlast(blastConfig));
  }

  return blasts;
}

/**
 * Generate comparison set - same seed, different difficulties
 * Useful for testing difficulty scaling
 * 
 * @param {number} [seed=12345] - Shared random seed
 * @returns {Object} Object with easy/medium/hard blast data
 */
export function generateComparisonSet(seed = 12345) {
  return {
    easy: generateMockBlast({ difficulty: 'easy', seed }),
    medium: generateMockBlast({ difficulty: 'medium', seed }),
    hard: generateMockBlast({ difficulty: 'hard', seed })
  };
}

/**
 * Generate edge case scenarios for testing
 * 
 * @returns {Object} Collection of edge case blast scenarios
 */
export function generateEdgeCases() {
  return {
    // Empty blast (no blocks affected)
    empty: {
      affectedBlocks: [],
      metadata: { description: 'Empty blast - no affected blocks' }
    },

    // Single block
    singleOre: {
      affectedBlocks: [
        { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false }
      ],
      metadata: { description: 'Single gold ore collected' }
    },

    // All ores, none collected
    missedOres: generateMockBlast({
      gridSize: { width: 4, height: 4 },
      oreDensity: 1.0,
      wasteDensity: 0.0,
      collectionEfficiency: 0.0,
      seed: 55555
    }),

    // All waste collected
    wasteOnly: generateMockBlast({
      gridSize: { width: 4, height: 4 },
      oreDensity: 0.0,
      wasteDensity: 1.0,
      collectionEfficiency: 1.0,
      seed: 44444
    }),

    // Huge grid (stress test)
    massive: generateMockBlast({
      gridSize: { width: 100, height: 100 },
      difficulty: 'medium',
      blastRadius: 15,
      seed: 33333
    })
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Print blast statistics for debugging
 * 
 * @param {Object} blastData - Generated blast data
 * @returns {Object} Statistics object
 */
export function printBlastStats(blastData) {
  const { affectedBlocks } = blastData;
  
  const stats = {
    totalBlocks: affectedBlocks.length,
    oreCount: affectedBlocks.filter(b => isValuableOre(b.oreType)).length,
    wasteCount: affectedBlocks.filter(b => !isValuableOre(b.oreType)).length,
    collected: affectedBlocks.filter(b => b.isInCollectionZone).length,
    displaced: affectedBlocks.filter(b => b.isDisplaced).length,
    oreTypes: {}
  };

  // Count each ore type
  affectedBlocks.forEach(block => {
    stats.oreTypes[block.oreType] = (stats.oreTypes[block.oreType] || 0) + 1;
  });

  console.log('=== Blast Statistics ===');
  console.log(`Total Blocks: ${stats.totalBlocks}`);
  console.log(`Ores: ${stats.oreCount} | Waste: ${stats.wasteCount}`);
  console.log(`Collected: ${stats.collected} | Displaced: ${stats.displaced}`);
  console.log('Material Distribution:', stats.oreTypes);

  return stats;
}

/**
 * Validate blast data structure
 * 
 * @param {Object} blastData - Blast data to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateBlastData(blastData) {
  if (!blastData || typeof blastData !== 'object') {
    throw new Error('BlastData must be an object');
  }

  if (!Array.isArray(blastData.affectedBlocks)) {
    throw new Error('affectedBlocks must be an array');
  }

  blastData.affectedBlocks.forEach((block, index) => {
    if (typeof block.x !== 'number' || typeof block.y !== 'number') {
      throw new Error(`Block ${index}: x and y must be numbers`);
    }

    if (typeof block.oreType !== 'string' || !block.oreType) {
      throw new Error(`Block ${index}: oreType must be a non-empty string`);
    }

    if (typeof block.isInCollectionZone !== 'boolean') {
      throw new Error(`Block ${index}: isInCollectionZone must be boolean`);
    }

    if (typeof block.isDisplaced !== 'boolean') {
      throw new Error(`Block ${index}: isDisplaced must be boolean`);
    }
  });

  return true;
}

// ============================================================================
// Exports
// ============================================================================

export default {
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
  DIFFICULTY_PRESETS,
  SeededRandom
};
