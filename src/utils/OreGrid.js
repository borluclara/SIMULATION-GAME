/**
 * Ore Grid Data Structure and Utilities
 * Handles ore block data, color mapping, and grid operations
 */

// Define ore type to color mapping
export const ORE_COLORS = {
  stone: '#8B7355',     // Brown-gray
  coal: '#2C2C2C',      // Dark gray
  iron: '#CD853F',      // Peru/bronze
  copper: '#B87333',    // Copper brown
  gold: '#FFD700',      // Gold
  diamond: '#B9F2FF',   // Light blue
  silver: '#C0C0C0',    // Silver
  emerald: '#50C878',   // Emerald green
  ruby: '#E0115F',      // Ruby red
  default: '#696969'    // Dim gray for unknown types
};

// Ore properties for game mechanics
export const ORE_PROPERTIES = {
  stone: { hardness: 1, value: 1, blastResistance: 0.1 },
  coal: { hardness: 2, value: 5, blastResistance: 0.2 },
  iron: { hardness: 3, value: 10, blastResistance: 0.4 },
  copper: { hardness: 2, value: 8, blastResistance: 0.3 },
  gold: { hardness: 4, value: 25, blastResistance: 0.6 },
  diamond: { hardness: 5, value: 50, blastResistance: 0.8 },
  silver: { hardness: 3, value: 15, blastResistance: 0.5 },
  emerald: { hardness: 4, value: 30, blastResistance: 0.7 },
  ruby: { hardness: 4, value: 35, blastResistance: 0.7 },
};

/**
 * Represents a single ore block in the grid
 */
export class OreBlock {
  constructor(x, y, oreType, hardness = null, value = null) {
    this.x = parseInt(x);
    this.y = parseInt(y);
    this.oreType = oreType.toLowerCase().trim();
    this.color = ORE_COLORS[this.oreType] || ORE_COLORS.default;
    
    // Use CSV values or defaults from ORE_PROPERTIES
    const defaults = ORE_PROPERTIES[this.oreType] || ORE_PROPERTIES.stone;
    this.hardness = hardness !== null ? parseInt(hardness) : defaults.hardness;
    this.value = value !== null ? parseInt(value) : defaults.value;
    this.blastResistance = defaults.blastResistance;
    
    // Game state
    this.isDestroyed = false;
    this.health = this.hardness * 10; // Health based on hardness
    this.maxHealth = this.health;
  }

  /**
   * Apply blast damage to this block
   */
  takeDamage(damage) {
    if (this.isDestroyed) return false;
    
    this.health -= damage;
    if (this.health <= 0) {
      this.isDestroyed = true;
      return true; // Block was destroyed
    }
    return false; // Block survived
  }

  /**
   * Get visual representation info
   */
  getVisualState() {
    return {
      color: this.isDestroyed ? '#000000' : this.color,
      opacity: this.isDestroyed ? 0.1 : (this.health / this.maxHealth),
      oreType: this.oreType,
      position: { x: this.x, y: this.y },
      isDestroyed: this.isDestroyed
    };
  }
}

/**
 * Main Grid class that manages the 2D ore grid
 */
export class OreGrid {
  constructor() {
    this.grid = [];
    this.width = 0;
    this.height = 0;
    this.blocks = new Map(); // For quick lookup by coordinates
  }

  /**
   * Create grid from CSV data
   */
  static fromCSVData(csvData) {
    const grid = new OreGrid();
    
    // Parse CSV rows into blocks
    const blocks = csvData.map(row => {
      const block = new OreBlock(
        row.x,
        row.y,
        row.ore_type,
        row.hardness,
        row.value
      );
      return block;
    });

    // Determine grid dimensions
    const maxX = Math.max(...blocks.map(b => b.x));
    const maxY = Math.max(...blocks.map(b => b.y));
    const minX = Math.min(...blocks.map(b => b.x));
    const minY = Math.min(...blocks.map(b => b.y));

    grid.width = maxX - minX + 1;
    grid.height = maxY - minY + 1;

    // Initialize 2D array
    grid.grid = Array(grid.height).fill(null).map(() => 
      Array(grid.width).fill(null)
    );

    // Place blocks in grid and create lookup map
    blocks.forEach(block => {
      const gridX = block.x - minX;
      const gridY = block.y - minY;
      grid.grid[gridY][gridX] = block;
      grid.blocks.set(`${block.x},${block.y}`, block);
    });

    return grid;
  }

  /**
   * Get block at specific coordinates
   */
  getBlock(x, y) {
    return this.blocks.get(`${x},${y}`) || null;
  }

  /**
   * Get block at grid position (0-indexed from top-left)
   */
  getBlockAtGridPos(gridX, gridY) {
    if (gridY >= 0 && gridY < this.height && gridX >= 0 && gridX < this.width) {
      return this.grid[gridY][gridX];
    }
    return null;
  }

  /**
   * Get all blocks in a radius around a point
   */
  getBlocksInRadius(centerX, centerY, radius) {
    const blocksInRadius = [];
    
    this.blocks.forEach(block => {
      const distance = Math.sqrt(
        Math.pow(block.x - centerX, 2) + Math.pow(block.y - centerY, 2)
      );
      
      if (distance <= radius) {
        blocksInRadius.push({
          block,
          distance
        });
      }
    });

    return blocksInRadius.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get ore type distribution for analysis
   */
  getOreDistribution() {
    const distribution = {};
    
    this.blocks.forEach(block => {
      if (!block.isDestroyed) {
        distribution[block.oreType] = (distribution[block.oreType] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Print grid to console for debugging
   */
  printToConsole() {
    console.log('=== ORE GRID DEBUG ===');
    console.log(`Dimensions: ${this.width}x${this.height}`);
    console.log('Grid Layout:');
    
    this.grid.forEach((row, y) => {
      const rowStr = row.map(block => {
        if (!block) return '  ';
        const typeChar = block.oreType.charAt(0).toUpperCase();
        return block.isDestroyed ? '×' + typeChar : typeChar + ' ';
      }).join('');
      console.log(`Row ${y}: [${rowStr}]`);
    });

    console.log('\nOre Distribution:', this.getOreDistribution());
    console.log('\nColor Mapping:');
    Object.entries(ORE_COLORS).forEach(([type, color]) => {
      console.log(`  ${type}: ${color}`);
    });
    console.log('=====================');
  }
}

/**
 * Parse CSV file and create grid
 */
export function parseCSVToGrid(csvContent) {
  return new Promise((resolve, reject) => {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Find required columns
      const xIndex = headers.findIndex(h => h.includes('x'));
      const yIndex = headers.findIndex(h => h.includes('y'));
      const oreIndex = headers.findIndex(h => h.includes('ore') || h.includes('type'));
      const hardnessIndex = headers.findIndex(h => h.includes('hardness'));
      const valueIndex = headers.findIndex(h => h.includes('value'));

      if (xIndex === -1 || yIndex === -1 || oreIndex === -1) {
        throw new Error('CSV must contain x, y, and ore_type columns');
      }

      const data = [];
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < 3) continue;

        const x = parseInt(row[xIndex]);
        const y = parseInt(row[yIndex]);
        const ore_type = row[oreIndex];
        const hardness = hardnessIndex !== -1 ? parseInt(row[hardnessIndex]) || null : null;
        const value = valueIndex !== -1 ? parseInt(row[valueIndex]) || null : null;

        if (!isNaN(x) && !isNaN(y) && ore_type) {
          data.push({ x, y, ore_type, hardness, value });
        }
      }

      const grid = OreGrid.fromCSVData(data);
      
      // Debug output
      console.log('CSV parsed successfully!');
      console.log(`Found ${data.length} ore blocks`);
      grid.printToConsole();
      
      resolve(grid);
    } catch (error) {
      reject(new Error(`Failed to create grid: ${error.message}`));
    }
  });
}

/**
 * Load CSV from URL/file path
 */
export async function loadCSVFile(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.statusText}`);
    }
    const csvContent = await response.text();
    return parseCSVToGrid(csvContent);
  } catch (error) {
    throw new Error(`Error loading CSV file: ${error.message}`);
  }
}