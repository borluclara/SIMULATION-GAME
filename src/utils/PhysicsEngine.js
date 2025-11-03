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
      gravity: { x: 0, y: 0.8 }, // More realistic gravity for falling debris
      enableSleeping: false, // Keep particles active for better visual effect
      constraintIterations: 2,
      positionIterations: 6,
      velocityIterations: 4,
      timing: {
        timeScale: 1
      }
    };

    const config = { ...defaultOptions, ...options };

    // Create engine with enhanced physics settings
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    
    // Configure engine properties for better debris simulation
    this.engine.world.gravity.x = config.gravity.x;
    this.engine.world.gravity.y = config.gravity.y;
    this.engine.enableSleeping = config.enableSleeping;
    this.engine.constraintIterations = config.constraintIterations;
    this.engine.positionIterations = config.positionIterations;
    this.engine.velocityIterations = config.velocityIterations;
    this.engine.timing.timeScale = config.timing.timeScale;

    console.log('PhysicsEngine initialized with enhanced settings:', {
      gravity: this.engine.world.gravity,
      enableSleeping: this.engine.enableSleeping
    });

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

  // Enhanced update loop for better falling debris simulation
  update(deltaTime = 16.67) {
    if (this.isRunning && this.engine) {
      // Update the physics engine
      Matter.Engine.update(this.engine, deltaTime);
      
      // Update debris particle states for enhanced effects
      this.debrisBodies.forEach(debris => {
        if (debris.body && debris.isActive) {
          // Track bounce count for visual effects
          this.updateDebrisBounceCount(debris);
          
          // Apply air resistance effects based on material
          this.applyMaterialAirEffects(debris, deltaTime);
          
          // Check for settling (debris coming to rest)
          this.checkDebrisSettling(debris);
        }
      });
    }
  }
  
  // Update bounce count for debris particles
  updateDebrisBounceCount(debris) {
    const velocity = debris.body.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    // If particle was moving and now nearly stopped, it likely bounced
    if (debris.previousSpeed > 2 && speed < 0.5) {
      debris.bounceCount = (debris.bounceCount || 0) + 1;
      console.log(`Debris bounced ${debris.bounceCount} times`);
    }
    
    debris.previousSpeed = speed;
  }
  
  // Apply material-specific air effects
  applyMaterialAirEffects(debris, deltaTime) {
    if (!debris.materialProps) return;
    
    const density = debris.materialProps.density || 2.7;
    const fragmentationIndex = debris.materialProps.fragmentation_index || 0.5;
    
    // Light materials experience more air turbulence
    if (density < 2.0 && Math.random() < 0.02) {
      const turbulence = {
        x: (Math.random() - 0.5) * 0.001 * fragmentationIndex,
        y: (Math.random() - 0.5) * 0.0005 * fragmentationIndex
      };
      Matter.Body.applyForce(debris.body, debris.body.position, turbulence);
    }
  }
  
  // Check if debris particle has settled and should become inactive
  checkDebrisSettling(debris) {
    const velocity = debris.body.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const angularSpeed = Math.abs(debris.body.angularVelocity);
    
    // If debris is barely moving for a while, mark as settled
    if (speed < 0.1 && angularSpeed < 0.01) {
      debris.settleTime = (debris.settleTime || 0) + 1;
      
      if (debris.settleTime > 60) { // ~1 second at 60fps
        debris.isActive = false;
        console.log(`Debris particle settled and marked inactive`);
      }
    } else {
      debris.settleTime = 0; // Reset settle time if it starts moving again
    }
  }

  // Create debris particles from blast affected cells with enhanced falling effects
  createDebris(affectedCells, cellSize, blastCenter, blastDirection = null) {
    console.log('PhysicsEngine: Creating enhanced falling debris for', affectedCells.length, 'cells');
    console.log('Blast center:', blastCenter, 'Direction:', blastDirection);
    console.log('Engine initialized:', !!this.engine, 'World exists:', !!this.world);
    
    if (!this.world) {
      console.error('Physics world not initialized!');
      return [];
    }
    
    const debris = [];
    const blastCenterX = blastCenter.x;
    const blastCenterY = blastCenter.y;

    affectedCells.forEach((cell, index) => {
      const cellCenterX = cell.x * cellSize + cellSize / 2;
      const cellCenterY = cell.y * cellSize + cellSize / 2;
      
      console.log(`Processing cell ${index}: (${cell.x}, ${cell.y}) -> (${cellCenterX}, ${cellCenterY})`);
      
      const distance = Math.sqrt(
        Math.pow(cellCenterX - blastCenterX, 2) + 
        Math.pow(cellCenterY - blastCenterY, 2)
      );

      // Create multiple particles per cell with varied properties for realistic falling
      const particleCount = this.getParticleCount(cell.originalMaterial);
      console.log(`Creating ${particleCount} falling debris particles for ${cell.originalMaterial}`);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = this.createEnhancedDebrisParticle(
          cellCenterX, 
          cellCenterY, 
          cell.originalMaterial,
          distance,
          blastCenter,
          cellSize,
          blastDirection,
          i / particleCount // Variation factor for diverse particle behavior
        );
        
        if (particle) {
          debris.push(particle);
          Matter.World.add(this.world, particle.body);
          
          // Apply initial upward velocity for realistic blast ejection
          const upwardForce = this.calculateInitialEjectionForce(distance, particle.materialProps);
          Matter.Body.applyForce(particle.body, particle.body.position, {
            x: upwardForce.x,
            y: upwardForce.y - 0.01 // Initial upward component
          });
          
          console.log(`Added falling debris particle at (${particle.body.position.x.toFixed(1)}, ${particle.body.position.y.toFixed(1)}) with ejection force`);
        }
      }
    });

    console.log(`Created ${debris.length} total falling debris particles`);
    this.debrisBodies.push(...debris);
    return debris;
  }
  
  // Calculate initial ejection force for realistic blast effect before gravity takes over
  calculateInitialEjectionForce(distance, materialProps) {
    const maxEjectionDistance = 120;
    const baseEjectionForce = 0.03;
    
    // Distance-based force reduction
    const distanceFactor = Math.max(0.1, 1 - (distance / maxEjectionDistance));
    
    // Material-based ejection modifications
    const density = materialProps.density || 2.7;
    const hardness = materialProps.hardness || 5;
    
    // Lighter materials get more ejection force
    const densityModifier = Math.max(0.3, 2.0 / Math.sqrt(density));
    
    // Softer materials fragment and eject more easily
    const hardnessModifier = Math.max(0.4, (10 - hardness) / 6);
    
    const totalForce = baseEjectionForce * distanceFactor * densityModifier * hardnessModifier;
    
    // Random radial direction for natural spread
    const angle = Math.random() * 2 * Math.PI;
    const variation = 0.7 + (Math.random() * 0.6); // Add force variation
    
    return {
      x: Math.cos(angle) * totalForce * variation,
      y: Math.sin(angle) * totalForce * variation * 0.5 // Reduce y-component so particles don't fly too high
    };
  }

  // Create enhanced falling debris particle with realistic physics properties
  createEnhancedDebrisParticle(x, y, material, distance, blastCenter, cellSize, blastDirection = null, variationFactor = 0) {
    // Get material properties for enhanced physics
    const materialProps = materialPropertyHandler.getMaterialProperties(material);
    
    // Varied particle size based on material properties and variation
    const baseSize = this.getParticleSize(material);
    const sizeVariation = 0.3 + (variationFactor * 0.7); // 30-100% of base size
    const size = baseSize * sizeVariation;
    
    // Enhanced random positioning within cell for more natural spread
    const spreadFactor = 0.8 + (Math.random() * 0.4); // 0.8-1.2 spread multiplier
    const offsetX = (Math.random() - 0.5) * cellSize * spreadFactor;
    const offsetY = (Math.random() - 0.5) * cellSize * spreadFactor;
    
    // Enhanced material-based physics properties for realistic falling
    const density = this.getEnhancedMaterialDensity(material);
    const hardness = materialProps.hardness || 5;
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    
    // Create particle body with enhanced physics properties for falling debris
    const body = Matter.Bodies.circle(
      x + offsetX, 
      y + offsetY, 
      size, 
      {
        density: density,
        // Enhanced friction for more realistic bouncing and sliding
        friction: 0.4 + (hardness / 25) + (Math.random() * 0.2), // 0.4-0.8 range
        frictionAir: 0.008 + (density * 3) + (Math.random() * 0.005), // Air resistance
        restitution: Math.max(0.15, 0.5 - (hardness / 20) + (Math.random() * 0.2)), // Bounce factor
        // Enhanced collision properties
        frictionStatic: 0.6 + (hardness / 20),
        inertia: Matter.Body._inertiaScale * density * size * size, // Realistic rotational inertia
      }
    );

    // Add natural rotation variation for more dynamic falling motion
    const rotationStrength = 0.05 + (fragmentationIndex * 0.1) + (Math.random() * 0.1);
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * rotationStrength);

    console.log(`Created enhanced falling debris for ${material}:`, {
      size: size.toFixed(1),
      density: density.toFixed(4),
      hardness: hardness,
      friction: body.friction.toFixed(3),
      restitution: body.restitution.toFixed(3),
      frictionAir: body.frictionAir.toFixed(5),
      position: `(${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)})`
    });

    // Return enhanced particle with additional properties for falling animation
    return {
      body: body,
      color: this.getMaterialColor(material),
      size: size,
      material: material,
      materialProps: materialProps,
      createdAt: Date.now(),
      variationFactor: variationFactor,
      // Additional properties for enhanced falling effects
      originalSize: baseSize,
      rotationSpeed: rotationStrength,
      lifetime: 8000 + (Math.random() * 4000), // 8-12 second lifetime
      bounceCount: 0, // Track number of bounces for effects
      isActive: true
    };
  }

  // Create individual debris particle with enhanced material property integration (legacy method)
  createDebrisParticle(x, y, material, distance, blastCenter, cellSize, blastDirection = null) {
    // Delegate to enhanced method for consistency
    return this.createEnhancedDebrisParticle(x, y, material, distance, blastCenter, cellSize, blastDirection, Math.random());
  }
  
  // Enhanced material density calculation for more realistic falling behavior
  getEnhancedMaterialDensity(material) {
    const baseDensity = this.getMaterialDensity(material);
    
    // Add slight random variation for more natural physics (±10%)
    const variation = 0.9 + (Math.random() * 0.2);
    const enhancedDensity = baseDensity * variation;
    
    // Ensure minimum density for proper physics simulation
    return Math.max(0.001, enhancedDensity);
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

  // Get particle size based on material properties - Enhanced with bigger sizes for better visibility
  getParticleSize(material) {
    // Get material properties for accurate sizing
    const materialProps = materialPropertyHandler.getMaterialProperties(material);
    const density = materialProps.density || 2.7;
    const hardness = materialProps.hardness || 5;
    const fragmentationIndex = materialProps.fragmentation_index || 0.5;
    
    // INCREASED BASE SIZE for better visibility
    let baseSize = 12; // Increased from 6 to 12 for better visibility
    
    // Dense materials create larger, fewer particles
    if (density > 15) baseSize = 18;      // Very heavy metals - much larger
    else if (density > 8) baseSize = 16;  // Heavy materials  
    else if (density > 4) baseSize = 14;  // Medium materials
    else if (density < 2) baseSize = 10;  // Light materials
    
    // Hard materials create larger chunks
    if (hardness >= 9) baseSize += 3;     // Very hard - bigger bonus
    else if (hardness >= 7) baseSize += 2; // Hard
    else if (hardness <= 2) baseSize -= 1; // Very soft
    
    // High fragmentation creates smaller pieces (but still bigger than before)
    if (fragmentationIndex > 0.8) baseSize -= 2;
    else if (fragmentationIndex > 0.6) baseSize -= 1;
    else if (fragmentationIndex < 0.3) baseSize += 2;
    
    // Increased size variation for more dramatic visual effect
    const sizeVariation = (Math.random() - 0.5) * 4; // Increased from 2 to 4
    const finalSize = Math.max(8, baseSize + sizeVariation); // Minimum size increased from 3 to 8
    
    console.log(`Enhanced debris size for ${material}: baseSize=${baseSize}, variation=${sizeVariation.toFixed(1)}, final=${finalSize.toFixed(1)}`);
    
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

  // Get all debris for rendering with enhanced cleanup
  getDebris() {
    // Clean up old or inactive debris particles
    this.debrisBodies = this.debrisBodies.filter(debris => {
      const age = Date.now() - debris.createdAt;
      const isAlive = debris.lifetime ? age < debris.lifetime : age < 10000; // Default 10s lifetime
      const isOnScreen = this.isDebrisOnScreen(debris);
      const hasMovement = this.hasSignificantMovement(debris);
      
      // Keep debris that is alive, on screen, or still moving significantly
      const shouldKeep = debris.isActive && (isAlive || (isOnScreen && hasMovement));
      
      if (!shouldKeep) {
        // Remove from physics world
        if (debris.body && this.world) {
          Matter.World.remove(this.world, debris.body);
        }
        console.log(`Cleaned up debris particle: age=${age}ms, onScreen=${isOnScreen}, hasMovement=${hasMovement}`);
      }
      
      return shouldKeep;
    });
    
    return this.debrisBodies;
  }
  
  // Check if debris particle is still visible on screen
  isDebrisOnScreen(debris, margin = 100) {
    if (!debris.body) return false;
    
    const pos = debris.body.position;
    // Rough screen bounds check (can be refined with actual canvas dimensions)
    return pos.x > -margin && pos.x < 1200 + margin && 
           pos.y > -margin && pos.y < 800 + margin;
  }
  
  // Check if debris particle has significant movement
  hasSignificantMovement(debris, threshold = 0.1) {
    if (!debris.body) return false;
    
    const velocity = debris.body.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const angularSpeed = Math.abs(debris.body.angularVelocity);
    
    return speed > threshold || angularSpeed > 0.01;
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