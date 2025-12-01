import { serializeGrid } from './GridSerializer';
import { normalizeMaterialName, isOre } from './OreClassification.js';
/**
 * Global Game State Management - FIXED
 * Properly handles OreGrid object structure
 */

const ORE_COLLECTION_RATIO = 0.65;
const WASTE_COLLECTION_RATIO = 0.5;

const buildScoringMetadata = (block, blast, radius) => {
  const rawMaterial = block?.oreType || block?.material || 'unknown';
  const material = normalizeMaterialName(rawMaterial) || 'unknown';
  const dx = (block?.x ?? 0) - (blast?.x ?? 0);
  const dy = (block?.y ?? 0) - (blast?.y ?? 0);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radiusValue = typeof radius === 'number' && radius > 0 ? radius : 1;
  const distanceRatio = Math.min(1, radiusValue > 0 ? distance / radiusValue : 1);
  const oreFlag = isOre(material);
  const collectionThreshold = oreFlag ? ORE_COLLECTION_RATIO : WASTE_COLLECTION_RATIO;
  const isInCollectionZone = distanceRatio <= collectionThreshold;
  const isDisplaced = !isInCollectionZone && distanceRatio <= 1;

  return {
    material,
    distance,
    oreFlag,
    isInCollectionZone,
    isDisplaced
  };
};

export class GameState {
  constructor() {
    this.state = {
      playerName: "",
      score: 0,
      currentScenario: null,
      blasts: [],
      grid: null,
      maxBlasts: 5,
      blastRadius: 5
    };
    
    this.listeners = [];
  }

  static getInstance() {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  getState() {
    return { ...this.state };
  }

  setPlayerName(playerName) {
    this.state.playerName = playerName;
    this.notifyListeners();
  }

  setScore(score) {
    this.state.score = score;
    this.notifyListeners();
  }

  addScore(points) {
    this.state.score += points;
    this.notifyListeners();
  }

  setCurrentScenario(scenario) {
    this.state.currentScenario = scenario;
    this.notifyListeners();
  }

  reset(keepPlayerName = true) {
    const currentPlayerName = this.state.playerName;
    this.state = {
      playerName: keepPlayerName ? currentPlayerName : "",
      score: 0,
      currentScenario: null,
      blasts: [],
      grid: null,
      maxBlasts: 5,
      blastRadius: 5
    };
    this.notifyListeners();
  }

  fullReset() {
    this.reset(false);
  }

  addBlast(x, y, direction = 90) {
    if (this.state.blasts.length < this.state.maxBlasts) {
      this.state.blasts.push({ 
        x, 
        y, 
        direction, 
        id: Date.now() 
      });
      this.notifyListeners();
      return true;
    }
    return false;
  }

  removeBlast(blastId) {
    this.state.blasts = this.state.blasts.filter(blast => blast.id !== blastId);
    this.notifyListeners();
  }

  getBlasts() {
    return [...this.state.blasts];
  }

  clearBlasts() {
    this.state.blasts = [];
    this.notifyListeners();
  }

  canPlaceBlast() {
    return this.state.blasts.length < this.state.maxBlasts;
  }

  setGrid(grid) {
    this.state.grid = grid;
    this.notifyListeners();
  }

  getGrid() {
    return this.state.grid;
  }

  // Execute blast detonation with directional support
  triggerBlasts() {
    const blasts = [...this.state.blasts];
    const grid = this.state.grid;
    const gridBeforeSnapshot = grid ? serializeGrid(grid) : null;
    
    if (!grid || blasts.length === 0) {
      console.warn('No grid or blasts available');
      return { blasts: [], affectedCells: [], destroyedCells: [] };
    }

    let allAffectedCells = [];
    let allDestroyedCells = [];
    const radius = this.state.blastRadius;
    const power = 200; // Increased blast power to ensure destruction

    console.log('Processing directional blasts:', {
      blastCount: blasts.length,
      radius: radius,
      power: power,
      hasDirections: blasts.some(b => b.direction !== undefined)
    });

    // Process each blast with its individual direction
    blasts.forEach(blast => {
      console.log(`Processing blast at (${blast.x}, ${blast.y}) with direction ${blast.direction}°`);
      
      // Use OreGrid's applyBlast method with direction support
      const blastResult = grid.applyBlast(blast.x, blast.y, radius, power, blast.direction);
      
      // Convert affected blocks to the format expected by physics engine and scoring pipeline
      const affectedCells = blastResult.affectedBlocks.map(block => {
        const scoringMeta = buildScoringMetadata(block, blast, radius);
        return {
          x: block.x,
          y: block.y,
          distance: scoringMeta.distance,
          blastId: blast.id,
          blastDirection: blast.direction, // Include direction for physics
          originalMaterial: scoringMeta.material,
          oreType: scoringMeta.material,
          isOre: scoringMeta.oreFlag,
          isInCollectionZone: scoringMeta.isInCollectionZone,
          isDisplaced: scoringMeta.isDisplaced,
          value: typeof block.value === 'number' ? block.value : undefined,
          blastRadius: radius
        };
      });

      // Convert destroyed blocks with scoring metadata for highlights
      const destroyedCells = blastResult.destroyedBlocks.map(block => {
        const scoringMeta = buildScoringMetadata(block, blast, radius);
        return {
          x: block.x,
          y: block.y,
          material: scoringMeta.material,
          oreType: scoringMeta.material,
          blastDirection: blast.direction, // Include direction for physics
          distance: scoringMeta.distance,
          isInCollectionZone: scoringMeta.isInCollectionZone,
          isDisplaced: scoringMeta.isDisplaced,
          blastRadius: radius
        };
      });

      allAffectedCells.push(...affectedCells);
      allDestroyedCells.push(...destroyedCells);
    });

    console.log('Directional blast results:', {
      blastsProcessed: blasts.length,
      cellsAffected: allAffectedCells.length,
      cellsDestroyed: allDestroyedCells.length,
      directionsUsed: blasts.map(b => b.direction)
    });

    // Add blast radius to each blast for the summary
    const blastsWithRadius = blasts.map(blast => ({
      ...blast,
      radius: radius
    }));

    // Clear blasts after detonation
    this.clearBlasts();
    
    const gridAfterSnapshot = grid ? serializeGrid(grid) : null;

    return { 
      blasts: blastsWithRadius, 
      affectedCells: allAffectedCells, 
      destroyedCells: allDestroyedCells,
      blastRadius: radius,
      gridBeforeSnapshot,
      gridAfterSnapshot
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.getState());
    });
  }

  getPlayerName() {
    return this.state.playerName;
  }

  getScore() {
    return this.state.score;
  }

  getCurrentScenario() {
    return this.state.currentScenario;
  }

  hasPlayerName() {
    return this.state.playerName.trim().length > 0;
  }

  export() {
    return JSON.stringify(this.state, null, 2);
  }

  import(stateJson) {
    try {
      const importedState = JSON.parse(stateJson);
      this.state = {
        playerName: importedState.playerName || "",
        score: importedState.score || 0,
        currentScenario: importedState.currentScenario || null,
        blasts: importedState.blasts || [],
        grid: importedState.grid || null,
        maxBlasts: importedState.maxBlasts || 5,
        blastRadius: importedState.blastRadius || 3
      };
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to import game state:', error);
      return false;
    }
  }
}

export const gameState = GameState.getInstance();
export default gameState;