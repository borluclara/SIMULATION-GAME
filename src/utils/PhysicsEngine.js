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

    affectedCells.forEach((cell, index) => {
      const cellCenterX = cell.x * cellSize + cellSize / 2;
      const cellCenterY = cell.y * cellSize + cellSize / 2;
      
      console.log(`Processing cell ${index}: (${cell.x}, ${cell.y}) -> (${cellCenterX}, ${cellCenterY})`);
      
      // Calculate distance from blast center
      const distance = Math.sqrt(
        Math.pow(cellCenterX - blastCenter.x, 2) + 
        Math.pow(cellCenterY - blastCenter.y, 2)
      );

      // Create multiple small particles per cell
      const particleCount = this.getParticleCount(cell.originalMaterial);
      console.log(`Creating ${particleCount} particles for material ${cell.originalMaterial}`);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = this.createDebrisParticle(
          cellCenterX, 
          cellCenterY, 
          cell.originalMaterial,
          distance,
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

  // Create individual debris particle with render info and directional support
  createDebrisParticle(x, y, material, distance, blastCenter, cellSize, blastDirection = null) {
    // Particle size
    const size = this.getParticleSize(material);
    
    // Random offset within cell
    const offsetX = (Math.random() - 0.5) * cellSize * 0.6;
    const offsetY = (Math.random() - 0.5) * cellSize * 0.6;
    
    // Calculate blast force with directional support
    const blastForce = this.calculateBlastForce(x, y, blastCenter, distance, blastDirection);
    
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

    console.log(`Created particle body at (${body.position.x}, ${body.position.y}) with size ${size}`);

    // Apply blast force
    Matter.Body.applyForce(body, body.position, blastForce);
    console.log(`Applied force:`, blastForce);
    
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

  // Calculate blast force with directional bias
  calculateBlastForce(x, y, blastCenter, distance, blastDirection = null) {
    const maxDistance = 120;
    const maxForce = 0.025; // Much stronger force for bigger debris pieces
    
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
      
      console.log(`Direction ${blastDirection}°: preferred force (${preferredDirX.toFixed(3)}, ${preferredDirY.toFixed(3)})`);
      
      // Use 100% directional movement - completely override natural explosion pattern
      normalizedX = preferredDirX;
      normalizedY = preferredDirY;
      
      console.log(`Final force direction: (${normalizedX.toFixed(3)}, ${normalizedY.toFixed(3)})`);
    }
    
    const forceMagnitude = Math.max(0, maxForce * (1 - distance / maxDistance));
    
    return {
      x: normalizedX * forceMagnitude,
      y: normalizedY * forceMagnitude
    };
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