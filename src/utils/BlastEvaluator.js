/**
 * BlastEvaluator.js
 * Core blast evaluation system with multi-ore support
 * 
 * Purpose: Evaluate blast quality using recovery rate, dilution rate, and value recovery
 * Supports: 4 ore types (gold, chalcopyrite, hematite, magnetite)
 *           5 waste types (granite, limestone, sandstone, basalt, soil)
 */

import {
  isOre,
  isWaste,
  getOreValue,
  getAllOreTypes,
  getAllWasteTypes,
  getMaterialProperties,
  normalizeMaterialName
} from './OreClassification.js';

const createOreBreakdown = () => getAllOreTypes().reduce((acc, oreType) => {
  acc[oreType] = { recovered: 0, lost: 0, displaced: 0 };
  return acc;
}, {});

const createWasteBreakdown = () => getAllWasteTypes().reduce((acc, wasteType) => {
  acc[wasteType] = { inZone: 0, total: 0 };
  return acc;
}, {});

/**
 * BlastResult Class
 * Stores comprehensive breakdown of blast outcomes for all material types
 */
class BlastResult {
  constructor() {
    this.timestamp = new Date();
    this.blastId = '';  // Will be set by hash function
    
    // Ore and waste breakdowns mirror canonical classification lists
    this.oreBreakdown = createOreBreakdown();
    this.wasteBreakdown = createWasteBreakdown();
    
    // Aggregated totals across all material types
    this.totals = {
      totalOresAffected: 0,     // Sum of all ore blocks affected
      totalOresRecovered: 0,    // Sum of all ore blocks successfully recovered
      totalOresLost: 0,         // Sum of all ore blocks lost
      totalWasteInZone: 0,      // Sum of all waste blocks in blast zone
      totalValueRecovered: 0    // Value-weighted recovery (using ore values)
    };
  }

  /**
   * Validate that the BlastResult structure is consistent
   * @returns {boolean} True if valid, false otherwise
   */
  validate() {
    // Check that all ore types exist in breakdown
    const oreTypes = getAllOreTypes();
    for (const oreType of oreTypes) {
      if (!this.oreBreakdown[oreType]) {
        console.warn(`Missing ore type in breakdown: ${oreType}`);
        return false;
      }
    }

    // Check that all waste types exist in breakdown
    const wasteTypes = getAllWasteTypes();
    for (const wasteType of wasteTypes) {
      if (!this.wasteBreakdown[wasteType]) {
        console.warn(`Missing waste type in breakdown: ${wasteType}`);
        return false;
      }
    }

    // Verify totals are non-negative
    const totals = Object.values(this.totals);
    if (totals.some(val => val < 0)) {
      console.warn('Negative values found in totals');
      return false;
    }

    return true;
  }

  /**
   * Get a summary object for logging/debugging
   * @returns {object} Simplified summary
   */
  getSummary() {
    return {
      blastId: this.blastId,
      timestamp: this.timestamp.toISOString(),
      totalOresRecovered: this.totals.totalOresRecovered,
      totalOresLost: this.totals.totalOresLost,
      totalWasteInZone: this.totals.totalWasteInZone,
      totalValueRecovered: this.totals.totalValueRecovered
    };
  }
}

/**
 * ScoreMetrics Class
 * Stores calculated performance metrics and final score
 */
class ScoreMetrics {
  constructor() {
    this.recoveryRate = 0.0;        // Percentage of ores successfully recovered (0-100)
    this.dilutionRate = 0.0;        // Percentage of waste contamination (0-100)
    this.valueRecoveryRate = 0.0;   // Value-weighted recovery rate (0-100)
    this.totalScore = 0.0;          // Weighted final score (0-100)
    this.grade = 'F';               // Letter grade: A/B/C/D/F
    this.performanceTime = 0;       // Milliseconds taken to calculate
  }

  /**
   * Calculate letter grade from total score
   * @param {number} score - Total score (0-100)
   * @returns {string} Letter grade
   */
  static calculateGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Set the total score and automatically calculate grade
   * @param {number} score - Score to set (will be clamped to 0-100)
   */
  setTotalScore(score) {
    // Clamp score to valid range
    this.totalScore = Math.max(0, Math.min(100, score));
    this.grade = ScoreMetrics.calculateGrade(this.totalScore);
  }

  /**
   * Validate that all metrics are in valid ranges
   * @returns {boolean} True if valid, false otherwise
   */
  validate() {
    // Check percentage ranges (0-100)
    const percentages = [
      this.recoveryRate,
      this.dilutionRate,
      this.valueRecoveryRate,
      this.totalScore
    ];

    if (percentages.some(val => val < 0 || val > 100)) {
      console.warn('Score metrics contain values outside 0-100 range');
      return false;
    }

    // Check valid grade
    const validGrades = ['A', 'B', 'C', 'D', 'F'];
    if (!validGrades.includes(this.grade)) {
      console.warn(`Invalid grade: ${this.grade}`);
      return false;
    }

    // Check performance time is non-negative
    if (this.performanceTime < 0) {
      console.warn('Negative performance time');
      return false;
    }

    return true;
  }

  /**
   * Get a formatted summary for display
   * @returns {object} Formatted summary
   */
  getSummary() {
    return {
      grade: this.grade,
      totalScore: this.totalScore.toFixed(2),
      recoveryRate: `${this.recoveryRate.toFixed(2)}%`,
      dilutionRate: `${this.dilutionRate.toFixed(2)}%`,
      valueRecoveryRate: `${this.valueRecoveryRate.toFixed(2)}%`,
      performanceTime: `${this.performanceTime}ms`
    };
  }
}

/**
 * Helper function to create an empty BlastResult
 * Useful for testing and initialization
 * @returns {BlastResult} New empty BlastResult instance
 */
export function createBlastResult() {
  return new BlastResult();
}

/**
 * Helper function to create an empty ScoreMetrics
 * Useful for testing and initialization
 * @returns {ScoreMetrics} New empty ScoreMetrics instance
 */
export function createScoreMetrics() {
  return new ScoreMetrics();
}

/**
 * Generate deterministic hash for blast data
 * Used to create unique blastId for tracking
 * @param {object} blastData - Blast data to hash
 * @returns {string} Hash string
 */
function hashBlastData(blastData) {
  if (!blastData || !blastData.affectedBlocks) {
    return `blast_${Date.now()}_empty`;
  }

  // Create deterministic string from sorted blocks
  const sortedBlocks = [...blastData.affectedBlocks].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  const hashString = sortedBlocks
    .map(block => `${block.x},${block.y},${block.oreType}`)
    .join('|');

  // Simple hash function (DJB2 algorithm)
  let hash = 5381;
  for (let i = 0; i < hashString.length; i++) {
    hash = ((hash << 5) + hash) + hashString.charCodeAt(i);
  }

  return `blast_${Math.abs(hash).toString(16)}`;
}

/**
 * Verify Determinism - TASK 7
 * Tests that the evaluation system produces consistent results for the same input
 * 
 * @param {object} blastData - Blast data to test
 * @param {number} iterations - Number of times to run evaluation (default: 5)
 * @returns {object} { isDeterministic: boolean, hash: string, scores: number[], variance: number }
 */
export function verifyDeterminism(blastData, iterations = 5) {
  // Step 1: Generate deterministic hash
  const hash = hashBlastData(blastData);

  // Step 2: Run evaluateBlast multiple times
  const scores = [];
  const fullResults = [];

  for (let i = 0; i < iterations; i++) {
    const result = evaluateBlast(blastData);
    scores.push(result.totalScore);
    fullResults.push(result);
  }

  // Step 3: Calculate variance
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const variance = maxScore - minScore;

  // Step 4: Determine if deterministic
  const isDeterministic = variance === 0;

  // Step 5: Log detailed error if variance detected
  if (variance > 0.01) {
    console.error('❌ DETERMINISM VIOLATION DETECTED!');
    console.error(`   Hash: ${hash}`);
    console.error(`   Variance: ${variance}`);
    console.error(`   Min Score: ${minScore}`);
    console.error(`   Max Score: ${maxScore}`);
    console.error(`   All Scores: [${scores.join(', ')}]`);
    
    // Find which metrics differ
    const metrics = ['recoveryRate', 'valueRecoveryRate', 'dilutionRate', 'totalScore'];
    for (const metric of metrics) {
      const values = fullResults.map(r => r[metric]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max - min > 0.01) {
        console.error(`   ${metric} varies: [${values.join(', ')}]`);
      }
    }
  } else {
    console.log(`✅ Determinism verified: ${iterations} iterations produced identical results (score: ${scores[0]})`);
  }

  return {
    isDeterministic,
    hash,
    scores,
    variance
  };
}

/**
 * Count Affected Ores - TASK 2
 * Analyzes blast results and categorizes all affected blocks by material type
 * 
 * @param {object} blastData - Blast data containing affectedBlocks array
 * @returns {BlastResult} Complete breakdown of blast outcomes
 */
export function countAffectedOres(blastData) {
  const result = new BlastResult();

  // Edge case: empty or invalid input
  if (!blastData || !blastData.affectedBlocks || blastData.affectedBlocks.length === 0) {
    console.warn('countAffectedOres: Empty or invalid blastData received');
    result.blastId = hashBlastData(blastData);
    return result;
  }

  // Sort blocks for deterministic iteration (by x, then y)
  const sortedBlocks = [...blastData.affectedBlocks].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  // Process each block
  for (const block of sortedBlocks) {
    // Edge case: missing oreType field
    if (!block.oreType) {
      console.error('countAffectedOres: Block missing oreType field', block);
      continue;
    }

    // Normalize material name to canonical key (handles aliases)
    const materialName = normalizeMaterialName(block.oreType);
    if (!materialName) {
      console.warn('countAffectedOres: Unable to normalize material name for block', block);
      continue;
    }

    // Check if this is a valuable ore
    if (isOre(materialName)) {
      // Ensure this ore type exists in breakdown (defensive check)
      if (!result.oreBreakdown[materialName]) {
        console.warn(`countAffectedOres: Unexpected ore type '${materialName}' - initializing`);
        result.oreBreakdown[materialName] = { recovered: 0, lost: 0, displaced: 0 };
      }

      // Categorize based on collection status
      if (block.isInCollectionZone) {
        result.oreBreakdown[materialName].recovered++;
      } else if (block.isDisplaced) {
        result.oreBreakdown[materialName].displaced++;
      } else {
        result.oreBreakdown[materialName].lost++;
      }
    }
    // Check if this is waste material
    else if (isWaste(materialName)) {
      // Ensure this waste type exists in breakdown (defensive check)
      if (!result.wasteBreakdown[materialName]) {
        console.warn(`countAffectedOres: Unexpected waste type '${materialName}' - initializing`);
        result.wasteBreakdown[materialName] = { inZone: 0, total: 0 };
      }

      // Track total waste and zone contamination
      result.wasteBreakdown[materialName].total++;
      if (block.isInCollectionZone) {
        result.wasteBreakdown[materialName].inZone++;
      }
    }
    // Unknown material type
    else {
      console.warn(`countAffectedOres: Unknown material type '${materialName}' - skipping block at (${block.x}, ${block.y})`);
      continue;
    }
  }

  // Calculate totals across all material types
  calculateTotals(result);

  // Set metadata
  result.timestamp = new Date();
  result.blastId = hashBlastData(blastData);

  return result;
}

/**
 * Calculate aggregated totals from ore and waste breakdowns
 * Mutates the BlastResult object in place
 * @param {BlastResult} result - BlastResult to update
 */
function calculateTotals(result) {
  // Reset totals
  result.totals.totalOresAffected = 0;
  result.totals.totalOresRecovered = 0;
  result.totals.totalOresLost = 0;
  result.totals.totalWasteInZone = 0;
  result.totals.totalValueRecovered = 0;

  // Sum ore counts
  const oreTypes = getAllOreTypes();
  for (const oreType of oreTypes) {
    const oreData = result.oreBreakdown[oreType];
    const recovered = oreData.recovered || 0;
    const lost = oreData.lost || 0;
    const displaced = oreData.displaced || 0;

    result.totals.totalOresAffected += recovered + lost + displaced;
    result.totals.totalOresRecovered += recovered;
    result.totals.totalOresLost += lost;

    // Calculate value-weighted recovery
    const oreValue = getOreValue(oreType);
    result.totals.totalValueRecovered += recovered * oreValue;
  }

  // Sum waste in collection zone
  const wasteTypes = getAllWasteTypes();
  for (const wasteType of wasteTypes) {
    const wasteData = result.wasteBreakdown[wasteType] || { inZone: 0 };
    result.totals.totalWasteInZone += wasteData.inZone || 0;
  }
}

/**
 * Calculate Recovery Rate - TASK 3
 * Computes both count-based and value-weighted recovery percentages
 * 
 * @param {BlastResult} blastResult - Blast result from countAffectedOres()
 * @returns {object} Recovery metrics { recoveryRate, valueRecoveryRate }
 */
export function calculateRecoveryRate(blastResult) {
  // Edge case: no ores affected
  if (blastResult.totals.totalOresAffected === 0) {
    return {
      recoveryRate: 0.0,
      valueRecoveryRate: 0.0
    };
  }

  // Calculate count-based recovery rate
  const recoveryRate = (blastResult.totals.totalOresRecovered / blastResult.totals.totalOresAffected) * 100;

  // Calculate total possible value (all affected ores, not just recovered)
  let totalPossibleValue = 0;
  const oreTypes = getAllOreTypes();
  
  for (const oreType of oreTypes) {
    const oreData = blastResult.oreBreakdown[oreType];
    const totalAffected = (oreData.recovered || 0) + (oreData.lost || 0) + (oreData.displaced || 0);
    const oreValue = getOreValue(oreType);
    totalPossibleValue += totalAffected * oreValue;
  }

  // Edge case: no value in affected ores (shouldn't happen with real ore data)
  let valueRecoveryRate = 0.0;
  if (totalPossibleValue > 0) {
    valueRecoveryRate = (blastResult.totals.totalValueRecovered / totalPossibleValue) * 100;
  }

  // Return with 2 decimal precision
  return {
    recoveryRate: parseFloat(recoveryRate.toFixed(2)),
    valueRecoveryRate: parseFloat(valueRecoveryRate.toFixed(2))
  };
}

/**
 * Calculate Dilution Rate - TASK 4
 * Computes the percentage of waste contamination in collected material
 * 
 * @param {BlastResult} blastResult - Blast result from countAffectedOres()
 * @returns {number} Dilution rate as percentage (0-100, 2 decimal places)
 */
export function calculateDilutionRate(blastResult) {
  const totalOresRecovered = blastResult.totals.totalOresRecovered || 0;
  const totalWasteInZone = blastResult.totals.totalWasteInZone || 0;
  const totalCollected = totalOresRecovered + totalWasteInZone;

  // Edge case: nothing collected
  if (totalCollected === 0) {
    return 0.0;
  }

  // Calculate dilution: percentage of collected material that is waste
  const dilutionRate = (totalWasteInZone / totalCollected) * 100;

  // Return with 2 decimal precision
  return parseFloat(dilutionRate.toFixed(2));
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG = {
  useValueWeighting: true,   // Use value-weighted recovery vs simple count
  recoveryWeight: 0.6,       // 60% of score from recovery rate
  valueWeight: 0.2,          // 20% of score from value recovery (bonus for high-value ores)
  dilutionPenalty: 0.2       // 20% penalty for dilution
};

/**
 * Performance target for blast evaluation (milliseconds)
 */
export const PERFORMANCE_TARGET_MS = 3000;

/**
 * Calculate Final Score - TASK 5
 * Combines recovery and dilution rates into weighted final score with letter grade
 * 
 * @param {number} recoveryRate - Count-based recovery percentage (0-100)
 * @param {number} valueRecoveryRate - Value-weighted recovery percentage (0-100)
 * @param {number} dilutionRate - Dilution percentage (0-100)
 * @param {object} config - Scoring configuration (optional, uses DEFAULT_SCORING_CONFIG if not provided)
 * @returns {object} { totalScore: number, grade: string }
 */
export function calculateFinalScore(recoveryRate, valueRecoveryRate, dilutionRate, config = DEFAULT_SCORING_CONFIG) {
  // Merge provided config with defaults
  const scoringConfig = { ...DEFAULT_SCORING_CONFIG, ...config };

  let score = 0;

  if (scoringConfig.useValueWeighting) {
    // Value-weighted formula: prioritizes high-value ore recovery
    score = (recoveryRate * scoringConfig.recoveryWeight) +
            (valueRecoveryRate * scoringConfig.valueWeight) -
            (dilutionRate * scoringConfig.dilutionPenalty);
  } else {
    // Simple formula: only count-based recovery and dilution
    score = (recoveryRate * 0.7) - (dilutionRate * 0.3);
  }

  // Clamp score to valid range [0, 100]
  const finalScore = Math.max(0, Math.min(100, score));

  // Calculate letter grade
  const grade = ScoreMetrics.calculateGrade(finalScore);

  // Return with 2 decimal precision
  return {
    totalScore: parseFloat(finalScore.toFixed(2)),
    grade: grade
  };
}

/**
 * Evaluate Blast - TASK 6
 * Main orchestrator function that evaluates blast performance
 * Combines all evaluation steps and monitors performance
 * 
 * @param {object} blastData - Blast data with affectedBlocks array
 * @param {object} config - Scoring configuration (optional, uses DEFAULT_SCORING_CONFIG if not provided)
 * @returns {object} Complete ScoreMetrics with breakdown
 */
export function evaluateBlast(blastData, config = DEFAULT_SCORING_CONFIG) {
  // Step 1: Start performance monitoring
  const startTime = performance.now();

  // Step 2: Count affected ores and waste
  const blastResult = countAffectedOres(blastData);

  // Step 3: Calculate recovery rates (count-based and value-weighted)
  const { recoveryRate, valueRecoveryRate } = calculateRecoveryRate(blastResult);

  // Step 4: Calculate dilution rate
  const dilutionRate = calculateDilutionRate(blastResult);

  // Step 5: Calculate final weighted score and grade
  const { totalScore, grade } = calculateFinalScore(
    recoveryRate,
    valueRecoveryRate,
    dilutionRate,
    config
  );

  // Step 6: End performance monitoring
  const endTime = performance.now();
  const performanceTime = Math.round(endTime - startTime);

  // Step 7: Performance validation and logging
  console.log(`✅ Blast evaluated in ${performanceTime}ms`);
  
  if (performanceTime > PERFORMANCE_TARGET_MS) {
    console.warn(`⚠️ Performance target exceeded! Target: ${PERFORMANCE_TARGET_MS}ms, Actual: ${performanceTime}ms`);
  }

  // Step 8: Return complete ScoreMetrics with breakdown
  return {
    // Core metrics
    recoveryRate,
    dilutionRate,
    valueRecoveryRate,
    totalScore,
    grade,
    performanceTime,
    
    // Detailed breakdown
    breakdown: blastResult,
    
    // Metadata
    timestamp: blastResult.timestamp,
    blastId: blastResult.blastId,
    
    // Helper methods
    getSummary() {
      return {
        blastId: this.blastId,
        grade: this.grade,
        totalScore: this.totalScore.toFixed(2),
        recoveryRate: `${this.recoveryRate.toFixed(2)}%`,
        valueRecoveryRate: `${this.valueRecoveryRate.toFixed(2)}%`,
        dilutionRate: `${this.dilutionRate.toFixed(2)}%`,
        performanceTime: `${this.performanceTime}ms`,
        oresRecovered: this.breakdown.totals.totalOresRecovered,
        oresLost: this.breakdown.totals.totalOresLost,
        wasteInZone: this.breakdown.totals.totalWasteInZone,
        valueRecovered: this.breakdown.totals.totalValueRecovered
      };
    },
    
    getDetailedBreakdown() {
      return {
        summary: this.getSummary(),
        oreBreakdown: this.breakdown.oreBreakdown,
        wasteBreakdown: this.breakdown.wasteBreakdown
      };
    }
  };
}

// Export classes and helpers
export { BlastResult, ScoreMetrics, hashBlastData };
