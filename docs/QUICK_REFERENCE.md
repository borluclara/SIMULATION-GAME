# Blast Evaluator Quick Reference

**One-page quick reference for common operations**

---

## Quick Imports

```javascript
import { evaluateBlast, countAffectedOres } from '@/utils/BlastEvaluator.js';
import { storeScore, getTopScores } from '@/utils/ScoreStorage.js';
import { formatScoreDisplay } from '@/utils/ScoreFormatter.js';
```

---

## Basic Evaluation

```javascript
const blastData = {
  affectedBlocks: [
    { x: 0, y: 0, oreType: 'gold', isInCollectionZone: true, isDisplaced: false }
  ]
};

const result = evaluateBlast(blastData);
// → { totalScore: 75.5, grade: 'B', recoveryRate: 85, ... }
```

---

## Material Types

**Ores:** `gold` (100), `hematite` (50), `magnetite` (45), `chalcopyrite` (40)  
**Waste:** `granite`, `limestone`, `sandstone`, `basalt`, `soil` (all 0 value)

---

## Scoring Formula

```
score = (recovery × 0.6) + (valueRecovery × 0.2) - (dilution × 0.2)
```

**Grades:** A (90+), B (75-89), C (60-74), D (50-59), F (0-49)

---

## Common Operations

### Evaluate & Display

```javascript
const metrics = evaluateBlast(blastData);
const formatted = formatScoreDisplay(metrics);
console.log(`Grade ${formatted.data['Grade'].value}`);
```

### Store & Retrieve

```javascript
storeScore('player1', metrics, blastHash);
const top10 = getTopScores(10);
const recent = getRecentScores(5, 'player1');
```

### Detailed Breakdown

```javascript
const blastResult = countAffectedOres(blastData);
console.log(`Gold: ${blastResult.oreBreakdown.gold.recovered}`);
console.log(`Value: $${blastResult.totals.totalValueRecovered}`);
```

---

## Custom Scoring

```javascript
const config = {
  recoveryWeight: 0.8,
  valueWeight: 0.1,
  dilutionPenalty: 0.1
};

const result = evaluateBlast(blastData, config);
```

---

## Performance

- **50 blocks:** ~0.5ms
- **200 blocks:** ~1.3ms
- **1,000 blocks:** ~2.7ms
- **10,000 blocks:** ~10ms

All <3000ms ✅

---

## Testing

```bash
node tests/BlastEvaluator.test.js      # Unit tests
node benchmarks/BlastEvaluator.bench.js # Performance
```

---

## Color Classes

`excellent` (90+) | `good` (75-89) | `fair` (60-74) | `poor` (50-59) | `terrible` (0-49)

---

**See full docs:** `/docs/BlastEvaluatorAPI.md`
