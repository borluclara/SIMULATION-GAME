/**
 * Physics Engine Integration with Matter.js
 * Handles debris simulation and particle effects for blast impacts
 */

import Matter from 'matter-js';

export class PhysicsEngine {
  constructor() {
    this.engine = null;
    this.world = null;
    this.render = null;
    this.runner = null
    this.bodies = [];
    this.isRunning = false;
    this.cleanup = null;
  }

  // Initialize the physics engine
  initialize(canvas, options = {}) {
    const defaultOptions = {
      width: canvas.width || 800,
      height: canvas.height || 600,
      wireframes: false,
      background: 'transparent',
      gravity: { x: 0, y: 0.8, scale: 0.001 }
    };

    const config = { ...defaultOptions, ...options };

    // Create engine
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    
    // Configure gravity
    this.engine.world.gravity.x = config.gravity.x;
    this.engine.world.gravity.y = config.gravity.y;
    this.engine.world.gravity.scale = config.gravity.scale;

    // Create renderer
    this.render = Matter.Render.create({
      canvas: canvas,
      engine: this.engine,
      options: {
        width: config.width,
        height: config.height,
        wireframes: config.wireframes,
        background: config.background,
        showAngleIndicator: false,
        showVelocity: false
      }
    });

    return this;
  }

  // Start the physics simulation
  start() {
    if (!this.engine || !this.render) {
      throw new Error('Physics engine not initialized');
    }

    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);
    Matter.Render.run(this.render);
    this.isRunning = true;

    return this;
  }

  // Stop the physics simulation
  stop() {
    if (this.runner) {
      Matter.Runner.stop(this.runner);
    }
    if (this.render) {
      Matter.Render.stop(this.render);
    }
    this.isRunning = false;

    return this;
  }

  // Create debris particles from blast affected cells
  createDebris(affectedCells, cellSize, blastCenter) {
    const debris = [];

    affectedCells.forEach(cell => {
      const cellCenterX = cell.x * cellSize + cellSize / 2;
      const cellCenterY = cell.y * cellSize + cellSize / 2;
      
      // Calculate distance from blast center for force calculation
      const distance = Math.sqrt(
        Math.pow(cellCenterX - blastCenter.x, 2) + 
        Math.pow(cellCenterY - blastCenter.y, 2)
      );

      // Create debris particles based on material type
      const particleCount = this.getParticleCount(cell.originalMaterial);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = this.createDebrisParticle(
          cellCenterX, 
          cellCenterY, 
          cell.originalMaterial,
          distance,
          blastCenter,
          cellSize
        );
        
        if (particle) {
          debris.push(particle);
          Matter.World.add(this.world, particle);
        }
      }
    });

    this.bodies.push(...debris);
    return debris;
  }

  // Create individual debris particle
  createDebrisParticle(x, y, material, distance, blastCenter, cellSize) {
    // Vary particle size based on material
    const size = this.getParticleSize(material);
    
    // Add some randomness to position
    const offsetX = (Math.random() - 0.5) * cellSize * 0.8;
    const offsetY = (Math.random() - 0.5) * cellSize * 0.8;
    
    // Calculate blast force direction and magnitude
    const blastForce = this.calculateBlastForce(x, y, blastCenter, distance);
    
    // Create particle body
    const particle = Matter.Bodies.circle(
      x + offsetX, 
      y + offsetY, 
      size, 
      {
        density: this.getMaterialDensity(material),
        friction: 0.8,
        frictionAir: 0.05,
        restitution: 0.3,
        render: {
          fillStyle: this.getMaterialColor(material),
          strokeStyle: this.getMaterialStroke(material),
          lineWidth: 1
        }
      }
    );

    // Apply initial blast force
    Matter.Body.applyForce(particle, { x: x + offsetX, y: y + offsetY }, blastForce);
    
    // Add rotation for more realistic effect
    Matter.Body.setAngularVelocity(particle, (Math.random() - 0.5) * 0.3);

    return particle;
  }

  // Calculate blast force based on distance and direction
  calculateBlastForce(x, y, blastCenter, distance) {
    const maxDistance = 150; // Maximum effective blast distance
    const maxForce = 0.05; // Maximum force magnitude
    
    // Calculate direction vector
    const dirX = x - blastCenter.x;
    const dirY = y - blastCenter.y;
    const magnitude = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    
    // Normalize direction
    const normalizedX = dirX / magnitude;
    const normalizedY = dirY / magnitude;
    
    // Calculate force magnitude based on distance (inverse relationship)
    const forceMagnitude = Math.max(0, maxForce * (1 - distance / maxDistance));
    
    return {
      x: normalizedX * forceMagnitude,
      y: normalizedY * forceMagnitude
    };
  }

  // Get particle count based on material type
  getParticleCount(material) {
    const materialParticleCounts = {
      'iron': 8,
      'gold': 6,
      'copper': 7,
      'silver': 5,
      'coal': 12,
      'stone': 10,
      'destroyed': 15,
      'cracked': 8
    };
    
    return materialParticleCounts[material] || 6;
  }

  // Get particle size based on material type
  getParticleSize(material) {
    const materialSizes = {
      'iron': 3,
      'gold': 2,
      'copper': 2.5,
      'silver': 2,
      'coal': 4,
      'stone': 3.5,
      'destroyed': 2,
      'cracked': 3
    };
    
    const baseSize = materialSizes[material] || 2.5;
    return baseSize + (Math.random() - 0.5) * 1;
  }

  // Get material density for physics
  getMaterialDensity(material) {
    const materialDensities = {
      'iron': 0.008,
      'gold': 0.012,
      'copper': 0.007,
      'silver': 0.009,
      'coal': 0.003,
      'stone': 0.005,
      'destroyed': 0.002,
      'cracked': 0.004
    };
    
    return materialDensities[material] || 0.005;
  }

  // Get material color for rendering
  getMaterialColor(material) {
    const materialColors = {
      'iron': '#8C7853',
      'gold': '#FFD700',
      'copper': '#B87333',
      'silver': '#C0C0C0',
      'coal': '#36454F',
      'stone': '#808080',
      'destroyed': '#654321',
      'cracked': '#A0A0A0'
    };
    
    return materialColors[material] || '#808080';
  }

  // Get material stroke color
  getMaterialStroke(material) {
    const materialStrokes = {
      'iron': '#6B5B47',
      'gold': '#DAA520',
      'copper': '#8B4513',
      'silver': '#A0A0A0',
      'coal': '#2F4F4F',
      'stone': '#696969',
      'destroyed': '#4A4A4A',
      'cracked': '#808080'
    };
    
    return materialStrokes[material] || '#606060';
  }

  // Add boundaries to contain debris
  addBoundaries(width, height) {
    const boundaries = [
      // Floor
      Matter.Bodies.rectangle(width / 2, height + 25, width, 50, { 
        isStatic: true,
        render: { fillStyle: 'transparent' }
      }),
      // Left wall
      Matter.Bodies.rectangle(-25, height / 2, 50, height, { 
        isStatic: true,
        render: { fillStyle: 'transparent' }
      }),
      // Right wall
      Matter.Bodies.rectangle(width + 25, height / 2, 50, height, { 
        isStatic: true,
        render: { fillStyle: 'transparent' }
      })
    ];

    Matter.World.add(this.world, boundaries);
    this.bodies.push(...boundaries);
    
    return boundaries;
  }

  // Simulate blast explosion with debris
  simulateBlast(blastData, canvasElement, cellSize) {
    if (!blastData.blasts || blastData.blasts.length === 0) {
      return Promise.resolve();
    }

    const rect = canvasElement.getBoundingClientRect();
    
    // Initialize physics engine
    this.initialize(canvasElement, {
      width: rect.width,
      height: rect.height,
      gravity: { x: 0, y: 0.8, scale: 0.001 }
    });

    // Add boundaries
    this.addBoundaries(rect.width, rect.height);

    // Create debris for each blast
    blastData.blasts.forEach(blast => {
      const blastCenter = {
        x: blast.x * cellSize + cellSize / 2,
        y: blast.y * cellSize + cellSize / 2
      };

      // Filter affected cells for this blast
      const blastAffectedCells = blastData.affectedCells.filter(
        cell => cell.blastId === blast.id
      );

      this.createDebris(blastAffectedCells, cellSize, blastCenter);
    });

    // Start simulation
    this.start();

    // Return promise that resolves when simulation completes
    return new Promise((resolve) => {
      this.cleanup = setTimeout(() => {
        this.stop();
        this.clearAllBodies();
        resolve();
      }, 5000); // Run for 5 seconds as per requirements
    });
  }

  // Clear all physics bodies
  clearAllBodies() {
    if (this.world && this.bodies.length > 0) {
      Matter.World.remove(this.world, this.bodies);
      this.bodies = [];
    }
  }

  // Cleanup and destroy the physics engine
  destroy() {
    if (this.cleanup) {
      clearTimeout(this.cleanup);
    }
    
    this.stop();
    this.clearAllBodies();
    
    if (this.engine) {
      Matter.Engine.clear(this.engine);
    }
    
    if (this.render) {
      Matter.Render.stop(this.render);
      if (this.render.canvas) {
        this.render.canvas.remove();
      }
    }

    this.engine = null;
    this.world = null;
    this.render = null;
    this.runner = null;
    this.isRunning = false;
  }
}

// Export singleton instance
export const physicsEngine = new PhysicsEngine();
export default physicsEngine;