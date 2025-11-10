/**
 * Global Game State Management - FIXED
 * Properly handles OreGrid object structure
 */

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
    
    if (!grid || blasts.length === 0) {
      console.warn('No grid or blasts available');
      return { blasts: [], affectedCells: [] };
    }

    let allAffectedCells = [];
    let allDestroyedCells = [];
    const radius = this.state.blastRadius;
    const power = 100; // Standard blast power

    console.log('Processing directional blasts:', {
      blastCount: blasts.length,
      radius: radius,
      hasDirections: blasts.some(b => b.direction !== undefined)
    });

    // Process each blast with its individual direction
    blasts.forEach(blast => {
      console.log(`Processing blast at (${blast.x}, ${blast.y}) with direction ${blast.direction}°`);
      
      // Use OreGrid's applyBlast method with direction support
      const blastResult = grid.applyBlast(blast.x, blast.y, radius, power, blast.direction);
      
      // Convert affected blocks to the format expected by physics engine
      const affectedCells = blastResult.affectedBlocks.map(block => ({
        x: block.x,
        y: block.y,
        distance: Math.sqrt((block.x - blast.x) ** 2 + (block.y - blast.y) ** 2),
        blastId: blast.id,
        blastDirection: blast.direction, // Include direction for physics
        originalMaterial: block.oreType || block.material || 'unknown'
      }));

      // Convert destroyed blocks
      const destroyedCells = blastResult.destroyedBlocks.map(block => ({
        x: block.x,
        y: block.y,
        material: block.oreType || block.material || 'unknown',
        blastDirection: blast.direction // Include direction for physics
      }));

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
    
    return { 
      blasts: blastsWithRadius, 
      affectedCells: allAffectedCells, 
      destroyedCells: allDestroyedCells,
      blastRadius: radius
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