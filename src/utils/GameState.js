/**
 * Global Game State Management
 * Holds player information and game data across the session
 */

export class GameState {
  constructor() {
    this.state = {
      playerName: "",
      score: 0,
      currentScenario: null
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
      currentScenario: null
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
        currentScenario: importedState.currentScenario || null
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