/**
 * React Hook for Game State Management
 * Provides easy access to global game state in React components
 */

import { useState, useEffect } from 'react';
import { gameState } from '../utils/GameState';

export const useGameState = () => {
  const [state, setState] = useState(gameState.getState());

  useEffect(() => {
    // Subscribe to game state changes
    const unsubscribe = gameState.subscribe((newState) => {
      setState(newState);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Return state and actions
  return {
    // Current state
    playerName: state.playerName,
    score: state.score,
    currentScenario: state.currentScenario,
    blasts: state.blasts,
    grid: state.grid,
    maxBlasts: state.maxBlasts,
    blastRadius: state.blastRadius,
    
    // Full state object
    gameState: state,
    
    // Actions
    setPlayerName: (name) => gameState.setPlayerName(name),
    setScore: (score) => gameState.setScore(score),
    addScore: (points) => gameState.addScore(points),
    setCurrentScenario: (scenario) => gameState.setCurrentScenario(scenario),
    reset: (keepPlayerName = true) => gameState.reset(keepPlayerName),
    fullReset: () => gameState.fullReset(),
    
    // Blast actions
    addBlast: (x, y) => gameState.addBlast(x, y),
    removeBlast: (blastId) => gameState.removeBlast(blastId),
    clearBlasts: () => gameState.clearBlasts(),
    canPlaceBlast: () => gameState.canPlaceBlast(),
    getBlasts: () => gameState.getBlasts(),
    setGrid: (grid) => gameState.setGrid(grid),
    getGrid: () => gameState.getGrid(),
    triggerBlasts: () => gameState.triggerBlasts(),
    
    // Utility functions
    hasPlayerName: () => gameState.hasPlayerName(),
    getPlayerName: () => gameState.getPlayerName(),
    getScore: () => gameState.getScore(),
    getCurrentScenario: () => gameState.getCurrentScenario()
  };
};

export default useGameState;