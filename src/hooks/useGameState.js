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
    
    // Full state object
    gameState: state,
    
    // Actions
    setPlayerName: (name) => gameState.setPlayerName(name),
    setScore: (score) => gameState.setScore(score),
    addScore: (points) => gameState.addScore(points),
    setCurrentScenario: (scenario) => gameState.setCurrentScenario(scenario),
    reset: (keepPlayerName = true) => gameState.reset(keepPlayerName),
    fullReset: () => gameState.fullReset(),
    
    // Utility functions
    hasPlayerName: () => gameState.hasPlayerName(),
    getPlayerName: () => gameState.getPlayerName(),
    getScore: () => gameState.getScore(),
    getCurrentScenario: () => gameState.getCurrentScenario()
  };
};

export default useGameState;