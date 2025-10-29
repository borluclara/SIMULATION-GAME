/**
 * Ore Grid Data Structure and Utilities
 * Handles ore block data, color mapping, and grid operations
 */

// Define ore type to color mapping - Updated to match vibrant design
export const ORE_COLORS = {
  stone: '#8B4513',     // Saddle brown (rich brown)
  coal: '#2F2F2F',      // Very dark gray (almost black)
  iron: '#CD853F',      // Peru/bronze (sandy brown)
  copper: '#D2691E',    // Chocolate orange
  gold: '#FFD700',      // Bright gold yellow
  diamond: '#87CEEB',   // Sky blue
  silver: '#C0C0C0',    // Silver
  emerald: '#228B22',   // Forest green
  ruby: '#DC143C',      // Crimson red
  platinum: '#E5E4E2',  // Platinum
  obsidian: '#1C1C1C',  // Very dark (black)
  sandstone: '#F4A460', // Sandy brown
  limestone: '#F5F5DC', // Beige
  granite: '#708090',   // Slate gray
  basalt: '#36454F',    // Charcoal
  quartz: '#FFFACD',    // Lemon chiffon
  default: '#8B7355'    // Default brown-gray
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
    this.recentlyDisplaced = false; // Track displacement for visual effects
    this.displacementTimer = null;   // Timer for clearing displacement flag
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
      color: this.isDestroyed ? '#000000' : this.getColor(),
      opacity: this.isDestroyed ? 0.1 : (this.health / this.maxHealth),
      oreType: this.oreType,
      position: { x: this.x, y: this.y },
      isDestroyed: this.isDestroyed
    };
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
    this.grid = null; // 2D array for grid representation
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
    // Initialize 2D array
    grid.grid = Array(grid.height).fill(null).map(() =>
      Array(grid.width).fill(null)
    );
    blocks.forEach(block => {
      grid.setBlock(block.x, block.y, block);
      grid.grid[block.y][block.x] = block;
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
    if (this.grid && y >= 0 && y < this.height && x >= 0 && x < this.width) {
      this.grid[y][x] = block;
    }
  }

  /**
   * Get block at specific coordinates
   */
  getBlockAtGridPos(x, y) {
    if (this.grid && y >= 0 && y < this.height && x >= 0 && x < this.width) {
      return this.grid[y][x];
    }
    return null;
  }

  /**
   * Get all blocks as an array
   */
  getAllBlocks() {
    return Array.from(this.blocks.values());
  }

  /**
   * Apply blast effect to an area with decay function and radial displacement
   */
  applyBlast(centerX, centerY, radius, power) {
    const startTime = performance.now(); // Performance monitoring
    const affectedBlocks = [];
    const destroyedBlocks = [];
    const displacedBlocks = [];

    // Pre-calculate decay constants for performance
    const decayConstant = 0.5; // Exponential decay constant (k)
    const linearDecayRate = power / radius; // Linear decay rate
    const maxDisplacementRadius = radius * 1.5; // Extended radius for displacement effects

    console.log('Applying blast with decay function:', {
      center: `(${centerX}, ${centerY})`,
      radius,
      power,
      decayConstant,
      maxDisplacementRadius
    });

    for (let y = Math.max(0, centerY - maxDisplacementRadius); y <= Math.min(this.height - 1, centerY + maxDisplacementRadius); y++) {
      for (let x = Math.max(0, centerX - maxDisplacementRadius); x <= Math.min(this.width - 1, centerX + maxDisplacementRadius); x++) {
        const block = this.getBlockAtGridPos(x, y);
        if (!block || block.isDestroyed) continue;

        // Pre-calculate distance once for performance
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (distance <= maxDisplacementRadius) {
          // Apply decay function to calculate effective power
          const decayedPower = this.calculateDecayedPower(power, distance, decayConstant);
          
          // Apply damage within the main blast radius
          if (distance <= radius) {
            const damage = decayedPower;
            const wasDestroyed = block.takeDamage(damage);
            affectedBlocks.push(block);
            
            if (wasDestroyed) {
              destroyedBlocks.push(block);
            }
          }

          // Apply radial displacement for all blocks within extended radius
          if (distance > 0) { // Avoid division by zero at center
            const displacement = this.calculateRadialDisplacement(
              block, centerX, centerY, distance, decayedPower, maxDisplacementRadius
            );
            if (displacement) {
              displacedBlocks.push(displacement);
            }
          }
        }
      }
    }

    // Apply all displacements
    if (displacedBlocks.length > 0) {
      this.applyDisplacements(displacedBlocks);
    }

    const endTime = performance.now();
    console.log('Blast processing completed:', {
      processingTime: `${(endTime - startTime).toFixed(2)}ms`,
      affectedBlocks: affectedBlocks.length,
      destroyedBlocks: destroyedBlocks.length,
      displacedBlocks: displacedBlocks.length
    });

    return {
      affectedBlocks,
      destroyedBlocks,
      displacedBlocks,
      totalDamage: affectedBlocks.reduce((sum, block) => sum + block.damage, 0)
    };
  }

  /**
   * Calculate power with decay function - combines exponential and linear decay
   */
  calculateDecayedPower(basePower, distance, decayConstant) {
    // Exponential decay: force = F0 * e^(-k * r)
    const exponentialDecay = basePower * Math.exp(-decayConstant * distance);
    
    // Linear decay: force = F0 - k * r (with minimum floor)
    const linearDecay = Math.max(0, basePower - (decayConstant * distance * basePower));
    
    // Hybrid approach: use exponential for close range, linear for far range
    // This provides smooth close-range falloff with gradual distant effects
    const blendFactor = Math.min(1, distance / 3); // Blend over 3 units
    const hybridDecay = (1 - blendFactor) * exponentialDecay + blendFactor * linearDecay;
    
    return Math.max(0.01, hybridDecay); // Minimum threshold to prevent zero values
  }

  /**
   * Calculate radial displacement based on decayed power
   */
  calculateRadialDisplacement(block, centerX, centerY, distance, decayedPower, maxRadius) {
    // Direction vector from blast center to block (radial outward)
    const dirX = (block.x - centerX) / distance;
    const dirY = (block.y - centerY) / distance;

    // Force calculation based on decayed power
    const baseForce = decayedPower / 100; // Scale for displacement
    
    // Additional distance-based reduction for displacement
    const distanceFactor = Math.max(0.1, 1 - (distance / maxRadius));
    const effectiveForce = baseForce * distanceFactor;

    // Material resistance (heavier materials move less)
    const materialResistance = this.getMaterialResistance(block.oreType);
    const finalForce = effectiveForce * materialResistance;

    // Calculate displacement magnitude (max 2 grid units, scaled by force)
    const maxDisplacement = 2;
    const displacementMagnitude = Math.min(maxDisplacement, finalForce * 3);

    // Only apply displacement if force is significant enough
    if (displacementMagnitude < 0.2) {
      return null; // Too weak to cause displacement
    }

    // Calculate new position
    const newX = block.x + (dirX * displacementMagnitude);
    const newY = block.y + (dirY * displacementMagnitude);

    // Clamp to grid boundaries
    const clampedX = Math.max(0, Math.min(this.width - 1, Math.round(newX)));
    const clampedY = Math.max(0, Math.min(this.height - 1, Math.round(newY)));

    // Only displace if there's actual movement
    if (clampedX !== block.x || clampedY !== block.y) {
      return {
        block,
        originalX: block.x,
        originalY: block.y,
        newX: clampedX,
        newY: clampedY,
        force: finalForce,
        distance: distance
      };
    }

    return null;
  }

  /**
   * Get material resistance to displacement
   */
  getMaterialResistance(oreType) {
    const resistanceMap = {
      'diamond': 0.3,  // Very resistant to displacement
      'gold': 0.5,     // Resistant
      'iron': 0.6,     // Somewhat resistant
      'silver': 0.7,   // Somewhat resistant
      'copper': 0.8,   // Less resistant
      'stone': 0.9,    // Not very resistant
      'coal': 1.0      // Least resistant (moves easily)
    };
    return resistanceMap[oreType.toLowerCase()] || 0.8;
  }

  /**
   * Apply calculated displacements to the grid
   */
  applyDisplacements(displacements) {
    // Sort by distance to handle closest displacements first
    displacements.sort((a, b) => a.distance - b.distance);

    // First, remove blocks from their original positions
    displacements.forEach(displacement => {
      const { block, originalX, originalY } = displacement;
      this.setBlock(originalX, originalY, null);
    });

    // Then, place blocks at their new positions
    displacements.forEach(displacement => {
      const { block, newX, newY } = displacement;
      
      // Check if target position is empty
      const existingBlock = this.getBlockAtGridPos(newX, newY);
      if (!existingBlock) {
        // Update block coordinates
        block.x = newX;
        block.y = newY;
        this.setBlock(newX, newY, block);
        
        // Mark as recently displaced for visual effects
        this.markAsDisplaced(block);
      } else {
        // If target is occupied, find nearest empty spot
        const nearestEmpty = this.findNearestEmptyPosition(newX, newY);
        if (nearestEmpty) {
          block.x = nearestEmpty.x;
          block.y = nearestEmpty.y;
          this.setBlock(nearestEmpty.x, nearestEmpty.y, block);
          this.markAsDisplaced(block);
        } else {
          // If no empty spot found, place back at original position
          block.x = displacement.originalX;
          block.y = displacement.originalY;
          this.setBlock(displacement.originalX, displacement.originalY, block);
        }
      }
    });
  }

  /**
   * Mark a block as recently displaced for visual effects
   */
  markAsDisplaced(block) {
    block.recentlyDisplaced = true;
    
    // Clear displacement flag after 3 seconds
    if (block.displacementTimer) {
      clearTimeout(block.displacementTimer);
    }
    
    block.displacementTimer = setTimeout(() => {
      block.recentlyDisplaced = false;
      block.displacementTimer = null;
    }, 3000);
  }

  /**
   * Find nearest empty position for displaced block
   */
  findNearestEmptyPosition(targetX, targetY, maxSearchRadius = 3) {
    for (let radius = 1; radius <= maxSearchRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check positions on the current radius perimeter
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const x = targetX + dx;
            const y = targetY + dy;
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
              const block = this.getBlockAtGridPos(x, y);
              if (!block) {
                return { x, y };
              }
            }
          }
        }
      }
    }
    return null; // No empty position found
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
      this.grid = newGrid.grid;
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

// Remove these method definitions from here and move them inside the OreGrid class definition above, after getStats().

// (No code here; methods should be inside the OreGrid class)
    return distribution;
  }

  /**
   * Print grid to console for debugging
   */
  printToConsole() {
    console.log('=== ORE GRID DEBUG ===');
    console.log(`Dimensions: ${this.width}x${this.height}`);
    console.log('Grid Layout:');
    
    if (this.grid) {
      this.grid.forEach((row, y) => {
        const rowStr = row.map(block => {
          if (!block) return '  ';
          const typeChar = block.oreType.charAt(0).toUpperCase();
          return block.isDestroyed ? '×' + typeChar : typeChar + ' ';
        }).join('');
        console.log(`Row ${y}: [${rowStr}]`);
      });
    }

    console.log('\nOre Distribution:', this.getOreDistribution());
    console.log('\nColor Mapping:');
    Object.entries(ORE_COLORS).forEach(([type, color]) => {
      console.log(`  ${type}: ${color}`);
    });
    console.log('=====================');
  }
} // <-- This closes the OreGrid class definition

/**
 * Parse CSV file and create grid - Enhanced for flexible column mapping
 */
export function parseCSVToGrid(csvContent) {
  return new Promise((resolve, reject) => {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Enhanced column mapping to handle different CSV formats
      const findColumn = (patterns) => {
        return headers.findIndex(h => 
          patterns.some(pattern => h.includes(pattern))
        );
      };
      
      const xIndex = findColumn(['x']);
      const yIndex = findColumn(['y']);
      const oreIndex = findColumn(['ore', 'type', 'material']);
      const hardnessIndex = findColumn(['hardness', 'hardness_mohs']);
      const valueIndex = findColumn(['value', 'game_value']);

      if (xIndex === -1 || yIndex === -1 || oreIndex === -1) {
        throw new Error('CSV must contain x, y, and ore/material/type columns');
      }

      const data = [];
      
      // Parse data rows with improved error handling
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < 3) continue;

        const x = parseInt(row[xIndex]);
        const y = parseInt(row[yIndex]);
        const ore_type = row[oreIndex] || 'stone'; // Default to stone if empty
        const hardness = hardnessIndex !== -1 ? parseInt(row[hardnessIndex]) || 100 : 100;
        const value = valueIndex !== -1 ? parseInt(row[valueIndex]) || 10 : 10;

        if (!isNaN(x) && !isNaN(y) && ore_type) {
          data.push({ x, y, ore_type, hardness, value });
        }
      }

      if (data.length === 0) {
        throw new Error('No valid data rows found in CSV');
      }

      // Convert data to CSV string for OreGrid.fromCSVData with improved format
      const csvRows = [
        'x,y,ore_type,hardness,value',
        ...data.map(d =>
          [d.x, d.y, d.ore_type, d.hardness, d.value].join(',')
        )
      ];
      const csvString = csvRows.join('\n');

      // Create grid with immediate resolution
      const grid = OreGrid.fromCSVData(csvString);
      
      // Debug output
      console.log('CSV parsed successfully!');
      console.log(`Found ${data.length} ore blocks`);
      console.log(`Grid dimensions: ${grid.width}x${grid.height}`);
      
      // Resolve immediately since OreGrid.fromCSVData is synchronous
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
