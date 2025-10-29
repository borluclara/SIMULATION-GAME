/**
 * Physics Engine Integration with Matter.js
 * FIXED VERSION - Manual rendering without Matter.Render conflicts
 */

import Matter from 'matter-js';

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

  // Create debris particles from blast affected cells
  createDebris(affectedCells, cellSize, blastCenter) {
    const debris = [];

    // Pre-calculate blast center coordinates for performance
    const blastCenterX = blastCenter.x;
    const blastCenterY = blastCenter.y;

    affectedCells.forEach(cell => {
      // Pre-calculate cell center coordinates
      const cellCenterX = cell.x * cellSize + cellSize / 2;
      const cellCenterY = cell.y * cellSize + cellSize / 2;
      
      // Pre-calculate distance once per cell (performance optimization)
      const distance = Math.sqrt(
        Math.pow(cellCenterX - blastCenterX, 2) + 
        Math.pow(cellCenterY - blastCenterY, 2)
      );

      // Create multiple small particles per cell
      const particleCount = this.getParticleCount(cell.originalMaterial);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = this.createDebrisParticle(
          cellCenterX, 
          cellCenterY, 
          cell.originalMaterial,
          distance, // Pass pre-calculated distance
          blastCenter,
          cellSize
        );
        
        if (particle) {
          debris.push(particle);
          Matter.World.add(this.world, particle.body);
        }
      }
    });

    this.debrisBodies.push(...debris);
    return debris;
  }

  // Create individual debris particle with render info
  createDebrisParticle(x, y, material, distance, blastCenter, cellSize) {
    // Particle size
    const size = this.getParticleSize(material);
    
    // Random offset within cell
    const offsetX = (Math.random() - 0.5) * cellSize * 0.6;
    const offsetY = (Math.random() - 0.5) * cellSize * 0.6;
    
    // Calculate blast force
    const blastForce = this.calculateBlastForce(x, y, blastCenter, distance);
    
    // Create Matter.js body
    const body = Matter.Bodies.circle(
      x + offsetX, 
      y + offsetY, 
      size, 
      {
        density: this.getMaterialDensity(material),
        friction: 0.8,
        frictionAir: 0.02,
        restitution: 0.4
      }
    );

    // Apply blast force
    Matter.Body.applyForce(body, body.position, blastForce);
    
    // Add rotation
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);

    // Return particle with rendering info
    return {
      body: body,
      color: this.getMaterialColor(material),
      size: size,
      material: material,
      createdAt: Date.now()
    };
  }

  // Calculate blast force with advanced decay models
  calculateBlastForce(x, y, blastCenter, distance) {
    const { maxDistance, maxForce, exponentialK, blendThreshold } = this.decayConfig;
    
    // Pre-calculate direction vector components for performance
    const dirX = x - blastCenter.x;
    const dirY = y - blastCenter.y;
    const magnitude = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    
    // Pre-calculate normalized direction (unit vector)
    const normalizedX = dirX / magnitude;
    const normalizedY = dirY / magnitude;
    
    // **MATHEMATICAL DECAY MODELS**
    
    // Exponential decay: force = F0 * e^(-k * r)
    const exponentialForce = maxForce * Math.exp(-exponentialK * distance);
    
    // Linear decay: force = F0 - k * r
    const linearK = maxForce / maxDistance; // Auto-calculate linear decay constant
    const linearForce = Math.max(0, maxForce - linearK * distance);
    
    // Hybrid model: combine exponential (close range) with linear (far range)
    const blendDistance = maxDistance * blendThreshold;
    const blendFactor = Math.min(1, distance / blendDistance);
    
    // Choose decay model based on distance for optimal visual balance
    let forceMagnitude;
    if (distance <= blendDistance) {
      // Close range: Use exponential decay for dramatic falloff
      forceMagnitude = exponentialForce;
    } else {
      // Far range: Blend exponential with linear for smooth transition
      forceMagnitude = (1 - blendFactor) * exponentialForce + blendFactor * linearForce;
    }
    
    // Ensure minimum threshold to prevent insignificant forces
    forceMagnitude = Math.max(0, forceMagnitude);
    
    return {
      x: normalizedX * forceMagnitude,
      y: normalizedY * forceMagnitude
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

  // Get particle count based on material - MORE BIG DEBRIS  
  getParticleCount(material) {
    const counts = {
      'iron': 12,     // More big iron chunks
      'gold': 10,     // More valuable gold pieces
      'copper': 12,   // More copper debris
      'silver': 9,    // More silver pieces
      'coal': 18,     // Coal breaks into many big pieces
      'stone': 15,    // Stone creates lots of big debris
      'destroyed': 20, // Maximum big debris pieces
      'cracked': 12   // More cracked pieces
    };
    return counts[material?.toLowerCase()] || 10;
  }

  // Get particle size - BIGGER DEBRIS for better visibility
  getParticleSize(material) {
    const sizes = {
      'iron': 8,      // Much bigger iron chunks
      'gold': 7,      // Bigger gold pieces  
      'copper': 7,    // Bigger copper chunks
      'silver': 6,    // Bigger silver pieces
      'coal': 9,      // Largest coal chunks
      'stone': 8,     // Big stone debris
      'destroyed': 6, // Bigger destroyed pieces
      'cracked': 7    // Bigger cracked pieces
    };
    const baseSize = sizes[material?.toLowerCase()] || 6;
    // More size variation for dramatic effect
    return baseSize + (Math.random() - 0.5) * 3;
  }

  // Get material density
  getMaterialDensity(material) {
    const densities = {
      'iron': 0.006,
      'gold': 0.01,
      'copper': 0.005,
      'silver': 0.007,
      'coal': 0.002,
      'stone': 0.004,
      'destroyed': 0.002,
      'cracked': 0.003
    };
    return densities[material?.toLowerCase()] || 0.004;
  }

  // Get material color
  getMaterialColor(material) {
    const colors = {
      'iron': '#8C7853',
      'gold': '#FFD700',
      'copper': '#B87333',
      'silver': '#C0C0C0',
      'coal': '#36454F',
      'stone': '#808080',
      'destroyed': '#654321',
      'cracked': '#A0A0A0'
    };
    return colors[material?.toLowerCase()] || '#808080';
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