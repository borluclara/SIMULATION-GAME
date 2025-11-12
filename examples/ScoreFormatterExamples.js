/**
 * ScoreFormatter Usage Examples
 * Demonstrates how to use the score formatting utilities in your UI
 */

import { evaluateBlast, countAffectedOres } from '../src/utils/BlastEvaluator.js';
import { 
  formatScoreDisplay, 
  getScoreDescription, 
  getRecommendations,
  createCompactSummary 
} from '../src/utils/ScoreFormatter.js';

// ============================================================================
// Example 1: Simple Score Display
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 1: Simple Score Display');
console.log('='.repeat(70));

const simpleBlast = {
  affectedBlocks: [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 1, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 2, y: 0, oreType: 'chalcopyrite', isInCollectionZone: true, isDisplaced: false },
    { x: 3, y: 0, oreType: 'hematite', isInCollectionZone: false, isDisplaced: false },
    { x: 4, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false }
  ]
};

const scoreMetrics = evaluateBlast(simpleBlast);
const simpleFormat = formatScoreDisplay(scoreMetrics);

console.log('\nSimple Format Output:');
console.log(JSON.stringify(simpleFormat, null, 2));

console.log('\nHow to use in UI:');
console.log(`
// React example:
function ScorePanel({ scoreMetrics }) {
  const formatted = formatScoreDisplay(scoreMetrics);
  
  return (
    <div className="score-panel">
      <div className={formatted.data['Grade'].colorClass}>
        Grade: {formatted.data['Grade'].value}
      </div>
      <div>Score: {formatted.data['Total Score'].value}</div>
      <div className={formatted.data['Recovery Rate'].colorClass}>
        Recovery: {formatted.data['Recovery Rate'].value}
      </div>
      <div className={formatted.data['Dilution Rate'].colorClass}>
        Dilution: {formatted.data['Dilution Rate'].value}
      </div>
      <small>Evaluated in {formatted.data['Performance'].value}</small>
    </div>
  );
}
`);

// ============================================================================
// Example 2: Detailed Score Display with Breakdowns
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 2: Detailed Score Display');
console.log('='.repeat(70));

const detailedBlast = {
  affectedBlocks: [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 1, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false },
    { x: 2, y: 0, oreType: 'gold', isInCollectionZone: false, isDisplaced: false },
    { x: 3, y: 0, oreType: 'chalcopyrite', isInCollectionZone: true, isDisplaced: false },
    { x: 4, y: 0, oreType: 'chalcopyrite', isInCollectionZone: true, isDisplaced: false },
    { x: 5, y: 0, oreType: 'hematite', isInCollectionZone: true, isDisplaced: false },
    { x: 6, y: 0, oreType: 'magnetite', isInCollectionZone: false, isDisplaced: true },
    { x: 7, y: 0, oreType: 'granite', isInCollectionZone: true, isDisplaced: false },
    { x: 8, y: 0, oreType: 'limestone', isInCollectionZone: false, isDisplaced: true },
    { x: 9, y: 0, oreType: 'sandstone', isInCollectionZone: true, isDisplaced: false }
  ]
};

const detailedMetrics = evaluateBlast(detailedBlast);
const blastResult = countAffectedOres(detailedBlast);
const detailedFormat = formatScoreDisplay(detailedMetrics, blastResult, true);

console.log('\nDetailed Format Output (Ore Breakdown):');
console.log(JSON.stringify(detailedFormat.data['Ore Breakdown'], null, 2));

console.log('\nDetailed Format Output (Waste Breakdown):');
console.log(JSON.stringify(detailedFormat.data['Waste Breakdown'], null, 2));

console.log('\nDetailed Format Output (Totals):');
console.log(JSON.stringify(detailedFormat.data['Totals'], null, 2));

console.log('\nHow to use in UI:');
console.log(`
// React example:
function DetailedScorePanel({ scoreMetrics, blastResult }) {
  const formatted = formatScoreDisplay(scoreMetrics, blastResult, true);
  
  return (
    <div className="detailed-score-panel">
      <h2 className={formatted.data['Grade'].colorClass}>
        Grade {formatted.data['Grade'].value}
      </h2>
      
      <div className="metrics">
        <div>Recovery: {formatted.data['Recovery Rate'].value}</div>
        <div>Value Recovery: {formatted.data['Value Recovery'].value}</div>
        <div>Dilution: {formatted.data['Dilution Rate'].value}</div>
        <div>Score: {formatted.data['Total Score'].value}</div>
      </div>
      
      <h3>Ore Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Ore</th>
            <th>Recovered</th>
            <th>Lost</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(formatted.data['Ore Breakdown']).map(([ore, data]) => (
            <tr key={ore}>
              <td>{ore}</td>
              <td>{data.recovered}</td>
              <td>{data.lost}</td>
              <td>💰{data.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <h3>Waste Breakdown</h3>
      <ul>
        {Object.entries(formatted.data['Waste Breakdown']).map(([waste, data]) => (
          <li key={waste}>
            {waste}: {data.inZone} in collection zone (of {data.total} total)
          </li>
        ))}
      </ul>
    </div>
  );
}
`);

// ============================================================================
// Example 3: Score Description and Recommendations
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 3: Score Description and Recommendations');
console.log('='.repeat(70));

const description = getScoreDescription(detailedMetrics.totalScore);
const recommendations = getRecommendations(detailedMetrics);

console.log('\nScore Description:');
console.log(`  "${description}"`);

console.log('\nRecommendations:');
recommendations.forEach((rec, i) => {
  console.log(`  ${i + 1}. ${rec}`);
});

console.log('\nHow to use in UI:');
console.log(`
// React example:
function ScoreFeedback({ scoreMetrics }) {
  const description = getScoreDescription(scoreMetrics.totalScore);
  const recommendations = getRecommendations(scoreMetrics);
  
  return (
    <div className="score-feedback">
      <p className="description">{description}</p>
      
      <h4>Recommendations:</h4>
      <ul>
        {recommendations.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ul>
    </div>
  );
}
`);

// ============================================================================
// Example 4: Compact Summary for Notifications
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 4: Compact Summary');
console.log('='.repeat(70));

const compact = createCompactSummary(detailedMetrics);

console.log('\nCompact Summary:');
console.log(`  ${compact}`);

console.log('\nHow to use in UI:');
console.log(`
// Toast notification example:
function showBlastComplete(scoreMetrics) {
  const summary = createCompactSummary(scoreMetrics);
  
  toast.success('Blast Complete!', {
    description: summary,
    duration: 5000
  });
}

// Chat/log message example:
function logBlastResult(playerName, scoreMetrics) {
  const summary = createCompactSummary(scoreMetrics);
  
  addChatMessage({
    author: 'System',
    message: \`\${playerName} completed a blast: \${summary}\`,
    timestamp: Date.now()
  });
}
`);

// ============================================================================
// Example 5: Color-Coded Score Display
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 5: Color-Coded Display');
console.log('='.repeat(70));

console.log('\nCSS Classes for Color Coding:');
console.log(`
.excellent { color: #00ff00; background: rgba(0, 255, 0, 0.1); }
.good      { color: #90ee90; background: rgba(144, 238, 144, 0.1); }
.fair      { color: #ffff00; background: rgba(255, 255, 0, 0.1); }
.poor      { color: #ff8800; background: rgba(255, 136, 0, 0.1); }
.terrible  { color: #ff0000; background: rgba(255, 0, 0, 0.1); }
`);

console.log('How to apply in UI:');
console.log(`
// React example with Tailwind-like classes:
function ColorCodedScore({ scoreMetrics }) {
  const formatted = formatScoreDisplay(scoreMetrics);
  
  // Color classes map
  const colorMap = {
    excellent: 'bg-green-100 text-green-800 border-green-500',
    good: 'bg-blue-100 text-blue-800 border-blue-500',
    fair: 'bg-yellow-100 text-yellow-800 border-yellow-500',
    poor: 'bg-orange-100 text-orange-800 border-orange-500',
    terrible: 'bg-red-100 text-red-800 border-red-500'
  };
  
  const gradeClass = colorMap[formatted.data['Grade'].colorClass];
  const scoreClass = colorMap[formatted.data['Total Score'].colorClass];
  
  return (
    <div className="score-display">
      <div className={\`grade-badge \${gradeClass}\`}>
        <span className="text-4xl font-bold">
          {formatted.data['Grade'].value}
        </span>
      </div>
      
      <div className={\`score-value \${scoreClass}\`}>
        {formatted.data['Total Score'].value}
      </div>
      
      <div className="metrics-grid">
        <Metric 
          label="Recovery" 
          value={formatted.data['Recovery Rate'].value}
          colorClass={formatted.data['Recovery Rate'].colorClass}
        />
        <Metric 
          label="Dilution" 
          value={formatted.data['Dilution Rate'].value}
          colorClass={formatted.data['Dilution Rate'].colorClass}
        />
      </div>
    </div>
  );
}
`);

// ============================================================================
// Example 6: Integration with Game State
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('EXAMPLE 6: Integration with Game State');
console.log('='.repeat(70));

console.log('\nComplete Integration Example:');
console.log(`
import { evaluateBlast, countAffectedOres } from '@/utils/BlastEvaluator';
import { formatScoreDisplay, getRecommendations } from '@/utils/ScoreFormatter';
import { storeScore } from '@/utils/ScoreStorage';

// In your blast execution handler:
async function handleBlastExecution(blastData, playerID) {
  // 1. Evaluate the blast
  const scoreMetrics = evaluateBlast(blastData);
  const blastResult = countAffectedOres(blastData);
  
  // 2. Format for display
  const formatted = formatScoreDisplay(scoreMetrics, blastResult, true);
  
  // 3. Store in history
  storeScore(playerID, scoreMetrics, blastResult.blastId, blastResult);
  
  // 4. Update UI
  setCurrentScore(formatted);
  setScoreDescription(getScoreDescription(scoreMetrics.totalScore));
  setRecommendations(getRecommendations(scoreMetrics));
  
  // 5. Show notification
  const compact = createCompactSummary(scoreMetrics);
  toast.success('Blast Complete!', { description: compact });
  
  // 6. Trigger animations based on grade
  if (scoreMetrics.grade === 'A') {
    playConfetti();
  } else if (scoreMetrics.grade === 'F') {
    playFailureAnimation();
  }
  
  return formatted;
}
`);

console.log('\n' + '='.repeat(70));
console.log('📚 For more examples, see the test files and documentation');
console.log('='.repeat(70) + '\n');
