/**
 * OreVisualFeedback.js
 * 
 * Provides visual feedback for ore blocks after blast evaluation.
 * Color-codes blocks based on their outcome (recovered/diluted/unaffected)
 * with smooth animations and performance optimizations.
 * 
 * Features:
 * - Color coding by outcome
 * - Smooth fade-in/pulse animations
 * - Performance optimized for 10,000+ blocks
 * - Canvas-based rendering for efficiency
 * - Proper cleanup and reset handling
 * 
 * @module OreVisualFeedback
 */

import { isOre } from './OreClassification.js';

// ============================================================================
// Visual Feedback States
// ============================================================================

/**
 * Outcome states for ore blocks
 */
export const OUTCOME_STATES = {
  RECOVERED: 'recovered',      // Ore successfully collected
  DILUTED: 'diluted',          // Ore missed, waste collected instead
  WASTED: 'wasted',            // Ore not collected, displaced
  UNAFFECTED: 'unaffected',    // Ore not in blast zone
  WASTE_COLLECTED: 'waste_collected'  // Waste material collected (dilution source)
};

/**
 * Color palette for different outcomes
 */
export const OUTCOME_COLORS = {
  recovered: {
    base: '#22c55e',       // Green
    glow: '#86efac',
    border: '#16a34a',
    label: 'Recovered'
  },
  diluted: {
    base: '#ef4444',       // Red
    glow: '#fca5a5',
    border: '#dc2626',
    label: 'Diluted'
  },
  wasted: {
    base: '#f59e0b',       // Orange
    glow: '#fcd34d',
    border: '#d97706',
    label: 'Wasted'
  },
  unaffected: {
    base: '#6b7280',       // Gray
    glow: '#d1d5db',
    border: '#4b5563',
    label: 'Unaffected'
  },
  waste_collected: {
    base: '#8b5cf6',       // Purple
    glow: '#c4b5fd',
    border: '#7c3aed',
    label: 'Waste'
  }
};

/**
 * Animation configurations
 */
const ANIMATION_CONFIG = {
  fadeInDuration: 400,      // ms
  pulseDuration: 800,       // ms
  pulseDelay: 200,          // ms between blocks
  glowIntensity: 0.6,
  maxPulseScale: 1.15,
  staggerGroups: true       // Stagger animations by outcome type
};

// ============================================================================
// Block State Management
// ============================================================================

/**
 * Visual state for a single block
 */
export class BlockVisualState {
  constructor(x, y, outcome, blockData = {}) {
    this.x = x;
    this.y = y;
    this.outcome = outcome;
    this.oreType = blockData.oreType;
    this.value = blockData.value || 0;
    
    // Animation state
    this.opacity = 0;
    this.scale = 1;
    this.glowIntensity = 0;
    this.animationProgress = 0;
    this.animationStartTime = 0;
    this.pulsePhase = 0;
    
    // Flags
    this.isAnimating = false;
    this.shouldPulse = true;
  }

  /**
   * Get current color based on outcome and animation state
   */
  getCurrentColor() {
    const colorScheme = OUTCOME_COLORS[this.outcome];
    if (!colorScheme) return OUTCOME_COLORS.unaffected;
    return colorScheme;
  }

  /**
   * Update animation state
   */
  updateAnimation(currentTime, deltaTime) {
    if (!this.isAnimating) return false;

    const elapsed = currentTime - this.animationStartTime;
    
    // Fade in
    if (elapsed < ANIMATION_CONFIG.fadeInDuration) {
      this.opacity = Math.min(1, elapsed / ANIMATION_CONFIG.fadeInDuration);
      this.animationProgress = this.opacity;
    } else {
      this.opacity = 1;
      
      // Pulse animation
      if (this.shouldPulse) {
        this.pulsePhase += deltaTime * 0.003; // Slower pulse
        const pulse = Math.sin(this.pulsePhase) * 0.5 + 0.5;
        this.scale = 1 + (pulse * (ANIMATION_CONFIG.maxPulseScale - 1) * 0.15);
        this.glowIntensity = pulse * ANIMATION_CONFIG.glowIntensity;
      }
    }

    return true;
  }

  /**
   * Start animation with delay
   */
  startAnimation(currentTime, delay = 0) {
    this.animationStartTime = currentTime + delay;
    this.isAnimating = true;
    this.opacity = 0;
    this.scale = 1;
    this.pulsePhase = 0;
  }

  /**
   * Stop all animations
   */
  stopAnimation() {
    this.isAnimating = false;
    this.opacity = 1;
    this.scale = 1;
    this.glowIntensity = 0;
  }
}

// ============================================================================
// Visual Feedback Manager
// ============================================================================

/**
 * Manages visual feedback for all ore blocks
 */
export class OreVisualFeedbackManager {
  constructor() {
    this.blockStates = new Map(); // Map<"x,y", BlockVisualState>
    this.isActive = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    
    // Performance optimization
    this.useCanvasAcceleration = true;
    this.batchSize = 100; // Render blocks in batches
    
    // Statistics
    this.stats = {
      recovered: 0,
      diluted: 0,
      wasted: 0,
      unaffected: 0,
      waste_collected: 0
    };
  }

  /**
   * Classify block outcomes based on blast results
   */
  classifyBlockOutcomes(blastData, affectedBlocks) {
    const outcomes = new Map();

    // Create lookup for affected blocks
    const affectedLookup = new Map();
    affectedBlocks.forEach(block => {
      const key = `${block.x},${block.y}`;
      affectedLookup.set(key, block);
    });

    // Process all grid blocks
    if (blastData.gridBlocks) {
      blastData.gridBlocks.forEach(block => {
        const key = `${block.x},${block.y}`;
        const affectedBlock = affectedLookup.get(key);
        
        let outcome;

        if (affectedBlock) {
          // Block was affected by blast
          if (isOre(block.oreType)) {
            if (affectedBlock.isInCollectionZone) {
              outcome = OUTCOME_STATES.RECOVERED;
            } else if (affectedBlock.isDisplaced) {
              outcome = OUTCOME_STATES.WASTED;
            } else {
              outcome = OUTCOME_STATES.DILUTED;
            }
          } else {
            // Waste material
            if (affectedBlock.isInCollectionZone) {
              outcome = OUTCOME_STATES.WASTE_COLLECTED;
            } else {
              outcome = OUTCOME_STATES.UNAFFECTED;
            }
          }
        } else {
          // Block not affected by blast
          outcome = OUTCOME_STATES.UNAFFECTED;
        }

        outcomes.set(key, {
          x: block.x,
          y: block.y,
          outcome,
          oreType: block.oreType,
          value: block.value || 0
        });
      });
    } else {
      // Fallback: use only affected blocks
      affectedBlocks.forEach(block => {
        const key = `${block.x},${block.y}`;
        let outcome;

        if (isOre(block.oreType)) {
          if (block.isInCollectionZone) {
            outcome = OUTCOME_STATES.RECOVERED;
          } else if (block.isDisplaced) {
            outcome = OUTCOME_STATES.WASTED;
          } else {
            outcome = OUTCOME_STATES.DILUTED;
          }
        } else {
          outcome = block.isInCollectionZone 
            ? OUTCOME_STATES.WASTE_COLLECTED 
            : OUTCOME_STATES.UNAFFECTED;
        }

        outcomes.set(key, {
          x: block.x,
          y: block.y,
          outcome,
          oreType: block.oreType,
          value: block.value || 0
        });
      });
    }

    return outcomes;
  }

  /**
   * Apply visual feedback to blocks
   */
  applyFeedback(blastData, affectedBlocks) {
    // Clear existing states
    this.reset();

    // Classify outcomes
    const outcomes = this.classifyBlockOutcomes(blastData, affectedBlocks);

    // Create visual states
    const currentTime = performance.now();
    let delayIndex = 0;

    // Group by outcome type for staggered animation
    const outcomeGroups = new Map();
    outcomes.forEach((data, key) => {
      if (!outcomeGroups.has(data.outcome)) {
        outcomeGroups.set(data.outcome, []);
      }
      outcomeGroups.get(data.outcome).push({ key, data });
    });

    // Apply staggered delays by outcome type
    const outcomeOrder = [
      OUTCOME_STATES.RECOVERED,
      OUTCOME_STATES.WASTED,
      OUTCOME_STATES.DILUTED,
      OUTCOME_STATES.WASTE_COLLECTED,
      OUTCOME_STATES.UNAFFECTED
    ];

    outcomeOrder.forEach(outcomeType => {
      const group = outcomeGroups.get(outcomeType) || [];
      group.forEach(({ key, data }) => {
        const blockState = new BlockVisualState(
          data.x,
          data.y,
          data.outcome,
          data
        );

        // Stagger animation start
        const delay = ANIMATION_CONFIG.staggerGroups 
          ? delayIndex * ANIMATION_CONFIG.pulseDelay / 10
          : 0;
        
        blockState.startAnimation(currentTime, delay);
        this.blockStates.set(key, blockState);
        
        // Update statistics
        this.stats[data.outcome]++;
        delayIndex++;
      });
    });

    this.isActive = true;
    this.startAnimationLoop();

    return this.stats;
  }

  /**
   * Start animation loop
   */
  startAnimationLoop() {
    if (this.animationFrameId) return;

    const animate = (currentTime) => {
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Update all block animations
      let hasActiveAnimations = false;
      this.blockStates.forEach(blockState => {
        if (blockState.updateAnimation(currentTime, deltaTime)) {
          hasActiveAnimations = true;
        }
      });

      // Continue animation if any blocks are still animating
      if (hasActiveAnimations) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.stopAnimationLoop();
      }
    };

    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop animation loop
   */
  stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get visual state for a block
   */
  getBlockState(x, y) {
    const key = `${x},${y}`;
    return this.blockStates.get(key);
  }

  /**
   * Get all block states by outcome
   */
  getBlocksByOutcome(outcome) {
    const blocks = [];
    this.blockStates.forEach(blockState => {
      if (blockState.outcome === outcome) {
        blocks.push(blockState);
      }
    });
    return blocks;
  }

  /**
   * Reset all visual feedback
   */
  reset() {
    this.stopAnimationLoop();
    this.blockStates.clear();
    this.isActive = false;
    
    // Reset statistics
    Object.keys(this.stats).forEach(key => {
      this.stats[key] = 0;
    });
  }

  /**
   * Get current statistics
   */
  getStatistics() {
    return { ...this.stats };
  }

  /**
   * Export block states for rendering
   */
  exportRenderData() {
    const renderData = {
      byOutcome: {},
      all: []
    };

    this.blockStates.forEach(blockState => {
      const data = {
        x: blockState.x,
        y: blockState.y,
        outcome: blockState.outcome,
        oreType: blockState.oreType,
        color: blockState.getCurrentColor(),
        opacity: blockState.opacity,
        scale: blockState.scale,
        glowIntensity: blockState.glowIntensity
      };

      // Group by outcome
      if (!renderData.byOutcome[blockState.outcome]) {
        renderData.byOutcome[blockState.outcome] = [];
      }
      renderData.byOutcome[blockState.outcome].push(data);
      
      // Add to all
      renderData.all.push(data);
    });

    return renderData;
  }
}

// ============================================================================
// Canvas Renderer (Performance Optimized)
// ============================================================================

/**
 * High-performance canvas renderer for visual feedback
 */
export class CanvasOreRenderer {
  constructor(canvas, gridSize, blockSize) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true // Performance hint
    });
    this.gridSize = gridSize;
    this.blockSize = blockSize;
    
    // Offscreen canvas for double buffering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  /**
   * Render block with visual feedback
   */
  renderBlock(blockState, offsetX = 0, offsetY = 0) {
    const ctx = this.offscreenCtx;
    const x = blockState.x * this.blockSize + offsetX;
    const y = blockState.y * this.blockSize + offsetY;
    const size = this.blockSize * blockState.scale;
    const centerX = x + this.blockSize / 2;
    const centerY = y + this.blockSize / 2;

    const colors = blockState.getCurrentColor();

    ctx.save();

    // Apply opacity
    ctx.globalAlpha = blockState.opacity;

    // Draw glow effect
    if (blockState.glowIntensity > 0) {
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, size * 0.7
      );
      gradient.addColorStop(0, colors.glow + Math.floor(blockState.glowIntensity * 255).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, colors.glow + '00');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        centerX - size * 0.7,
        centerY - size * 0.7,
        size * 1.4,
        size * 1.4
      );
    }

    // Draw main block
    ctx.fillStyle = colors.base;
    ctx.fillRect(
      centerX - size / 2,
      centerY - size / 2,
      size,
      size
    );

    // Draw border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      centerX - size / 2,
      centerY - size / 2,
      size,
      size
    );

    ctx.restore();
  }

  /**
   * Render all blocks with batching
   */
  renderAll(renderData, batchSize = 100) {
    // Clear offscreen canvas
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

    // Render in batches for performance
    const blocks = renderData.all;
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      batch.forEach(blockData => {
        // Find corresponding block state
        const blockState = new BlockVisualState(blockData.x, blockData.y, blockData.outcome);
        blockState.opacity = blockData.opacity;
        blockState.scale = blockData.scale;
        blockState.glowIntensity = blockData.glowIntensity;
        
        this.renderBlock(blockState);
      });
    }

    // Copy offscreen canvas to main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  OreVisualFeedbackManager,
  CanvasOreRenderer,
  OUTCOME_STATES,
  OUTCOME_COLORS,
  BlockVisualState
};
