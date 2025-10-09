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
      maxBlasts: 5 // Maximum number of blasts allowed
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
      maxBlasts: 5
    };
    this.notifyListeners();
  }

  // Complete reset (including player name)
  fullReset() {
    this.reset(false);
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

  // Blast placement methods
  addBlast(row, col) {
    // Check if blast limit reached
    if (this.state.blasts.length >= this.state.maxBlasts) {
      return { success: false, reason: 'Maximum blasts reached' };
    }

    // Check if position already has a blast
    const existingBlast = this.state.blasts.find(blast => blast.row === row && blast.col === col);
    if (existingBlast) {
      return { success: false, reason: 'Position already has a blast' };
    }

    // Add new blast
    const newBlast = {
      id: `blast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      row: row,
      col: col,
      timestamp: new Date().toISOString()
    };

    this.state.blasts.push(newBlast);
    this.notifyListeners();
    return { success: true, blast: newBlast };
  }

  // Remove blast at specific position
  removeBlast(row, col) {
    const initialLength = this.state.blasts.length;
    this.state.blasts = this.state.blasts.filter(blast => !(blast.row === row && blast.col === col));
    
    if (this.state.blasts.length < initialLength) {
      this.notifyListeners();
      return { success: true };
    }
    return { success: false, reason: 'No blast found at position' };
  }

  // Remove blast by ID
  removeBlastById(blastId) {
    const initialLength = this.state.blasts.length;
    this.state.blasts = this.state.blasts.filter(blast => blast.id !== blastId);
    
    if (this.state.blasts.length < initialLength) {
      this.notifyListeners();
      return { success: true };
    }
    return { success: false, reason: 'Blast not found' };
  }

  // Clear all blasts
  clearBlasts() {
    this.state.blasts = [];
    this.notifyListeners();
  }

  // Get all blasts
  getBlasts() {
    return [...this.state.blasts];
  }

  // Check if position has a blast
  hasBlastAt(row, col) {
    return this.state.blasts.some(blast => blast.row === row && blast.col === col);
  }

  // Get number of placed blasts
  getBlastCount() {
    return this.state.blasts.length;
  }

  // Get maximum blasts allowed
  getMaxBlasts() {
    return this.state.maxBlasts;
  }

  // Set maximum blasts allowed
  setMaxBlasts(maxBlasts) {
    this.state.maxBlasts = Math.max(1, maxBlasts);
    
    // Remove excess blasts if new limit is lower
    if (this.state.blasts.length > this.state.maxBlasts) {
      this.state.blasts = this.state.blasts.slice(0, this.state.maxBlasts);
    }
    
    this.notifyListeners();
  }

  // Check if can place more blasts
  canPlaceMoreBlasts() {
    return this.state.blasts.length < this.state.maxBlasts;
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
        maxBlasts: importedState.maxBlasts || 5
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