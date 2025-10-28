/**
 * BlastAnimationEngine - Handles all blast-related animations
 * Uses GSAP for smooth, performant animations
 */

import gsap from 'gsap';

export class BlastAnimationEngine {
  constructor() {
    this.activeAnimations = [];
    this.shockwaves = [];
    this.blockTransitions = new Map(); // Track blocks being animated
    this.isAnimating = false;
    this.onUpdateCallback = null;
    this.onCompleteCallback = null;
  }

  /**
   * Main animation orchestrator - sequences all blast effects
   * @param {Array} blasts - Array of blast positions
   * @param {Array} affectedCells - Cells affected by blast
   * @param {Number} cellSize - Size of grid cells in pixels
   * @param {Object} options - Animation options
   */
  async animateBlastSequence(blasts, affectedCells, cellSize, options = {}) {
    const {
      shockwaveDuration = 1.0,
      blockTransitionDuration = 1.0,
      epicenterShake = true,
      staggerDelay = 0.05,
      onUpdate = null,
      onComplete = null
    } = options;

    this.isAnimating = true;
    this.onUpdateCallback = onUpdate;
    this.onCompleteCallback = onComplete;

    console.log('🎬 Starting blast animation sequence', {
      blasts: blasts.length,
      affectedCells: affectedCells.length,
      cellSize
    });

    // Clear any existing animations
    this.cleanup();

    // Step 1: Create initial flash/epicenter effect
    const flashPromises = blasts.map((blast, index) => 
      this.createEpicenterFlash(blast, cellSize, index * 0.1)
    );
    await Promise.all(flashPromises);

    // Step 2: Create expanding shockwaves (parallel with block animations)
    blasts.forEach((blast, index) => {
      this.createShockwave(blast, cellSize, shockwaveDuration, index * 0.1);
    });

    // Step 3: Animate blocks displacing from old to new positions
    const blockAnimPromise = this.animateBlockDisplacement(
      affectedCells,
      cellSize,
      blockTransitionDuration,
      staggerDelay
    );

    // Step 4: Optional epicenter shake effect
    if (epicenterShake) {
      this.createEpicenterShake(blasts[0], cellSize);
    }

    // Wait for all animations to complete
    await blockAnimPromise;

    // Animation complete
    this.isAnimating = false;
    console.log('✅ Blast animation sequence complete');
    
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }

    return {
      success: true,
      duration: blockTransitionDuration + shockwaveDuration
    };
  }

  /**
   * Create initial epicenter flash effect
   */
  async createEpicenterFlash(blast, cellSize, delay = 0) {
    return new Promise((resolve) => {
      const flash = {
        x: blast.x,
        y: blast.y,
        scale: 0,
        opacity: 1,
        type: 'flash',
        id: `flash_${blast.id || Date.now()}`
      };

      this.activeAnimations.push(flash);

      gsap.to(flash, {
        scale: 2.5,
        opacity: 0,
        duration: 0.4,
        delay: delay,
        ease: 'power2.out',
        onUpdate: () => this.notifyUpdate(),
        onComplete: () => {
          this.removeAnimation(flash.id);
          resolve();
        }
      });
    });
  }

  /**
   * Create expanding shockwave circle animation
   */
  createShockwave(blast, cellSize, duration = 1.0, delay = 0) {
    const shockwave = {
      x: blast.x,
      y: blast.y,
      radius: 0,
      opacity: 0.8,
      lineWidth: 3,
      type: 'shockwave',
      id: `shockwave_${blast.id || Date.now()}_${Math.random()}`
    };

    this.shockwaves.push(shockwave);
    this.activeAnimations.push(shockwave);

    // Animate radius expansion
    gsap.to(shockwave, {
      radius: cellSize * 8,
      opacity: 0,
      lineWidth: 1,
      duration: duration,
      delay: delay,
      ease: 'power2.out',
      onUpdate: () => this.notifyUpdate(),
      onComplete: () => {
        this.removeShockwave(shockwave.id);
        this.removeAnimation(shockwave.id);
      }
    });

    // Create secondary shockwave
    const secondaryShockwave = {
      x: blast.x,
      y: blast.y,
      radius: 0,
      opacity: 0.4,
      lineWidth: 2,
      type: 'shockwave',
      id: `shockwave_secondary_${blast.id || Date.now()}_${Math.random()}`
    };

    this.shockwaves.push(secondaryShockwave);
    this.activeAnimations.push(secondaryShockwave);

    gsap.to(secondaryShockwave, {
      radius: cellSize * 10,
      opacity: 0,
      lineWidth: 0.5,
      duration: duration * 1.3,
      delay: delay + 0.15,
      ease: 'power1.out',
      onUpdate: () => this.notifyUpdate(),
      onComplete: () => {
        this.removeShockwave(secondaryShockwave.id);
        this.removeAnimation(secondaryShockwave.id);
      }
    });
  }

  /**
   * Animate blocks moving from old to new positions
   * Creates smooth displacement effect
   */
  async animateBlockDisplacement(affectedCells, cellSize, duration = 1.0, staggerDelay = 0.05) {
    return new Promise((resolve) => {
      const transitions = [];

      affectedCells.forEach((cell, index) => {
        // Calculate displacement based on distance from epicenter
        const displacement = this.calculateDisplacement(cell, cellSize);
        
        const transition = {
          x: cell.x,
          y: cell.y,
          originalX: cell.x,
          originalY: cell.y,
          currentX: cell.x,
          currentY: cell.y,
          targetX: cell.x + displacement.x,
          targetY: cell.y + displacement.y,
          progress: 0,
          opacity: 1,
          scale: 1,
          rotation: 0,
          type: 'blockTransition',
          id: `transition_${cell.x}_${cell.y}`,
          material: cell.originalMaterial
        };

        transitions.push(transition);
        this.blockTransitions.set(transition.id, transition);
        this.activeAnimations.push(transition);

        // Animate the transition
        gsap.to(transition, {
          progress: 1,
          currentX: transition.targetX,
          currentY: transition.targetY,
          rotation: (Math.random() - 0.5) * 360,
          scale: 0.8 + Math.random() * 0.4,
          duration: duration,
          delay: staggerDelay * index,
          ease: 'power2.out',
          onUpdate: () => this.notifyUpdate(),
          onComplete: () => {
            this.blockTransitions.delete(transition.id);
            this.removeAnimation(transition.id);
            
            // Resolve when last animation completes
            if (index === affectedCells.length - 1) {
              resolve();
            }
          }
        });

        // Fade out destroyed blocks
        if (cell.distance === 0 || cell.distance < 2) {
          gsap.to(transition, {
            opacity: 0,
            duration: duration * 0.7,
            delay: staggerDelay * index + duration * 0.3,
            ease: 'power1.in'
          });
        }
      });

      // Fallback resolution if no cells
      if (affectedCells.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Calculate displacement vector for a cell based on blast physics
   */
  calculateDisplacement(cell, cellSize) {
    // Blocks move outward from epicenter
    const distance = cell.distance || 0;
    
    if (distance === 0) {
      // Epicenter - debris flies in random direction
      const angle = Math.random() * Math.PI * 2;
      const magnitude = cellSize * 2;
      return {
        x: Math.cos(angle) * magnitude,
        y: Math.sin(angle) * magnitude
      };
    }

    // Other blocks - move based on distance and material
    const maxDisplacement = cellSize * 3;
    const displacementFactor = Math.max(0, 1 - (distance / 5));
    const magnitude = maxDisplacement * displacementFactor;
    
    // Add some randomness for natural look
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(angle) * magnitude * 0.5,
      y: Math.sin(angle) * magnitude * 0.5 + magnitude * 0.3 // Slight downward bias
    };
  }

  /**
   * Create screen shake effect at epicenter
   */
  createEpicenterShake(blast, cellSize) {
    const shake = {
      x: blast.x,
      y: blast.y,
      intensity: 0,
      type: 'shake',
      id: `shake_${blast.id || Date.now()}`
    };

    this.activeAnimations.push(shake);

    // Quick shake
    gsap.to(shake, {
      intensity: 15,
      duration: 0.1,
      ease: 'power2.out',
      yoyo: true,
      repeat: 5,
      onUpdate: () => this.notifyUpdate(),
      onComplete: () => {
        this.removeAnimation(shake.id);
      }
    });
  }

  /**
   * Create motion trail effect for moving blocks
   */
  createMotionTrail(block, cellSize) {
    const trail = {
      x: block.currentX,
      y: block.currentY,
      opacity: 0.3,
      scale: block.scale,
      type: 'trail',
      id: `trail_${Date.now()}_${Math.random()}`,
      color: this.getMaterialColor(block.material)
    };

    this.activeAnimations.push(trail);

    gsap.to(trail, {
      opacity: 0,
      scale: trail.scale * 0.5,
      duration: 0.3,
      ease: 'power1.out',
      onUpdate: () => this.notifyUpdate(),
      onComplete: () => {
        this.removeAnimation(trail.id);
      }
    });

    return trail;
  }

  /**
   * Get material color for rendering
   */
  getMaterialColor(material) {
    const colors = {
      'iron': '#8C7853',
      'gold': '#FFD700',
      'copper': '#B87333',
      'silver': '#C0C0C0',
      'coal': '#36454F',
      'stone': '#808080',
      'destroyed': '#654321'
    };
    return colors[material?.toLowerCase()] || '#808080';
  }

  /**
   * Get all active shockwaves for rendering
   */
  getShockwaves() {
    return this.shockwaves;
  }

  /**
   * Get all active block transitions for rendering
   */
  getBlockTransitions() {
    return Array.from(this.blockTransitions.values());
  }

  /**
   * Get all active animations
   */
  getActiveAnimations() {
    return this.activeAnimations;
  }

  /**
   * Notify parent of animation update
   */
  notifyUpdate() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        shockwaves: this.shockwaves,
        blockTransitions: Array.from(this.blockTransitions.values()),
        animations: this.activeAnimations,
        isAnimating: this.isAnimating
      });
    }
  }

  /**
   * Remove animation by ID
   */
  removeAnimation(id) {
    this.activeAnimations = this.activeAnimations.filter(anim => anim.id !== id);
  }

  /**
   * Remove shockwave by ID
   */
  removeShockwave(id) {
    this.shockwaves = this.shockwaves.filter(wave => wave.id !== id);
  }

  /**
   * Check if animations are running
   */
  isRunning() {
    return this.isAnimating;
  }

  /**
   * Stop all animations
   */
  stopAll() {
    gsap.killTweensOf(this.activeAnimations);
    gsap.killTweensOf(this.shockwaves);
    Array.from(this.blockTransitions.values()).forEach(transition => {
      gsap.killTweensOf(transition);
    });
    
    this.cleanup();
  }

  /**
   * Clean up all animation data
   */
  cleanup() {
    this.activeAnimations = [];
    this.shockwaves = [];
    this.blockTransitions.clear();
    this.isAnimating = false;
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.stopAll();
    this.onUpdateCallback = null;
    this.onCompleteCallback = null;
  }
}

// Export singleton
export const blastAnimationEngine = new BlastAnimationEngine();
export default blastAnimationEngine;
