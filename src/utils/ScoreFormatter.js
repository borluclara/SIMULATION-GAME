/**
 * ScoreFormatter.js
 * UI-agnostic formatting utilities for blast evaluation results
 * 
 * Provides structured data for UI components to display scores,
 * breakdowns, and performance metrics with color coding hints.
 */

import { getAllOreTypes, getAllWasteTypes, getOreValue } from './OreClassification.js';

/**
 * Get color coding class based on score value
 * @param {number} score - Score value (0-100)
 * @returns {string} CSS class hint ('excellent', 'good', 'fair', 'poor', 'terrible')
 */
export function getScoreColorClass(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 50) return 'poor';
  return 'terrible';
}

/**
 * Get color coding class for grade
 * @param {string} grade - Letter grade (A/B/C/D/F)
 * @returns {string} CSS class hint
 */
export function getGradeColorClass(grade) {
  const gradeMap = {
    'A': 'excellent',
    'B': 'good',
    'C': 'fair',
    'D': 'poor',
    'F': 'terrible'
  };
  return gradeMap[grade] || 'terrible';
}

/**
 * Get color coding class for recovery rate
 * @param {number} rate - Recovery rate percentage (0-100)
 * @returns {string} CSS class hint
 */
export function getRecoveryColorClass(rate) {
  if (rate >= 90) return 'excellent';
  if (rate >= 75) return 'good';
  if (rate >= 60) return 'fair';
  if (rate >= 40) return 'poor';
  return 'terrible';
}

/**
 * Get color coding class for dilution rate (inverted - lower is better)
 * @param {number} rate - Dilution rate percentage (0-100)
 * @returns {string} CSS class hint
 */
export function getDilutionColorClass(rate) {
  if (rate <= 10) return 'excellent';
  if (rate <= 25) return 'good';
  if (rate <= 40) return 'fair';
  if (rate <= 60) return 'poor';
  return 'terrible';
}

/**
 * Get color coding class for performance time
 * @param {number} ms - Time in milliseconds
 * @returns {string} CSS class hint
 */
export function getPerformanceColorClass(ms) {
  if (ms < 10) return 'excellent';
  if (ms < 50) return 'good';
  if (ms < 100) return 'fair';
  if (ms < 1000) return 'poor';
  return 'terrible';
}

/**
 * Format a percentage value
 * @param {number} value - Numeric value (0-100)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.00%';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a score value
 * @param {number} value - Numeric value (0-100)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted score string
 */
export function formatScore(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(decimals);
}

/**
 * Format performance time
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatPerformanceTime(ms) {
  if (typeof ms !== 'number' || isNaN(ms)) {
    return '0ms';
  }
  
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Format ore breakdown from BlastResult
 * @param {object} oreBreakdown - Ore breakdown object from BlastResult
 * @returns {object} Formatted ore breakdown with value calculations
 */
export function formatOreBreakdown(oreBreakdown) {
  if (!oreBreakdown) {
    return {};
  }
  
  const formatted = {};
  const oreTypes = getAllOreTypes();
  
  for (const oreType of oreTypes) {
    const data = oreBreakdown[oreType];
    if (!data) continue;
    
    const oreValue = getOreValue(oreType);
    const recovered = data.recovered || 0;
    const lost = data.lost || 0;
    const displaced = data.displaced || 0;
    const totalValue = recovered * oreValue;
    
    // Capitalize ore type for display
    const displayName = oreType.charAt(0).toUpperCase() + oreType.slice(1);
    
    formatted[displayName] = {
      recovered,
      lost,
      displaced,
      total: recovered + lost + displaced,
      value: totalValue,
      unitValue: oreValue
    };
  }
  
  return formatted;
}

/**
 * Format waste breakdown from BlastResult
 * @param {object} wasteBreakdown - Waste breakdown object from BlastResult
 * @returns {object} Formatted waste breakdown
 */
export function formatWasteBreakdown(wasteBreakdown) {
  if (!wasteBreakdown) {
    return {};
  }
  
  const formatted = {};
  const wasteTypes = getAllWasteTypes();
  
  for (const wasteType of wasteTypes) {
    const data = wasteBreakdown[wasteType];
    if (!data) continue;
    
    // Capitalize waste type for display
    const displayName = wasteType.charAt(0).toUpperCase() + wasteType.slice(1);
    
    formatted[displayName] = {
      inZone: data.inZone || 0,
      total: data.total || 0
    };
  }
  
  return formatted;
}

/**
 * Format score display (main function)
 * @param {ScoreMetrics} scoreMetrics - Score metrics from evaluateBlast()
 * @param {BlastResult} blastResult - Optional blast result for detailed breakdown
 * @param {boolean} detailedBreakdown - Include detailed ore/waste breakdown
 * @returns {object} Formatted score data structure
 */
export function formatScoreDisplay(scoreMetrics, blastResult = null, detailedBreakdown = false) {
  // Validate input
  if (!scoreMetrics) {
    console.error('formatScoreDisplay: scoreMetrics is required');
    return null;
  }
  
  // Simple format
  const simpleFormat = {
    'Recovery Rate': {
      value: formatPercentage(scoreMetrics.recoveryRate),
      raw: scoreMetrics.recoveryRate,
      colorClass: getRecoveryColorClass(scoreMetrics.recoveryRate)
    },
    'Dilution Rate': {
      value: formatPercentage(scoreMetrics.dilutionRate),
      raw: scoreMetrics.dilutionRate,
      colorClass: getDilutionColorClass(scoreMetrics.dilutionRate)
    },
    'Total Score': {
      value: formatScore(scoreMetrics.totalScore),
      raw: scoreMetrics.totalScore,
      colorClass: getScoreColorClass(scoreMetrics.totalScore)
    },
    'Grade': {
      value: scoreMetrics.grade,
      raw: scoreMetrics.grade,
      colorClass: getGradeColorClass(scoreMetrics.grade)
    },
    'Performance': {
      value: formatPerformanceTime(scoreMetrics.performanceTime),
      raw: scoreMetrics.performanceTime,
      colorClass: getPerformanceColorClass(scoreMetrics.performanceTime)
    }
  };
  
  // Return simple format if detailed breakdown not requested
  if (!detailedBreakdown) {
    return {
      type: 'simple',
      data: simpleFormat,
      metadata: {
        timestamp: new Date().toISOString(),
        grade: scoreMetrics.grade,
        scoreClass: getScoreColorClass(scoreMetrics.totalScore)
      }
    };
  }
  
  // Detailed format
  if (!blastResult) {
    console.warn('formatScoreDisplay: blastResult required for detailed breakdown, falling back to simple format');
    return {
      type: 'simple',
      data: simpleFormat,
      metadata: {
        timestamp: new Date().toISOString(),
        grade: scoreMetrics.grade,
        scoreClass: getScoreColorClass(scoreMetrics.totalScore)
      }
    };
  }
  
  const detailedFormat = {
    'Recovery Rate': {
      value: formatPercentage(scoreMetrics.recoveryRate),
      raw: scoreMetrics.recoveryRate,
      colorClass: getRecoveryColorClass(scoreMetrics.recoveryRate)
    },
    'Value Recovery': {
      value: formatPercentage(scoreMetrics.valueRecoveryRate),
      raw: scoreMetrics.valueRecoveryRate,
      colorClass: getRecoveryColorClass(scoreMetrics.valueRecoveryRate)
    },
    'Dilution Rate': {
      value: formatPercentage(scoreMetrics.dilutionRate),
      raw: scoreMetrics.dilutionRate,
      colorClass: getDilutionColorClass(scoreMetrics.dilutionRate)
    },
    'Total Score': {
      value: formatScore(scoreMetrics.totalScore),
      raw: scoreMetrics.totalScore,
      colorClass: getScoreColorClass(scoreMetrics.totalScore)
    },
    'Grade': {
      value: scoreMetrics.grade,
      raw: scoreMetrics.grade,
      colorClass: getGradeColorClass(scoreMetrics.grade)
    },
    'Ore Breakdown': formatOreBreakdown(blastResult.oreBreakdown),
    'Waste Breakdown': formatWasteBreakdown(blastResult.wasteBreakdown),
    'Totals': {
      'Total Ores Affected': blastResult.totals.totalOresAffected || 0,
      'Total Ores Recovered': blastResult.totals.totalOresRecovered || 0,
      'Total Ores Lost': blastResult.totals.totalOresLost || 0,
      'Total Waste In Zone': blastResult.totals.totalWasteInZone || 0,
      'Total Value Recovered': blastResult.totals.totalValueRecovered || 0,
      'Total Value Lost': blastResult.totals.totalValueLost || 0
    },
    'Performance': {
      value: formatPerformanceTime(scoreMetrics.performanceTime),
      raw: scoreMetrics.performanceTime,
      colorClass: getPerformanceColorClass(scoreMetrics.performanceTime)
    }
  };
  
  return {
    type: 'detailed',
    data: detailedFormat,
    metadata: {
      timestamp: blastResult.timestamp || new Date().toISOString(),
      blastId: blastResult.blastId || 'unknown',
      grade: scoreMetrics.grade,
      scoreClass: getScoreColorClass(scoreMetrics.totalScore)
    }
  };
}

/**
 * Get a human-readable description of the score
 * @param {number} score - Total score (0-100)
 * @returns {string} Description text
 */
export function getScoreDescription(score) {
  if (score >= 90) {
    return 'Excellent blast! Maximum ore recovery with minimal contamination.';
  } else if (score >= 75) {
    return 'Good blast. High recovery rate with acceptable dilution.';
  } else if (score >= 60) {
    return 'Fair blast. Decent recovery but some improvement needed.';
  } else if (score >= 50) {
    return 'Poor blast. Low recovery or high contamination.';
  } else {
    return 'Terrible blast. Significant ore loss or excessive waste.';
  }
}

/**
 * Get recommendations based on score metrics
 * @param {ScoreMetrics} scoreMetrics - Score metrics from evaluateBlast()
 * @returns {string[]} Array of recommendation strings
 */
export function getRecommendations(scoreMetrics) {
  const recommendations = [];
  
  if (scoreMetrics.recoveryRate < 60) {
    recommendations.push('Improve blast placement to recover more ore');
  }
  
  if (scoreMetrics.dilutionRate > 30) {
    recommendations.push('Reduce waste contamination in collection zone');
  }
  
  if (scoreMetrics.valueRecoveryRate < scoreMetrics.recoveryRate - 10) {
    recommendations.push('Focus on recovering high-value ores like gold');
  }
  
  if (scoreMetrics.performanceTime > 1000) {
    recommendations.push('Performance warning: evaluation took over 1 second');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Excellent work! Keep up the good blasting technique.');
  }
  
  return recommendations;
}

/**
 * Create a compact summary string for logging or notifications
 * @param {ScoreMetrics} scoreMetrics - Score metrics from evaluateBlast()
 * @returns {string} Compact summary string
 */
export function createCompactSummary(scoreMetrics) {
  return `Grade ${scoreMetrics.grade} | Score: ${formatScore(scoreMetrics.totalScore)} | ` +
         `Recovery: ${formatPercentage(scoreMetrics.recoveryRate)} | ` +
         `Dilution: ${formatPercentage(scoreMetrics.dilutionRate)} | ` +
         `Time: ${formatPerformanceTime(scoreMetrics.performanceTime)}`;
}

/**
 * Export all formatting utilities as default
 */
export default {
  formatScoreDisplay,
  formatOreBreakdown,
  formatWasteBreakdown,
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
};
