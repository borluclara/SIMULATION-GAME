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
      blastRadius: 3
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
      blastRadius: 3
    };
    this.notifyListeners();
  }

  fullReset() {
    this.reset(false);
  }

  addBlast(x, y) {
    if (this.state.blasts.length < this.state.maxBlasts) {
      this.state.blasts.push({ x, y, id: Date.now() });
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

  // FIXED: Execute blast detonation with proper grid handling
  triggerBlasts() {
    const blasts = [...this.state.blasts];
    const grid = this.state.grid;
    
    if (!grid || blasts.length === 0) {
      console.warn('No grid or blasts available');
      return { blasts: [], affectedCells: [] };
    }

    const affectedCells = [];
    const destroyedCells = []; // Track destroyed cells for physics
    const radius = this.state.blastRadius;

    console.log('Processing blasts:', {
      blastCount: blasts.length,
      radius: radius,
      gridType: typeof grid,
      hasGetBlock: typeof grid.getBlockAtGridPos === 'function'
    });

    // Calculate affected cells for each blast
    blasts.forEach(blast => {
      // IMPORTANT: Include the blast epicenter itself (where explosive was placed)
      // First, add the epicenter cell
      const epicenterBlock = grid.getBlockAtGridPos(blast.x, blast.y);
      if (epicenterBlock) {
        const epicenterMaterial = epicenterBlock.oreType || epicenterBlock.material || 'unknown';
        affectedCells.push({
          x: blast.x,
          y: blast.y,
          distance: 0, // Distance 0 = epicenter
          blastId: blast.id,
          originalMaterial: epicenterMaterial
        });
        // Destroy epicenter completely
        epicenterBlock.isDestroyed = true;
        epicenterBlock.damage = epicenterBlock.maxHealth;
        
        // Add to destroyed cells for physics
        destroyedCells.push({
          x: blast.x,
          y: blast.y,
          material: epicenterMaterial
        });
      }

      // Then process surrounding cells in radius
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Skip the epicenter since we already added it
          if (dx === 0 && dy === 0) continue;
          
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const x = blast.x + dx;
            const y = blast.y + dy;
            
            // Check if coordinates are within grid bounds
            if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
              // Get block using OreGrid's method
              const block = grid.getBlockAtGridPos(x, y);
              
              if (block && !block.isDestroyed) {
                // Determine material/ore type
                const material = block.oreType || block.material || 'unknown';
                
                affectedCells.push({ 
                  x, 
                  y, 
                  distance, 
                  blastId: blast.id,
                  originalMaterial: material
                });

                // Destroy blocks based on distance from epicenter
                if (distance <= radius * 0.6) {
                  block.isDestroyed = true;
                  block.damage = block.maxHealth;
                  
                  // Add to destroyed cells for physics
                  destroyedCells.push({
                    x: x,
                    y: y,
                    material: material
                  });
                } else if (distance <= radius * 0.9) {
                  block.damage = Math.min(block.maxHealth, block.damage + block.maxHealth * 0.7);
                  if (block.damage >= block.maxHealth) {
                    block.isDestroyed = true;
                    
                    // Add to destroyed cells for physics
                    destroyedCells.push({
                      x: x,
                      y: y,
                      material: material
                    });
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('Blast results:', {
      blastsProcessed: blasts.length,
      cellsAffected: affectedCells.length,
      cellsDestroyed: destroyedCells.length
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
      affectedCells, 
      destroyedCells,
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