/**
 * Ore Grid Data Structure and Utilities
 * Handles ore block data, color mapping, and grid operations
 */

// Color mapping for different ore types (US3 mapping)
export const ORE_COLORS = {
  stone: '#808080',     // Gray
  coal: '#2c2c2c',     // Dark gray
  iron: '#cd7f32',     // Bronze
  copper: '#b87333',   // Copper
  silver: '#c0c0c0',   // Silver
  gold: '#ffd700',     // Gold
  diamond: '#b9f2ff',  // Light blue
  emerald: '#50c878',  // Emerald green
  ruby: '#e0115f',     // Ruby red
  default: '#654321'   // Brown fallback
};

/**
 * Represents a single ore block in the grid
 */
export class OreBlock {
  constructor(x, y, oreType, hardness = 100, value = 10) {
    this.x = x;
    this.y = y;
    this.oreType = oreType;
    this.hardness = hardness;
    this.maxHealth = hardness;
    this.health = hardness;
    this.value = value;
    this.damage = 0;
    this.isDestroyed = false;
  }

  /**
   * Apply damage to the block
   */
  takeDamage(damage) {
    this.damage += damage;
    this.health = Math.max(0, this.maxHealth - this.damage);
    this.isDestroyed = this.health <= 0;
    return this.isDestroyed;
  }

  /**
   * Get the color for this ore block
   */
  getColor() {
    if (this.isDestroyed) {
      return '#1a1a1a'; // Dark for destroyed blocks
    }
    
    const baseColor = ORE_COLORS[this.oreType] || ORE_COLORS.default;
    
    // Darken color based on damage
    if (this.damage > 0) {
      const damageRatio = this.damage / this.maxHealth;
      const darkenFactor = 1 - (damageRatio * 0.5);
      return this.adjustColorBrightness(baseColor, darkenFactor);
    }
    
    return baseColor;
  }

  /**
   * Adjust color brightness
   */
  adjustColorBrightness(hex, factor) {
    const color = hex.replace('#', '');
    const num = parseInt(color, 16);
    const amt = Math.round(2.55 * factor * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  }
}

/**
 * Manages the 2D grid of ore blocks
 */
export class OreGrid {
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
    this.blocks = new Map(); // Use Map for efficient lookups
    this.originalData = null; // Store original data for reset
  }

  /**
   * Create grid from CSV data
   */
  static fromCSVData(csvData) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find required columns
    const xIndex = headers.findIndex(h => h.toLowerCase().includes('x'));
    const yIndex = headers.findIndex(h => h.toLowerCase().includes('y'));
    const oreIndex = headers.findIndex(h => h.toLowerCase().includes('ore') || h.toLowerCase().includes('type'));
    const hardnessIndex = headers.findIndex(h => h.toLowerCase().includes('hardness'));
    const valueIndex = headers.findIndex(h => h.toLowerCase().includes('value'));

    if (xIndex === -1 || yIndex === -1 || oreIndex === -1) {
      throw new Error('CSV must contain x, y, and ore_type columns');
    }

    let maxX = 0, maxY = 0;
    const blocks = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim());
      if (row.length < 3) continue;

      const x = parseInt(row[xIndex]);
      const y = parseInt(row[yIndex]);
      const oreType = row[oreIndex];
      const hardness = hardnessIndex !== -1 ? parseInt(row[hardnessIndex]) || 100 : 100;
      const value = valueIndex !== -1 ? parseInt(row[valueIndex]) || 10 : 10;

      if (!isNaN(x) && !isNaN(y) && oreType) {
        blocks.push(new OreBlock(x, y, oreType, hardness, value));
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    const grid = new OreGrid(maxX + 1, maxY + 1);
    blocks.forEach(block => {
      grid.setBlock(block.x, block.y, block);
    });
    
    grid.originalData = csvData; // Store for reset functionality
    return grid;
  }

  /**
   * Set a block at specific coordinates
   */
  setBlock(x, y, block) {
    const key = `${x},${y}`;
    this.blocks.set(key, block);
  }

  /**
   * Get block at specific coordinates
   */
  getBlockAtGridPos(x, y) {
    const key = `${x},${y}`;
    return this.blocks.get(key);
  }

  /**
   * Get all blocks as an array
   */
  getAllBlocks() {
    return Array.from(this.blocks.values());
  }

  /**
   * Apply blast effect to an area
   */
  applyBlast(centerX, centerY, radius, power) {
    const affectedBlocks = [];
    const destroyedBlocks = [];

    for (let y = Math.max(0, centerY - radius); y <= Math.min(this.height - 1, centerY + radius); y++) {
      for (let x = Math.max(0, centerX - radius); x <= Math.min(this.width - 1, centerX + radius); x++) {
        const block = this.getBlockAtGridPos(x, y);
        if (!block || block.isDestroyed) continue;

        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance <= radius) {
          const damageFactor = 1 - (distance / radius);
          const damage = power * damageFactor;
          
          const wasDestroyed = block.takeDamage(damage);
          affectedBlocks.push(block);
          
          if (wasDestroyed) {
            destroyedBlocks.push(block);
          }
        }
      }
    }

    return {
      affectedBlocks,
      destroyedBlocks,
      totalDamage: affectedBlocks.reduce((sum, block) => sum + block.damage, 0)
    };
  }

  /**
   * Reset grid to original state
   */
  reset() {
    if (this.originalData) {
      const newGrid = OreGrid.fromCSVData(this.originalData);
      this.blocks = newGrid.blocks;
      this.width = newGrid.width;
      this.height = newGrid.height;
    }
  }

  /**
   * Get grid statistics
   */
  getStats() {
    const allBlocks = this.getAllBlocks();
    const totalBlocks = allBlocks.length;
    const destroyedBlocks = allBlocks.filter(block => block.isDestroyed).length;
    const survivalRate = totalBlocks > 0 ? Math.round(((totalBlocks - destroyedBlocks) / totalBlocks) * 100) : 0;
    
    // Ore distribution
    const oreDistribution = {};
    allBlocks.forEach(block => {
      if (!block.isDestroyed) {
        oreDistribution[block.oreType] = (oreDistribution[block.oreType] || 0) + 1;
      }
    });

    return {
      totalBlocks,
      destroyedBlocks,
      survivalRate,
      oreDistribution
    };
  }
}

export default OreGrid;