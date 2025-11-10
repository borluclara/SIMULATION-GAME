/**
 * Ore Grid Data Structure and Utilities
 * Handles ore block data, color mapping, and grid operations
 */

import { materialPropertyHandler, getMaterialColor } from './MaterialPropertyHandler.js';

// Utility functions for directional calculations
/**
 * Get bearing name from degrees following real-world conventions
 * @param {number} degrees - Direction in degrees (0-360)
 * @returns {string} - Bearing name (e.g., "North", "Northeast", etc.)
 */
function getBearingName(degrees) {
  const normalized = ((degrees % 360) + 360) % 360; // Normalize to 0-360
  
  if (normalized === 0 || normalized === 360) return "North";
  if (normalized > 0 && normalized < 90) return "Northeast";
  if (normalized === 90) return "East";
  if (normalized > 90 && normalized < 180) return "Southeast";
  if (normalized === 180) return "South";
  if (normalized > 180 && normalized < 270) return "Southwest";
  if (normalized === 270) return "West";
  if (normalized > 270 && normalized < 360) return "Northwest";
  
  return "Unknown";
}

/**
 * Validate and log direction for debugging
 * @param {number} direction - Direction in degrees
 * @param {string} context - Context for logging
 */
function validateDirection(direction, context = "") {
  const bearing = getBearingName(direction);
  console.log(`Direction ${context}: ${direction}° (${bearing})`);
  return direction;
}

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
  constructor(x, y, oreType, hardness = 100, value = 10, materialProperties = null) {
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
    
    // Material properties integration
    this.materialProperties = materialProperties || materialPropertyHandler.getMaterialProperties(oreType);
    
    // Crack effect properties for visual damage indication
    this.crackLevel = 0; // 0 = no cracks, 1 = light, 2 = medium, 3 = heavy
    this.crackPatterns = []; // Array of crack line patterns
    this.lastDamageAmount = 0; // Track recent damage for crack generation
    this.crackSeed = Math.random(); // Random seed for consistent crack patterns
    this.cracksGenerated = false; // Track if cracks have been generated for this damage level
  }

  /**
   * Get material-based blast resistance
   */
  getBlastResistance() {
    return this.materialProperties?.blast_resistance || 0.5;
  }

  /**
   * Get material density for physics calculations
   */
  getDensity() {
    return this.materialProperties?.density || 2.7;
  }

  /**
   * Get fragmentation index for break behavior
   */
  getFragmentationIndex() {
    return this.materialProperties?.fragmentation_index || 0.5;
  }

  /**
   * Get material hardness
   */
  getMaterialHardness() {
    return this.materialProperties?.hardness || 5;
  }

  /**
   * Apply damage to the block
   * (This method is replaced by the one below; remove this duplicate)
   */
  // takeDamage(damage) {
  //   this.damage += damage;
  //   this.health = Math.max(0, this.maxHealth - this.damage);
  //   this.isDestroyed = this.health <= 0;
  //   return this.isDestroyed;
  // }

  /**
   * Get the color for this ore block
   */
  getColor() {
    if (this.isDestroyed) {
      return '#1a1a1a'; // Dark for destroyed blocks
    }
    
    // Use material-based coloring
    return getMaterialColor(this.oreType, this.damage, this.maxHealth);
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
   * Apply blast damage to this block with material resistance and fragmentation
   */
  takeDamage(damage) {
    if (this.isDestroyed) return false;
    
    // Apply material-based blast resistance
    const effectiveDamage = materialPropertyHandler.calculateBlastEffectiveness(this.oreType, damage);
    
    // Check for fragmentation before applying damage
    const willFragment = this.checkFragmentation(effectiveDamage);
    
  // Track cumulative damage for reporting/visuals (was not updated previously)
  this.damage += effectiveDamage;
  this.health -= effectiveDamage;
    this.lastDamageAmount = effectiveDamage; // Track recent damage for crack generation
    
    if (this.health <= 0) {
      this.isDestroyed = true;
      
      // Store fragmentation info for physics engine
      this.fragmentationData = {
        willFragment: willFragment,
        fragmentationIndex: this.getFragmentationIndex(),
        materialDensity: this.getDensity(),
        hardness: this.getMaterialHardness()
      };
      
      return true; // Block was destroyed
    }
    
    // Generate crack effects for surviving blocks based on damage level
    this.updateCrackEffects();
    
    // Store partial damage fragmentation info
    if (willFragment) {
      this.fragmentationData = {
        willFragment: true,
        fragmentationIndex: this.getFragmentationIndex(),
        isPartialDamage: true
      };
    }
    
    return false; // Block survived
  }

  /**
   * Check if this block should fragment based on damage and material properties
   */
  checkFragmentation(damage) {
    const materialProps = this.materialProperties || materialPropertyHandler.getMaterialProperties(this.oreType);
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    const hardness = materialProps.hardness || 5;
    
    // Calculate fragmentation probability
    const damageFactor = damage / this.maxHealth;
    const fragmentationChance = fragmentationIndex * damageFactor;
    
    // Hard materials resist fragmentation
    const hardnessReduction = Math.max(0.1, 1 - (hardness / 15));
    const finalChance = fragmentationChance * hardnessReduction;
    
    // Higher chance if block is nearly destroyed
    const healthBonus = (this.maxHealth - this.health) / this.maxHealth * 0.3;
    const totalChance = Math.min(0.9, finalChance + healthBonus);
    
    return Math.random() < totalChance;
  }

  /**
   * Update crack effects based on current damage level
   */
  updateCrackEffects() {
    if (this.isDestroyed) return;
    
    const damagePercentage = (this.maxHealth - this.health) / this.maxHealth;
    const newCrackLevel = this.calculateCrackLevel(damagePercentage);
    
    // Only generate new crack patterns if crack level increased
    if (newCrackLevel > this.crackLevel) {
      this.crackLevel = newCrackLevel;
      this.generateCrackPatterns();
      console.log(`Block at (${this.x}, ${this.y}) crack level increased to ${this.crackLevel} (${(damagePercentage * 100).toFixed(1)}% damage)`);
    }
  }

  /**
   * Calculate crack level based on damage percentage
   */
  calculateCrackLevel(damagePercentage) {
    if (damagePercentage < 0.25) return 0; // No visible cracks
    if (damagePercentage < 0.5) return 1;  // Light cracks
    if (damagePercentage < 0.75) return 2; // Medium cracks
    return 3; // Heavy cracks (near destruction)
  }

  /**
   * Generate crack patterns based on crack level and material properties
   */
  generateCrackPatterns() {
    this.crackPatterns = [];
    
    // Use crack seed for consistent patterns
    const random = this.seededRandom(this.crackSeed);
    const materialProps = this.materialProperties || {};
    const hardness = materialProps.hardness || 5;
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    
    // Number of crack lines based on crack level and fragmentation
    const baseCrackCount = [0, 2, 4, 6][this.crackLevel] || 0;
    const fragmentationBonus = Math.floor(fragmentationIndex * 3);
    const crackCount = baseCrackCount + fragmentationBonus;
    
    for (let i = 0; i < crackCount; i++) {
      // Generate crack line with start and end points (normalized 0-1)
      const crack = this.generateCrackLine(random + i * 0.1, hardness, i);
      this.crackPatterns.push(crack);
    }
    
    this.cracksGenerated = true;
  }

  /**
   * Generate a single crack line pattern
   */
  generateCrackLine(seedOffset, hardness, index) {
    const random = (offset) => this.seededRandom(this.crackSeed + seedOffset + offset * 0.1);
    
    // Crack direction bias based on material hardness
    // Hard materials have straighter cracks, soft materials have more chaotic cracks
    const straightness = Math.min(0.8, hardness / 10);
    
    // Generate crack from edge to center or center to edge
    const startFromEdge = random(1) > 0.5;
    let startX, startY, endX, endY;
    
    if (startFromEdge) {
      // Start from random edge
      const edge = Math.floor(random(2) * 4);
      switch (edge) {
        case 0: // Top edge
          startX = random(3);
          startY = 0;
          break;
        case 1: // Right edge
          startX = 1;
          startY = random(4);
          break;
        case 2: // Bottom edge
          startX = random(5);
          startY = 1;
          break;
        case 3: // Left edge
          startX = 0;
          startY = random(6);
          break;
      }
      
      // End somewhere in the middle
      endX = 0.3 + random(7) * 0.4;
      endY = 0.3 + random(8) * 0.4;
    } else {
      // Start from center area
      startX = 0.4 + random(9) * 0.2;
      startY = 0.4 + random(10) * 0.2;
      
      // End at random point
      endX = random(11);
      endY = random(12);
    }
    
    // Add some irregularity for more natural look
    const irregularity = 1 - straightness;
    const midPoints = [];
    const segments = 2 + Math.floor(irregularity * 3); // 2-4 segments based on material
    
    for (let seg = 1; seg < segments; seg++) {
      const t = seg / segments;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      
      // Add random offset based on material properties
      const offsetX = (random(13 + seg) - 0.5) * irregularity * 0.1;
      const offsetY = (random(14 + seg) - 0.5) * irregularity * 0.1;
      
      midPoints.push({
        x: Math.max(0, Math.min(1, baseX + offsetX)),
        y: Math.max(0, Math.min(1, baseY + offsetY))
      });
    }
    
    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      midPoints: midPoints,
      width: this.crackLevel * 0.5 + 0.5, // Crack width based on level
      opacity: Math.min(1, this.crackLevel * 0.3 + 0.4) // Crack opacity
    };
  }

  /**
   * Seeded random function for consistent crack patterns
   */
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Get visual representation info including crack effects
   */
  getVisualState() {
    return {
      color: this.isDestroyed ? '#000000' : this.getColor(),
      opacity: this.isDestroyed ? 0.1 : (this.health / this.maxHealth),
      oreType: this.oreType,
      position: { x: this.x, y: this.y },
      isDestroyed: this.isDestroyed,
      crackLevel: this.crackLevel,
      crackPatterns: this.crackPatterns,
      damagePercentage: (this.maxHealth - this.health) / this.maxHealth
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
   * Create grid from CSV data with material property integration
   */
  static fromCSVData(csvData) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Load material properties from CSV if columns exist
    materialPropertyHandler.loadFromCSV(csvData);
    
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
        // Get material properties for this block
        const materialProperties = materialPropertyHandler.getMaterialProperties(oreType);
        blocks.push(new OreBlock(x, y, oreType, hardness, value, materialProperties));
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
    
    // Expand to minimum 10x10 by duplicating existing pattern
    grid.expandTo10x10ByDuplication();
    
    return grid;
  }

  /**
   * Expand grid to minimum 10x10 by duplicating existing rows and columns.
   * Creates fully functional OreBlock instances (blastable, with material properties).
   * If grid is empty, initializes 10x10 stone field.
   */
  expandTo10x10ByDuplication() {
    // Handle empty grid
    if (this.width === 0 || this.height === 0 || !this.grid) {
      this.width = 10;
      this.height = 10;
      this.grid = Array.from({ length: 10 }, (_, y) =>
        Array.from({ length: 10 }, (_, x) => {
          const oreType = 'stone';
          const hardness = 100;
          const value = 10;
          const props = materialPropertyHandler.getMaterialProperties(oreType);
          const block = new OreBlock(x, y, oreType, hardness, value, props);
          this.blocks.set(`${x},${y}`, block);
          return block;
        })
      );
      console.log('Initialized empty grid to 10x10 stone');
      return;
    }

    const originalWidth = this.width;
    const originalHeight = this.height;

    // Duplicate columns to reach width 10
    if (this.width < 10) {
      for (let y = 0; y < this.height; y++) {
        for (let x = originalWidth; x < 10; x++) {
          const sourceX = x % originalWidth;
          const sourceBlock = this.grid[y][sourceX];
          if (sourceBlock) {
            const duplicate = new OreBlock(
              x,
              y,
              sourceBlock.oreType,
              sourceBlock.maxHealth,
              sourceBlock.value,
              sourceBlock.materialProperties
            );
            this.grid[y][x] = duplicate;
            this.blocks.set(`${x},${y}`, duplicate);
          } else {
            // Fallback stone block
            const props = materialPropertyHandler.getMaterialProperties('stone');
            const filler = new OreBlock(x, y, 'stone', 100, 10, props);
            this.grid[y][x] = filler;
            this.blocks.set(`${x},${y}`, filler);
          }
        }
      }
      this.width = 10;
    }

    // Duplicate rows to reach height 10
    if (this.height < 10) {
      for (let y = originalHeight; y < 10; y++) {
        const sourceY = y % originalHeight;
        const sourceRow = this.grid[sourceY];
        const newRow = new Array(this.width);
        for (let x = 0; x < this.width; x++) {
          const sourceBlock = sourceRow[x];
          if (sourceBlock) {
            const duplicate = new OreBlock(
              x,
              y,
              sourceBlock.oreType,
              sourceBlock.maxHealth,
              sourceBlock.value,
              sourceBlock.materialProperties
            );
            newRow[x] = duplicate;
            this.blocks.set(`${x},${y}`, duplicate);
          } else {
            const props = materialPropertyHandler.getMaterialProperties('stone');
            const filler = new OreBlock(x, y, 'stone', 100, 10, props);
            newRow[x] = filler;
            this.blocks.set(`${x},${y}`, filler);
          }
        }
        this.grid.push(newRow);
      }
      this.height = 10;
    }

    console.log(`Grid expanded to ${this.width}x${this.height} by duplicating existing blocks`);
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
      let block = this.grid[y][x];
      // Lazy create if missing (shouldn't happen after duplication but safe fallback)
      if (!block) {
        const oreType = 'stone';
        const hardness = 100;
        const value = 10;
        const props = materialPropertyHandler.getMaterialProperties(oreType);
        block = new OreBlock(x, y, oreType, hardness, value, props);
        this.grid[y][x] = block;
        this.blocks.set(`${x},${y}`, block);
      }
      return block;
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
   * Apply blast effect to an area with optional direction
   * (direction in degrees, or null for omnidirectional)
   */
  applyBlast(centerX, centerY, radius, power, direction = null) {
    const startTime = performance.now(); // Performance monitoring
    
    // Validate and log direction for debugging
    if (direction !== null) {
      validateDirection(direction, `blast at (${centerX}, ${centerY})`);
    }
    
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

    // GUARANTEED CENTER DESTRUCTION: ensure placed explosive always destroys its cell
    const centerBlock = this.getBlockAtGridPos(centerX, centerY);
    if (centerBlock && !centerBlock.isDestroyed) {
      centerBlock.health = 0;
      centerBlock.damage = centerBlock.maxHealth;
      centerBlock.isDestroyed = true;
      affectedBlocks.push(centerBlock);
      destroyedBlocks.push(centerBlock);
    }

    for (let y = Math.max(0, centerY - maxDisplacementRadius); y <= Math.min(this.height - 1, centerY + maxDisplacementRadius); y++) {
      for (let x = Math.max(0, centerX - maxDisplacementRadius); x <= Math.min(this.width - 1, centerX + maxDisplacementRadius); x++) {
        const block = this.getBlockAtGridPos(x, y);
        if (!block || block.isDestroyed) continue;
        if (x === centerX && y === centerY) continue; // Already destroyed center

        // Pre-calculate distance once for performance
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (distance <= maxDisplacementRadius) {
          // Apply decay function to calculate effective power
          const decayedPower = this.calculateDecayedPower(power, distance, decayConstant);
          
          // Apply damage within the main blast radius
          if (distance <= radius) {
            let damageFactor = 1 - (distance / radius);
            
            // Apply directional bias to damage if direction is specified
            if (direction !== null) {
              // Convert direction to radians (0° = North, 90° = East, 180° = South, 270° = West)
              const directionRadians = (direction * Math.PI) / 180;
              
              // Calculate angle from blast center to block (standard atan2: 0° = East, 90° = North)
              const blockAngle = Math.atan2(y - centerY, x - centerX);
              
              // Convert blast direction to standard mathematical convention for comparison
              // Our direction: 0° = North (-Y), but math convention: 0° = East (+X)
              // So we need to rotate by -90° to align: directionRadians - Math.PI/2
              const adjustedDirectionAngle = directionRadians - Math.PI/2;
              
              // Calculate angular difference between block direction and blast direction
              let angleFromDirection = Math.abs(blockAngle - adjustedDirectionAngle);
              
              // Normalize angle to [0, π] (shortest angular distance)
              angleFromDirection = Math.min(angleFromDirection, 2 * Math.PI - angleFromDirection);
              
              // Boost damage in the direction of the blast (within 90-degree cone)
              if (angleFromDirection <= Math.PI / 2) {
                const directionBoost = 1 + (0.5 * (1 - angleFromDirection / (Math.PI / 2)));
                damageFactor *= directionBoost;
              }
            }
            
            const damage = decayedPower * damageFactor;
            const wasDestroyed = block.takeDamage(damage);
            affectedBlocks.push(block);
            
            if (wasDestroyed) {
              destroyedBlocks.push(block);
            }

            // Calculate displacement if block survives
            if (!wasDestroyed && distance > 0) {
              const displacement = this.calculateRadialDisplacement(
                block, centerX, centerY, distance, decayedPower, maxDisplacementRadius, direction
              );
              if (displacement) {
                displacedBlocks.push(displacement);
              }
            }
          }
          // Apply only displacement for blocks outside damage radius but within displacement radius
          else if (distance > 0) {
            const displacement = this.calculateRadialDisplacement(
              block, centerX, centerY, distance, decayedPower, maxDisplacementRadius, direction
            );
            if (displacement) {
              displacedBlocks.push(displacement);
            }
          }
        }
      }
    }

    // Apply displacements
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

    // Edge safeguard: ensure rightmost blasts show effect
    if (centerX === this.width - 1 && destroyedBlocks.length === 0 && affectedBlocks.length === 0) {
      const fallbackY = Math.max(0, Math.min(this.height - 1, centerY));
      const edgeBlock = this.getBlockAtGridPos(centerX, fallbackY);
      if (edgeBlock && !edgeBlock.isDestroyed) {
        const forcedDamage = Math.max(5, power * 0.1);
        const destroyed = edgeBlock.takeDamage(forcedDamage);
        affectedBlocks.push(edgeBlock);
        if (destroyed) destroyedBlocks.push(edgeBlock);
        console.warn('Applied edge fallback blast damage to last-column block:', {
          x: centerX,
          y: fallbackY,
          forcedDamage
        });
      }
    }

    return {
      affectedBlocks,
      destroyedBlocks,
      displacedBlocks,
      totalDamage: affectedBlocks.reduce((sum, block) => sum + block.damage, 0),
      direction: direction // Include direction in result for physics engine
    };
  }

  /**
   * Calculate displacement for a block
   */
  calculateDisplacement(block, centerX, centerY, distance, power, maxRadius) {
    // Direction vector from blast center to block
    const dirX = (block.x - centerX) / distance;
    const dirY = (block.y - centerY) / distance;

    // Force calculation: inverse square with minimum threshold
    const forceFactor = Math.max(0.1, 1 - (distance / maxRadius));
    const blastForce = (power / 100) * forceFactor;

    // Material resistance (heavier materials move less)
    const materialResistance = this.getMaterialResistance(block.oreType);
    const effectiveForce = blastForce * materialResistance;

    // Calculate displacement magnitude (max 3 grid units)
    const displacementMagnitude = Math.min(3, effectiveForce);

    // Only displace if force is significant enough
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
        force: effectiveForce,
        distance: distance
      };
    }

    return null;
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
   * Calculate radial displacement based on decayed power with enhanced material properties and directional bias
   */
  calculateRadialDisplacement(block, centerX, centerY, distance, decayedPower, maxRadius, direction = null) {
    // Get material properties for enhanced calculations
    const materialProps = block.materialProperties || materialPropertyHandler.getMaterialProperties(block.oreType);
    
    // Calculate base direction vector from blast center to block (radial outward)
    let dirX = (block.x - centerX) / distance;
    let dirY = (block.y - centerY) / distance;
    
    // Apply directional bias if blast direction is specified
    if (direction !== null) {
      // Convert blast direction to unit vector
      const directionRadians = (direction * Math.PI) / 180;
      const blastDirX = Math.sin(directionRadians); // 0° = North = -Y, but sin gives us X component
      const blastDirY = -Math.cos(directionRadians); // -cos gives us proper Y component for 0° = North
      
      // Calculate the angle between natural radial direction and blast direction
      const naturalAngle = Math.atan2(dirY, dirX);
      const blastAngle = Math.atan2(blastDirY, blastDirX);
      
      // Determine how much to bias toward blast direction (stronger bias for closer blocks)
      const maxBiasDistance = maxRadius * 0.7; // Bias affects blocks within 70% of max radius
      const biasStrength = Math.max(0, 1 - (distance / maxBiasDistance));
      const directionWeight = biasStrength * 0.8; // Up to 80% directional influence
      
      // Blend radial and directional forces
      dirX = (dirX * (1 - directionWeight)) + (blastDirX * directionWeight);
      dirY = (dirY * (1 - directionWeight)) + (blastDirY * directionWeight);
      
      // Normalize the combined direction vector
      const combinedMagnitude = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      dirX /= combinedMagnitude;
      dirY /= combinedMagnitude;
      
      console.log(`Directional displacement for block at (${block.x}, ${block.y}):`, {
        blastDirection: direction,
        distance: distance.toFixed(2),
        biasStrength: biasStrength.toFixed(3),
        directionWeight: directionWeight.toFixed(3),
        originalDir: `(${((block.x - centerX) / distance).toFixed(3)}, ${((block.y - centerY) / distance).toFixed(3)})`,
        blastDir: `(${blastDirX.toFixed(3)}, ${blastDirY.toFixed(3)})`,
        finalDir: `(${dirX.toFixed(3)}, ${dirY.toFixed(3)})`
      });
    }

    // Force calculation based on decayed power
    const baseForce = decayedPower / 100; // Scale for displacement
    
    // Additional distance-based reduction for displacement
    const distanceFactor = Math.max(0.1, 1 - (distance / maxRadius));
    let effectiveForce = baseForce * distanceFactor;

    // ENHANCED MATERIAL COEFFICIENT INTEGRATION
    
    // 1. Density-based resistance (heavier materials move less)
    const density = materialProps.density || 2.7; // g/cm³
    const densityResistance = this.calculateDensityResistance(density);
    
    // 2. Hardness-based resistance (harder materials resist displacement)
    const hardness = materialProps.hardness || 5; // Mohs scale
    const hardnessResistance = this.calculateHardnessResistance(hardness);
    
    // 3. Combined material resistance factor
    const materialResistance = densityResistance * hardnessResistance;
    
    // 4. Fragmentation factor (affects how force is transmitted)
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    const fragmentationFactor = this.calculateFragmentationFactor(fragmentationIndex);
    
    // Apply all material factors to force
    effectiveForce = effectiveForce * materialResistance * fragmentationFactor;
    
    console.log(`Material displacement analysis for ${block.oreType}:`, {
      density: density,
      hardness: hardness,
      fragmentationIndex: fragmentationIndex,
      densityResistance: densityResistance.toFixed(3),
      hardnessResistance: hardnessResistance.toFixed(3),
      fragmentationFactor: fragmentationFactor.toFixed(3),
      finalResistance: materialResistance.toFixed(3),
      baseForce: baseForce.toFixed(3),
      effectiveForce: effectiveForce.toFixed(3)
    });

    // Calculate displacement magnitude with enhanced scaling
    const maxDisplacement = this.calculateMaxDisplacement(materialProps);
    const displacementMagnitude = Math.min(maxDisplacement, effectiveForce * 4);

    // Apply minimum displacement threshold based on material
    const minDisplacementThreshold = this.getMinDisplacementThreshold(materialProps);
    if (displacementMagnitude < minDisplacementThreshold) {
      return null; // Too weak to cause displacement for this material
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
        force: effectiveForce,
        distance: distance,
        materialData: {
          density: density,
          hardness: hardness,
          fragmentationIndex: fragmentationIndex,
          displacementMagnitude: displacementMagnitude
        }
      };
    }

    return null;
  }

  /**
   * Get material resistance to displacement using material properties
   */
  getMaterialResistance(oreType) {
    return materialPropertyHandler.getDisplacementResistance(oreType);
  }

  /**
   * Calculate density-based resistance factor
   * Lighter materials (lower density) move more easily
   */
  calculateDensityResistance(density) {
    // Density range: 1.0 - 20.0 g/cm³
    // Resistance range: 0.2 - 1.0 (lighter = lower resistance = more movement)
    const normalizedDensity = Math.max(1.0, Math.min(20.0, density));
    
    // Logarithmic scaling for more realistic physics
    // Very light materials (1-2 g/cm³) move easily
    // Heavy materials (15-20 g/cm³) resist movement strongly
    const resistance = 0.2 + (Math.log(normalizedDensity) / Math.log(20)) * 0.8;
    
    return Math.min(1.0, resistance);
  }

  /**
   * Calculate hardness-based resistance factor
   * Harder materials resist displacement more
   */
  calculateHardnessResistance(hardness) {
    // Hardness range: 1 - 10 (Mohs scale)
    // Resistance range: 0.3 - 1.0 (softer = less resistance = more movement)
    const normalizedHardness = Math.max(1, Math.min(10, hardness));
    
    // Linear scaling with slight curve
    const resistance = 0.3 + (normalizedHardness / 10) * 0.7;
    
    return resistance;
  }

  /**
   * Calculate fragmentation factor
   * Higher fragmentation index = breaks easier = transfers force less efficiently
   */
  calculateFragmentationFactor(fragmentationIndex) {
    // Fragmentation range: 0.0 - 1.0
    // Factor range: 0.4 - 1.2 (high fragmentation = less efficient force transfer)
    const normalizedFragmentation = Math.max(0.0, Math.min(1.0, fragmentationIndex));
    
    // Inverse relationship: more fragmentation = less force transfer
    // But slight boost for materials that fragment easily (they can "flow" more)
    const factor = 1.2 - (normalizedFragmentation * 0.8);
    
    return Math.max(0.4, factor);
  }

  /**
   * Calculate maximum displacement distance based on material properties
   */
  calculateMaxDisplacement(materialProps) {
    const density = materialProps.density || 2.7;
    const hardness = materialProps.hardness || 5;
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    
    // Base displacement: 1-4 grid units depending on material
    let baseMax = 2.0;
    
    // Light materials can move farther
    if (density < 2.0) baseMax = 4.0;
    else if (density < 4.0) baseMax = 3.0;
    else if (density > 10.0) baseMax = 1.5;
    
    // Soft materials can move farther
    if (hardness <= 3) baseMax += 0.5;
    else if (hardness >= 8) baseMax -= 0.5;
    
    // High fragmentation materials can move farther (flow-like behavior)
    if (fragmentationIndex > 0.8) baseMax += 1.0;
    
    return Math.max(1.0, baseMax);
  }

  /**
   * Get minimum displacement threshold based on material properties
   */
  getMinDisplacementThreshold(materialProps) {
    const density = materialProps.density || 2.7;
    const hardness = materialProps.hardness || 5;
    
    // Heavy or hard materials need more force to move
    let threshold = 0.2;
    
    if (density > 15.0) threshold = 0.4; // Very heavy materials
    else if (density > 10.0) threshold = 0.3; // Heavy materials
    else if (density < 2.0) threshold = 0.1; // Light materials
    
    if (hardness >= 9) threshold += 0.2; // Very hard materials
    else if (hardness >= 7) threshold += 0.1; // Hard materials
    
    return Math.min(0.6, threshold);
  }

  /**
   * Check if block should fragment based on material properties and damage
   */
  shouldFragment(block, damage) {
    const materialProps = block.materialProperties || materialPropertyHandler.getMaterialProperties(block.oreType);
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    const hardness = materialProps.hardness || 5;
    
    // Calculate fragmentation probability
    const damageFactor = damage / block.maxHealth;
    const fragmentationChance = fragmentationIndex * damageFactor;
    
    // Hard materials resist fragmentation
    const hardnessReduction = Math.max(0.1, 1 - (hardness / 15));
    const finalChance = fragmentationChance * hardnessReduction;
    
    // Random chance with material-based probability
    const roll = Math.random();
    const willFragment = roll < finalChance;
    
    console.log(`Fragmentation check for ${block.oreType}:`, {
      fragmentationIndex: fragmentationIndex.toFixed(2),
      hardness: hardness,
      damageFactor: damageFactor.toFixed(2),
      fragmentationChance: fragmentationChance.toFixed(2),
      hardnessReduction: hardnessReduction.toFixed(2),
      finalChance: finalChance.toFixed(2),
      roll: roll.toFixed(2),
      willFragment: willFragment
    });
    
    return willFragment;
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
    
    // Clear the flag after 2 seconds
    if (block.displacementTimer) {
      clearTimeout(block.displacementTimer);
    }
    
    block.displacementTimer = setTimeout(() => {
      block.recentlyDisplaced = false;
      block.displacementTimer = null;
    }, 2000);
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
