/**
 * Custom React Hook for Ore Grid Management
 */

import { useState, useEffect, useCallback } from 'react';
import { loadCSVFile, parseCSVToGrid } from '../utils/OreGrid.js';

export function useOreGrid(initialCSVPath = null) {
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gridStats, setGridStats] = useState({
    totalBlocks: 0,
    destroyedBlocks: 0,
    oreDistribution: {}
  });

  // Load grid from CSV file
  const loadGrid = useCallback(async (csvPath) => {
    setLoading(true);
    setError(null);
    
    try {
      const newGrid = await loadCSVFile(csvPath);
      setGrid(newGrid);
      updateGridStats(newGrid);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load ore grid:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load grid from CSV content (for file upload)
  const loadGridFromContent = useCallback(async (csvContent) => {
    setLoading(true);
    setError(null);
    
    try {
      const newGrid = await parseCSVToGrid(csvContent);
      setGrid(newGrid);
      updateGridStats(newGrid);
    } catch (err) {
      setError(err.message);
      console.error('Failed to parse CSV content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update grid statistics
  const updateGridStats = useCallback((currentGrid) => {
    if (!currentGrid) return;

    const totalBlocks = currentGrid.blocks.size;
    let destroyedBlocks = 0;
    
    currentGrid.blocks.forEach(block => {
      if (block.isDestroyed) destroyedBlocks++;
    });

    const oreDistribution = currentGrid.getOreDistribution();

    setGridStats({
      totalBlocks,
      destroyedBlocks,
      oreDistribution,
      survivalRate: ((totalBlocks - destroyedBlocks) / totalBlocks * 100).toFixed(1)
    });
  }, []);

  // Apply blast effect to grid
  const applyBlast = useCallback((centerX, centerY, blastRadius, blastPower) => {
    if (!grid) return;

    const affectedBlocks = grid.getBlocksInRadius(centerX, centerY, blastRadius);
    let blocksDestroyed = 0;

    affectedBlocks.forEach(({ block, distance }) => {
      if (block.isDestroyed) return;

      // Calculate damage based on distance and blast power
      const damageMultiplier = Math.max(0, 1 - (distance / blastRadius));
      const damage = blastPower * damageMultiplier * (1 - block.blastResistance);

      if (block.takeDamage(damage)) {
        blocksDestroyed++;
      }
    });

    // Force re-render by creating new grid reference
    setGrid({ ...grid });
    updateGridStats(grid);

    return {
      blocksAffected: affectedBlocks.length,
      blocksDestroyed,
      totalDamage: blastPower
    };
  }, [grid, updateGridStats]);

  // Reset grid to original state
  const resetGrid = useCallback(() => {
    if (!grid) return;

    grid.blocks.forEach(block => {
      block.isDestroyed = false;
      block.health = block.maxHealth;
    });

    setGrid({ ...grid });
    updateGridStats(grid);
  }, [grid, updateGridStats]);

  // Get block at specific coordinates
  const getBlock = useCallback((x, y) => {
    return grid ? grid.getBlock(x, y) : null;
  }, [grid]);

  // Get block at grid position
  const getBlockAtGridPos = useCallback((gridX, gridY) => {
    return grid ? grid.getBlockAtGridPos(gridX, gridY) : null;
  }, [grid]);

  // Load initial CSV on mount
  useEffect(() => {
    if (initialCSVPath) {
      loadGrid(initialCSVPath);
    }
  }, [initialCSVPath, loadGrid]);

  return {
    // State
    grid,
    loading,
    error,
    gridStats,
    
    // Actions
    loadGrid,
    loadGridFromContent,
    applyBlast,
    resetGrid,
    
    // Getters
    getBlock,
    getBlockAtGridPos,
    
    // Computed values
    isReady: !loading && !error && grid !== null,
    gridDimensions: grid ? { width: grid.width, height: grid.height } : null
  };
}