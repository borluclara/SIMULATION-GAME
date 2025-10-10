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
    this.runner = null;
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
      gravity: { x: 0, y: 0.5, scale: 0.001 } // Match reference gravity
    };

    const config = { ...defaultOptions, ...options };

    console.log(`🎮 Initializing physics engine: ${config.width}x${config.height}`);

    // Create engine
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    
    // Configure gravity to match reference
    this.engine.world.gravity.y = 0.5;
    this.engine.world.gravity.scale = 0.001;

    // Create renderer
    this.render = Matter.Render.create({
      canvas: canvas,
      engine: this.engine,
      options: {
        width: config.width,
        height: config.height,
        wireframes: false,
        background: 'transparent',
        showAngleIndicator: false,
        showVelocity: false,
        pixelRatio: window.devicePixelRatio || 1
      }
    });

    console.log('✅ Physics engine initialized');
    return this;
  }

  // Start the physics simulation
  start() {
    if (!this.engine || !this.render) {
      throw new Error('Physics engine not initialized');
    }

    console.log('🚀 Starting physics simulation...');
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

    console.log(`💥 Creating debris from ${affectedCells.length} affected cells at blast center (${blastCenter.x}, ${blastCenter.y})`);

    affectedCells.forEach(cell => {
      const cellCenterX = cell.x * cellSize + cellSize / 2;
      const cellCenterY = cell.y * cellSize + cellSize / 2;
      
      // Calculate distance from blast center
      const dx = cellCenterX - blastCenter.x;
      const dy = cellCenterY - blastCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Create a SINGLE rectangle body per cell (not multiple particles)
      const particle = this.createDebrisParticle(
        cellCenterX, 
        cellCenterY, 
        cell.originalMaterial,
        distance,
        dx,
        dy,
        cellSize
      );
      
      if (particle) {
        debris.push(particle);
        Matter.World.add(this.world, particle);
      }
    });

    this.bodies.push(...debris);
    console.log(`✨ Created ${debris.length} debris particles`);
    return debris;
  }

  // Create individual debris particle - EXACTLY like the reference implementation
  createDebrisParticle(x, y, material, distance, dx, dy, cellSize) {
    // Create RECTANGLE body (square, like the reference)
    const body = Matter.Bodies.rectangle(
      x,
      y,
      cellSize - 1,
      cellSize - 1,
      {
        restitution: 0.4,  // Bounce (matches reference)
        friction: 0.01,    // Low friction (matches reference)
        frictionAir: 0.01, // Air resistance (matches reference)
        density: 0.001,    // Light weight (matches reference)
        render: {
          fillStyle: '#4B2E09',  // Dark brown
          strokeStyle: '#2C1805',
          lineWidth: 1
        }
      }
    );

    // Calculate explosion force - EXACTLY like reference
    const blastRadius = 80; // Match reference blast radius concept
    const forceMagnitude = (1 - distance / blastRadius) * 0.05;
    const forceX = (dx / (distance || 1)) * forceMagnitude;
    const forceY = (dy / (distance || 1)) * forceMagnitude;
    
    // Apply initial VELOCITY (not force) - this is the key difference!
    Matter.Body.setVelocity(body, {
      x: forceX * 100,  // Multiply to get strong velocity
      y: forceY * 100
    });
    
    // Add random spin (matches reference)
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);

    return body;
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
      console.warn('⚠️ No blasts to simulate');
      return Promise.resolve();
    }

    // Use actual canvas dimensions (not getBoundingClientRect)
    const width = canvasElement.width;
    const height = canvasElement.height;
    
    console.log(`🎯 Simulating blast: canvas ${width}x${height}, cellSize ${cellSize}`);
    console.log(`📊 Blast data: ${blastData.blasts.length} blasts, ${blastData.affectedCells.length} affected cells`);
    
    // Initialize physics engine
    this.initialize(canvasElement, {
      width: width,
      height: height,
      gravity: { x: 0, y: 0.5, scale: 0.001 }
    });

    // Add boundaries
    this.addBoundaries(width, height);

    // Create debris for each blast
    blastData.blasts.forEach(blast => {
      const blastCenter = {
        x: blast.x * cellSize + cellSize / 2,
        y: blast.y * cellSize + cellSize / 2
      };

      console.log(`💣 Blast at grid (${blast.x}, ${blast.y}) → pixel (${blastCenter.x}, ${blastCenter.y})`);

      // Filter affected cells for this blast
      const blastAffectedCells = blastData.affectedCells.filter(
        cell => cell.blastId === blast.id
      );

      this.createDebris(blastAffectedCells, cellSize, blastCenter);
    });

    // Start simulation
    this.start();

    console.log(`⏰ Physics simulation running for 5 seconds with ${this.bodies.length} total bodies`);

    // Return promise that resolves when simulation completes
    return new Promise((resolve) => {
      this.cleanup = setTimeout(() => {
        console.log('🧹 Cleaning up physics simulation...');
        this.stop();
        this.clearAllBodies();
        resolve();
      }, 5000); // Run for 5 seconds
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
