/**
 * Global Game State Management
 * Holds player information and game data across the session
 */

export class GameState {
  constructor() {
    this.state = {
      playerName: "",
      score: 0,
      currentScenario: null,
      blasts: [], // Array to store placed blast positions
      grid: null, // Grid state for tracking material states
      maxBlasts: 5, // Maximum number of blasts allowed
      blastRadius: 3 // Default blast radius
    };
    
    // Event listeners for state changes
    this.listeners = [];
  }

  // Initialize the game state
  static getInstance() {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Update player name
  setPlayerName(playerName) {
    this.state.playerName = playerName;
    this.notifyListeners();
  }

  // Update score
  setScore(score) {
    this.state.score = score;
    this.notifyListeners();
  }

  // Add to score
  addScore(points) {
    this.state.score += points;
    this.notifyListeners();
  }

  // Set current scenario
  setCurrentScenario(scenario) {
    this.state.currentScenario = scenario;
    this.notifyListeners();
  }

  // Reset state (but keep player name unless specified)
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

  // Complete reset (including player name)
  fullReset() {
    this.reset(false);
  }

  // Blast management methods
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

  // Execute blast detonation
  triggerBlasts() {
    const blasts = [...this.state.blasts];
    const grid = this.state.grid;
    
    if (!grid || blasts.length === 0) {
      return { blasts: [], affectedCells: [] };
    }

    const affectedCells = [];
    const radius = this.state.blastRadius;

    // Calculate affected cells for each blast
    blasts.forEach(blast => {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const x = blast.x + dx;
            const y = blast.y + dy;
            
            if (x >= 0 && x < grid[0].length && y >= 0 && y < grid.length) {
              affectedCells.push({ 
                x, 
                y, 
                distance, 
                blastId: blast.id,
                originalMaterial: grid[y][x]
              });
            }
          }
        }
      }
    });

    // Update grid materials based on blast effects
    affectedCells.forEach(cell => {
      const material = grid[cell.y][cell.x];
      if (material && material !== 'air') {
        // Apply destruction logic based on distance and material type
        if (cell.distance <= radius * 0.5) {
          grid[cell.y][cell.x] = 'destroyed';
        } else if (cell.distance <= radius * 0.8) {
          grid[cell.y][cell.x] = 'cracked';
        }
      }
    });

    // Clear blasts after detonation
    this.clearBlasts();
    
    return { blasts, affectedCells };
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of state changes
  notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.getState());
    });
  }

  // Get specific state properties
  getPlayerName() {
    return this.state.playerName;
  }

  getScore() {
    return this.state.score;
  }

  getCurrentScenario() {
    return this.state.currentScenario;
  }

  // Check if player has entered name
  hasPlayerName() {
    return this.state.playerName.trim().length > 0;
  }

  // Export state for debugging
  export() {
    return JSON.stringify(this.state, null, 2);
  }

  // Import state (for testing or restoration)
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

// Create global instance
export const gameState = GameState.getInstance();

// Export default for convenience
export default gameState;