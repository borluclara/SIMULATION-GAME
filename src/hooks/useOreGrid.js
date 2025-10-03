/**
 * useOreGrid Hook
 * Manages ore grid state, loading, and interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { OreGrid } from '../utils/OreGrid';

export const useOreGrid = (initialDataPath = null) => {
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Load grid from CSV content
  const loadGridFromContent = useCallback((csvContent) => {
    try {
      setLoading(true);
      setError(null);
      
      const newGrid = OreGrid.fromCSVData(csvContent);
      setGrid(newGrid);
      setIsReady(true);
      
      console.log('Grid loaded successfully:', {
        width: newGrid.width,
        height: newGrid.height,
        totalBlocks: newGrid.getAllBlocks().length
      });
    } catch (err) {
      console.error('Error loading grid:', err);
      setError(err.message);
      setIsReady(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load grid from file path
  const loadGrid = useCallback(async (filePath) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }
      
      const csvContent = await response.text();
      loadGridFromContent(csvContent);
    } catch (err) {
      console.error('Error loading grid from file:', err);
      setError(err.message);
      setIsReady(false);
      setLoading(false);
    }
  }, [loadGridFromContent]);

  // Apply blast to grid
  const applyBlast = useCallback((x, y, radius = 2, power = 50) => {
    if (!grid || !isReady) {
      console.warn('Grid not ready for blast');
      return null;
    }

    const result = grid.applyBlast(x, y, radius, power);
    
    // Trigger re-render by creating new grid reference
    setGrid(new OreGrid(grid.width, grid.height));
    setGrid(grid); // This will trigger component updates
    
    console.log('Blast applied:', {
      center: [x, y],
      radius,
      power,
      affected: result.affectedBlocks.length,
      destroyed: result.destroyedBlocks.length,
      totalDamage: result.totalDamage
    });
    
    return result;
  }, [grid, isReady]);

  // Reset grid to original state
  const resetGrid = useCallback(() => {
    if (!grid) return;
    
    grid.reset();
    // Trigger re-render
    setGrid(new OreGrid(grid.width, grid.height));
    setGrid(grid);
    
    console.log('Grid reset to original state');
  }, [grid]);

  // Get grid statistics
  const gridStats = grid ? grid.getStats() : {
    totalBlocks: 0,
    destroyedBlocks: 0,
    survivalRate: 0,
    oreDistribution: {}
  };

  // Load initial data on mount
  useEffect(() => {
    if (initialDataPath) {
      loadGrid(initialDataPath);
    }
  }, [initialDataPath, loadGrid]);

  return {
    grid,
    loading,
    error,
    isReady,
    gridStats,
    loadGrid,
    loadGridFromContent,
    applyBlast,
    resetGrid
  };
};
