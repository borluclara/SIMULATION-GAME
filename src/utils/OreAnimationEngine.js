/**
 * Ore Animation Engine using GSAP
 * Handles smooth ore block movement animations during blast displacement
 */

import { gsap } from 'gsap';

export class OreAnimationEngine {
  constructor() {
    this.activeAnimations = new Map(); // Track active animations by block ID
    this.animationTimeline = null;
    this.isAnimating = false;
    this.animationQueue = [];
    
    // Animation configuration
    this.config = {
      duration: 2.5, // Animation duration in seconds
      ease: "power2.out", // Easing function for natural movement
      stagger: 0.03, // Stagger time between block animations
      maxConcurrentAnimations: 500, // Performance limit
      enableStagger: true
    };
    
    console.log('OreAnimationEngine initialized with GSAP');
  }

  /**
   * Animate a batch of ore blocks moving to their new positions
   * @param {Array} displacements - Array of displacement objects with block and position info
   * @param {Function} onUpdate - Callback function called during animation updates
   * @param {Function} onComplete - Callback function called when all animations complete
   * @param {Function} onStart - Callback function called when animations start
   */
  animateDisplacements(displacements, onUpdate = null, onComplete = null, onStart = null) {
    if (!displacements || displacements.length === 0) {
      console.log('No displacements to animate');
      if (onComplete) onComplete();
      return;
    }

    console.log(`Starting animation for ${displacements.length} displaced blocks`);
    
    // Clear any existing animations
    this.stopAllAnimations();
    
    // Create new timeline
    this.animationTimeline = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        console.log('All ore block animations completed');
        if (onComplete) onComplete();
      }
    });

    this.isAnimating = true;
    const startTime = performance.now();

    // Notify that animations are starting
    if (onStart) onStart();

    // Prepare animation targets
    const animationTargets = displacements.map(displacement => {
      const { block, newX, newY, originalX, originalY } = displacement;
      
      // Set up animation state
      block.isAnimating = true;
      block.animationStartTime = startTime;
      block.animationDuration = this.config.duration * 1000; // Convert to ms
      block.targetX = newX;
      block.targetY = newY;
      
      // Create animation proxy object for GSAP to animate
      const animationProxy = {
        x: originalX,
        y: originalY,
        block: block
      };

      return { animationProxy, block, newX, newY, originalX, originalY };
    });

    // Create staggered animations for performance and visual appeal
    if (this.config.enableStagger && animationTargets.length > 10) {
      this.createStaggeredAnimations(animationTargets, onUpdate);
    } else {
      this.createBatchAnimations(animationTargets, onUpdate);
    }

    return this.animationTimeline;
  }

  /**
   * Create staggered animations for better performance with many blocks
   */
  createStaggeredAnimations(animationTargets, onUpdate) {
    // Split into chunks for staggered animation
    const chunkSize = Math.max(10, Math.min(50, Math.floor(animationTargets.length / 10)));
    const chunks = [];
    
    for (let i = 0; i < animationTargets.length; i += chunkSize) {
      chunks.push(animationTargets.slice(i, i + chunkSize));
    }

    chunks.forEach((chunk, chunkIndex) => {
      const delay = chunkIndex * this.config.stagger;
      
      chunk.forEach(({ animationProxy, block, newX, newY }) => {
        const tween = gsap.to(animationProxy, {
          x: newX,
          y: newY,
          duration: this.config.duration,
          ease: this.config.ease,
          delay: delay,
          onUpdate: () => {
            // Update block's animated position
            block.animatedX = animationProxy.x;
            block.animatedY = animationProxy.y;
            
            if (onUpdate) onUpdate(block);
          },
          onComplete: () => {
            // Finalize block position
            block.x = newX;
            block.y = newY;
            block.animatedX = newX;
            block.animatedY = newY;
            block.isAnimating = false;
            block.gsapTween = null;
          }
        });

        block.gsapTween = tween;
        this.animationTimeline.add(tween, chunkIndex * this.config.stagger);
        this.activeAnimations.set(this.getBlockId(block), tween);
      });
    });
  }

  /**
   * Create batch animations for smaller sets of blocks
   */
  createBatchAnimations(animationTargets, onUpdate) {
    animationTargets.forEach(({ animationProxy, block, newX, newY }, index) => {
      const delay = this.config.enableStagger ? index * 0.01 : 0; // Small stagger
      
      const tween = gsap.to(animationProxy, {
        x: newX,
        y: newY,
        duration: this.config.duration,
        ease: this.config.ease,
        delay: delay,
        onUpdate: () => {
          // Update block's animated position
          block.animatedX = animationProxy.x;
          block.animatedY = animationProxy.y;
          
          if (onUpdate) onUpdate(block);
        },
        onComplete: () => {
          // Finalize block position
          block.x = newX;
          block.y = newY;
          block.animatedX = newX;
          block.animatedY = newY;
          block.isAnimating = false;
          block.gsapTween = null;
        }
      });

      block.gsapTween = tween;
      this.animationTimeline.add(tween, delay);
      this.activeAnimations.set(this.getBlockId(block), tween);
    });
  }

  /**
   * Stop all active animations
   */
  stopAllAnimations() {
    if (this.animationTimeline) {
      this.animationTimeline.kill();
      this.animationTimeline = null;
    }

    // Stop individual tweens
    this.activeAnimations.forEach(tween => {
      if (tween) tween.kill();
    });
    
    this.activeAnimations.clear();
    this.isAnimating = false;
    
    console.log('All ore animations stopped');
  }

  /**
   * Update animation configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('Animation config updated:', this.config);
  }

  /**
   * Get unique identifier for a block
   */
  getBlockId(block) {
    return `${block.originalX}-${block.originalY}-${block.oreType}`;
  }

  /**
   * Get current animation progress (0-1)
   */
  getAnimationProgress() {
    if (!this.animationTimeline) return 1;
    return this.animationTimeline.progress();
  }

  /**
   * Check if any animations are currently running
   */
  isRunning() {
    return this.isAnimating;
  }

  /**
   * Get statistics about current animations
   */
  getAnimationStats() {
    return {
      isAnimating: this.isAnimating,
      activeAnimations: this.activeAnimations.size,
      progress: this.getAnimationProgress(),
      timeline: !!this.animationTimeline
    };
  }

  /**
   * Pause all animations
   */
  pauseAnimations() {
    if (this.animationTimeline) {
      this.animationTimeline.pause();
    }
  }

  /**
   * Resume paused animations
   */
  resumeAnimations() {
    if (this.animationTimeline) {
      this.animationTimeline.resume();
    }
  }

  /**
   * Set animation speed multiplier
   */
  setSpeed(speedMultiplier = 1) {
    if (this.animationTimeline) {
      this.animationTimeline.timeScale(speedMultiplier);
    }
  }
}

// Create and export a singleton instance
export const oreAnimationEngine = new OreAnimationEngine();