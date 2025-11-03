/**
 * Physics Engine Integration with Matter.js
 * ENHANCED VERSION - Material property integration for realistic displacement
 */

import Matter from 'matter-js';
import { materialPropertyHandler } from './MaterialPropertyHandler.js';

export class PhysicsEngine {
  constructor() {
    this.engine = null;
    this.world = null;
    this.bodies = [];
    this.debrisBodies = []; // Track debris separately
    this.isRunning = false;
    this.animationFrameId = null;
    this.startTime = null;
    
    // Configurable decay constants for experimentation
    this.decayConfig = {
      exponentialK: 0.03,     // Exponential decay constant (experiment: 0.02-0.05)
      linearK: null,          // Will be calculated based on maxDistance
      blendThreshold: 0.4,    // Blend point (40% of max distance)
      maxDistance: 120,       // Maximum blast range
      maxForce: 0.025        // Base force magnitude
    };
  }

  // Initialize the physics engine (NO RENDERER - we'll draw manually)
  initialize(options = {}) {
    const defaultOptions = {
      gravity: { x: 0, y: 1 }
    };

    const config = { ...defaultOptions, ...options };

    // Create engine with gravity
    this.engine = Matter.Engine.create({
      gravity: config.gravity
    });
    this.world = this.engine.world;

    return this;
  }

  // Start the physics simulation
  start() {
    if (!this.engine) {
      throw new Error('Physics engine not initialized');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    return this;
  }

  // Stop the physics simulation
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    return this;
  }

  // Manual update loop (call this from your render function)
  update(deltaTime = 16.67) {
    if (this.isRunning && this.engine) {
      Matter.Engine.update(this.engine, deltaTime);
    }
  }

  // Create debris particles from blast affected cells with directional support
  createDebris(affectedCells, cellSize, blastCenter, blastDirection = null) {
    console.log('PhysicsEngine: Creating debris for', affectedCells.length, 'cells');
    console.log('Blast center:', blastCenter, 'Direction:', blastDirection);
    console.log('Engine initialized:', !!this.engine, 'World exists:', !!this.world);
    
    if (!this.world) {
      console.error('Physics world not initialized!');
      return [];
    }
    
    const debris = [];

    // Pre-calculate blast center coordinates for performance
    const blastCenterX = blastCenter.x;
    const blastCenterY = blastCenter.y;

    affectedCells.forEach(cell => {
      // Pre-calculate cell center coordinates
      const cellCenterX = cell.x * cellSize + cellSize / 2;
      const cellCenterY = cell.y * cellSize + cellSize / 2;
      
      console.log(`Processing cell ${index}: (${cell.x}, ${cell.y}) -> (${cellCenterX}, ${cellCenterY})`);
      
      // Calculate distance from blast center
      const distance = Math.sqrt(
        Math.pow(cellCenterX - blastCenterX, 2) + 
        Math.pow(cellCenterY - blastCenterY, 2)
      );

      // Create multiple small particles per cell
      const particleCount = this.getParticleCount(cell.originalMaterial);
      console.log(`Creating ${particleCount} particles for material ${cell.originalMaterial}`);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = this.createDebrisParticle(
          cellCenterX, 
          cellCenterY, 
          cell.originalMaterial,
          distance, // Pass pre-calculated distance
          blastCenter,
          cellSize,
          blastDirection
        );
        
        if (particle) {
          debris.push(particle);
          Matter.World.add(this.world, particle.body);
          console.log(`Added particle at (${particle.body.position.x}, ${particle.body.position.y})`);
        }
      }
    });

    console.log(`Created ${debris.length} total debris particles`);
    this.debrisBodies.push(...debris);
    return debris;
  }

  // Create individual debris particle with enhanced material property integration
  createDebrisParticle(x, y, material, distance, blastCenter, cellSize, blastDirection = null) {
    // Get material properties for enhanced physics
    const materialProps = materialPropertyHandler.getMaterialProperties(material);
    
    // Particle size based on material properties
    const size = this.getParticleSize(material);
    
    // Random offset within cell
    const offsetX = (Math.random() - 0.5) * cellSize * 0.6;
    const offsetY = (Math.random() - 0.5) * cellSize * 0.6;
    
    // Calculate enhanced blast force with material coefficients
    const blastForce = this.calculateEnhancedBlastForce(x, y, blastCenter, distance, blastDirection, materialProps);
    
    // Get material-based physics properties
    const density = this.getMaterialDensity(material);
    const hardness = materialProps.hardness || 5;
    
    // Create Matter.js body with enhanced properties
    const body = Matter.Bodies.circle(
      x + offsetX, 
      y + offsetY, 
      size, 
      {
        density: density,
        friction: 0.5 + (hardness / 20), // Harder materials have more friction
        frictionAir: 0.01 + (density * 5), // Denser materials have more air resistance
        restitution: Math.max(0.2, 0.6 - (hardness / 15)) // Harder materials bounce less
      }
    );

    console.log(`Created enhanced particle for ${material}:`, {
      size: size.toFixed(1),
      density: density.toFixed(4),
      hardness: hardness,
      friction: body.friction.toFixed(2),
      restitution: body.restitution.toFixed(2)
    });

    // Apply enhanced blast force
    Matter.Body.applyForce(body, body.position, blastForce);
    
    // Add rotation based on material properties
    const rotationStrength = 0.1 + (materialProps.fragmentation_index || 0.5) * 0.15;
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * rotationStrength);

    // Return particle with enhanced rendering info
    return {
      body: body,
      color: this.getMaterialColor(material),
      size: size,
      material: material,
      materialProps: materialProps,
      createdAt: Date.now()
    };
  }

  // Calculate enhanced blast force with material property integration
  calculateEnhancedBlastForce(x, y, blastCenter, distance, blastDirection = null, materialProps) {
    const { maxDistance, maxForce, exponentialK, blendThreshold } = this.decayConfig;
    
    // Pre-calculate direction vector components for performance
    const dirX = x - blastCenter.x;
    const dirY = y - blastCenter.y;
    const magnitude = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    
    let normalizedX = dirX / magnitude;
    let normalizedY = dirY / magnitude;
    
    // Apply directional bias if specified
    if (blastDirection !== null) {
      const directionRadians = (blastDirection * Math.PI) / 180;
      
      // Direct calculation for cardinal directions to ensure accuracy
      let preferredDirX, preferredDirY;
      
      if (blastDirection === 0) {        // North
        preferredDirX = 0;
        preferredDirY = -1;
      } else if (blastDirection === 90) { // East
        preferredDirX = 1;
        preferredDirY = 0;
      } else if (blastDirection === 180) { // South
        preferredDirX = 0;
        preferredDirY = 1;
      } else if (blastDirection === 270) { // West
        preferredDirX = -1;
        preferredDirY = 0;
      } else {
        // For other angles, use trigonometry
        preferredDirX = Math.sin(directionRadians);
        preferredDirY = -Math.cos(directionRadians);
      }
      
      // Use 100% directional movement
      normalizedX = preferredDirX;
      normalizedY = preferredDirY;
    }
    
    // **ENHANCED DECAY MODELS WITH MATERIAL PROPERTIES**
    
    // Base force calculation using hybrid decay model
    const exponentialForce = maxForce * Math.exp(-exponentialK * distance);
    const linearK = maxForce / maxDistance;
    const linearForce = Math.max(0, maxForce - linearK * distance);
    
    const blendDistance = maxDistance * blendThreshold;
    const blendFactor = Math.min(1, distance / blendDistance);
    
    let baseForceMagnitude;
    if (distance <= blendDistance) {
      baseForceMagnitude = exponentialForce;
    } else {
      baseForceMagnitude = (1 - blendFactor) * exponentialForce + blendFactor * linearForce;
    }
    
    // **MATERIAL COEFFICIENT INTEGRATION**
    
    // 1. Density factor (lighter materials get more force)
    const density = materialProps.density || 2.7;
    const densityFactor = Math.max(0.3, 3.0 / Math.sqrt(density)); // Inverse square root for realistic physics
    
    // 2. Hardness factor (softer materials absorb less energy)
    const hardness = materialProps.hardness || 5;
    const hardnessFactor = Math.max(0.5, (12 - hardness) / 8); // Softer = more movement
    
    // 3. Fragmentation factor (more fragmented materials move more chaotically)
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    const fragmentationFactor = 0.8 + (fragmentationIndex * 0.4); // Range: 0.8 - 1.2
    
    // Combine all material factors
    const materialMultiplier = densityFactor * hardnessFactor * fragmentationFactor;
    
    // Apply material effects to force
    const enhancedForceMagnitude = baseForceMagnitude * materialMultiplier;
    
    console.log(`Enhanced force calculation for ${materialProps.type || 'unknown'}:`, {
      density: density.toFixed(1),
      hardness: hardness,
      fragmentationIndex: fragmentationIndex.toFixed(2),
      densityFactor: densityFactor.toFixed(2),
      hardnessFactor: hardnessFactor.toFixed(2),
      fragmentationFactor: fragmentationFactor.toFixed(2),
      materialMultiplier: materialMultiplier.toFixed(2),
      baseForceMagnitude: baseForceMagnitude.toFixed(4),
      enhancedForceMagnitude: enhancedForceMagnitude.toFixed(4)
    });
    
    // Ensure minimum threshold
    const finalForceMagnitude = Math.max(0, enhancedForceMagnitude);
    
    return {
      x: normalizedX * finalForceMagnitude,
      y: normalizedY * finalForceMagnitude
    };
  }

  // Method to experiment with decay constants for visual balance
  setDecayConstants(exponentialK, blendThreshold, maxDistance, maxForce) {
    this.decayConfig.exponentialK = exponentialK || 0.03;
    this.decayConfig.blendThreshold = blendThreshold || 0.4;
    this.decayConfig.maxDistance = maxDistance || 120;
    this.decayConfig.maxForce = maxForce || 0.025;
    
    console.log('Updated decay constants:', this.decayConfig);
  }

  // Get particle count based on material properties - Enhanced with fragmentation
  getParticleCount(material) {
    // Get material properties for accurate fragmentation
    const materialProps = materialPropertyHandler.getMaterialProperties(material);
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    const density = materialProps.density || 2.7;
    
    // Base particle count influenced by fragmentation and density
    let baseCount = Math.round(8 + (fragmentationIndex * 15)); // 8-23 particles
    
    // Dense materials create fewer, larger pieces
    if (density > 10) baseCount = Math.round(baseCount * 0.7);
    else if (density < 2) baseCount = Math.round(baseCount * 1.3);
    
    // Material-specific adjustments for realistic behavior
    const materialAdjustments = {
      'iron': 1.2,        // Iron fragments moderately
      'gold': 0.8,        // Gold stays more intact
      'coal': 1.5,        // Coal breaks into many pieces
      'stone': 1.1,       // Stone fragments normally
      'granite': 0.9,     // Hard granite resists fragmentation
      'limestone': 1.3,   // Limestone fragments easily
      'soil/overburden': 2.0, // Soil creates lots of small particles
      'sandstone': 1.4    // Sandstone fragments well
    };
    
    const adjustment = materialAdjustments[material?.toLowerCase()] || 1.0;
    const finalCount = Math.round(baseCount * adjustment);
    
    console.log(`Particle count for ${material}:`, {
      fragmentationIndex: fragmentationIndex.toFixed(2),
      density: density.toFixed(1),
      baseCount: baseCount,
      adjustment: adjustment,
      finalCount: finalCount
    });
    
    return Math.max(5, Math.min(30, finalCount));
  }

  // Get particle size based on material properties - Enhanced with density and hardness
  getParticleSize(material) {
    // Get material properties for accurate sizing
    const materialProps = materialPropertyHandler.getMaterialProperties(material);
    const density = materialProps.density || 2.7;
    const hardness = materialProps.hardness || 5;
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    
    // Base size influenced by material properties
    let baseSize = 6; // Default size
    
    // Dense materials create larger, fewer particles
    if (density > 15) baseSize = 9;      // Very heavy metals
    else if (density > 8) baseSize = 8;  // Heavy materials
    else if (density > 4) baseSize = 7;  // Medium materials
    else if (density < 2) baseSize = 5;  // Light materials
    
    // Hard materials create larger chunks
    if (hardness >= 9) baseSize += 1;    // Very hard
    else if (hardness >= 7) baseSize += 0.5; // Hard
    else if (hardness <= 2) baseSize -= 1;   // Very soft
    
    // High fragmentation creates smaller pieces
    if (fragmentationIndex > 0.8) baseSize -= 1.5;
    else if (fragmentationIndex > 0.6) baseSize -= 1;
    else if (fragmentationIndex < 0.3) baseSize += 1;
    
    // Size variation for realism
    const sizeVariation = (Math.random() - 0.5) * 2;
    const finalSize = Math.max(3, baseSize + sizeVariation);
    
    return finalSize;
  }

  // Get material density using real material properties
  getMaterialDensity(material) {
    // Get actual material properties
    const materialProps = materialPropertyHandler.getMaterialProperties(material);
    const realDensity = materialProps.density || 2.7; // g/cm³
    
    // Convert to Matter.js density (scaled for physics simulation)
    // Matter.js density is typically 0.001 - 0.01 for good simulation
    // Scale real density (1-20 g/cm³) to physics density (0.001-0.015)
    const physicsDensity = 0.001 + (realDensity / 25) * 0.014;
    
    console.log(`Material density for ${material}: ${realDensity} g/cm³ -> ${physicsDensity.toFixed(4)} physics units`);
    
    return physicsDensity;
  }

  // Get material color using enhanced material property system
  getMaterialColor(material) {
    // Get material properties for color determination
    const materialProps = materialPropertyHandler.getMaterialProperties(material);
    
    // Use the enhanced color system from MaterialPropertyHandler
    if (materialProps.type === 'ore') {
      // Ore colors based on value/rarity
      if (materialProps.game_value >= 100) return '#FFD700'; // Gold color for precious
      else if (materialProps.game_value >= 50) return '#CD853F'; // Bronze for valuable
      else if (materialProps.game_value >= 25) return '#D2691E'; // Copper for moderate
      else return '#696969'; // Dark gray for low value
    } else {
      // Waste rock colors based on hardness
      const hardness = materialProps.hardness || 5;
      if (hardness >= 7) return '#708090'; // Hard rock - slate gray
      else if (hardness >= 5) return '#8B4513'; // Medium rock - saddle brown
      else if (hardness >= 3) return '#F4A460'; // Soft rock - sandy brown
      else return '#DEB887'; // Very soft - burlywood
    }
  }

  // Add boundaries (ground and walls)
  addBoundaries(width, height) {
    const thickness = 50;
    const boundaries = [
      // Ground
      Matter.Bodies.rectangle(width / 2, height + thickness/2, width, thickness, { 
        isStatic: true,
        restitution: 0.3,
        friction: 0.8
      }),
      // Left wall
      Matter.Bodies.rectangle(-thickness/2, height / 2, thickness, height, { 
        isStatic: true,
        restitution: 0.2
      }),
      // Right wall
      Matter.Bodies.rectangle(width + thickness/2, height / 2, thickness, height, { 
        isStatic: true,
        restitution: 0.2
      })
    ];

    Matter.World.add(this.world, boundaries);
    this.bodies.push(...boundaries);
    
    return boundaries;
  }

  // Get all debris for rendering
  getDebris() {
    return this.debrisBodies;
  }

  // Check if simulation should continue
  shouldContinue(maxDuration = 5000) {
    if (!this.startTime) return false;
    return (Date.now() - this.startTime) < maxDuration;
  }

  // Clear all physics bodies
  clearAllBodies() {
    if (this.world) {
      // Remove all bodies
      const allBodies = Matter.Composite.allBodies(this.world);
      Matter.World.clear(this.world, false);
    }
    this.bodies = [];
    this.debrisBodies = [];
  }

  // Cleanup and destroy
  destroy() {
    this.stop();
    this.clearAllBodies();
    
    if (this.engine) {
      Matter.Engine.clear(this.engine);
    }

    this.engine = null;
    this.world = null;
    this.isRunning = false;
    this.startTime = null;
  }
}

// Export singleton
export const physicsEngine = new PhysicsEngine();
export default physicsEngine;