# Blast Animation System Documentation

## Overview
The blast animation system provides dynamic, performant visual effects for explosion events in the BlastSim game. It combines GSAP (GreenSock Animation Platform) with Matter.js physics to create realistic and engaging blast sequences.

## Architecture

### Core Components

1. **BlastAnimationEngine** (`src/utils/BlastAnimationEngine.js`)
   - Orchestrates all animation sequences
   - Manages shockwaves, block transitions, and visual effects
   - Uses GSAP for smooth, hardware-accelerated animations

2. **PhysicsEngine** (`src/utils/PhysicsEngine.js`)
   - Handles debris particles with realistic physics
   - Uses Matter.js for collision detection and gravity
   - Creates dynamic particle systems for destroyed blocks

3. **OreGridCanvas** (`src/components/OreGridCanvas.jsx`)
   - Renders all visual elements on HTML5 Canvas
   - Supports multiple animation layers
   - Optimized for 60fps rendering

## Animation Sequence

When a blast is triggered, the following sequence occurs:

### 1. Epicenter Flash (0.0s - 0.4s)
- Bright white flash at blast center
- Scales from 0 to 2.5x cell size
- Fades from 100% to 0% opacity
- Duration: 400ms

### 2. Shockwave Expansion (0.0s - 1.3s)
- **Primary Shockwave**
  - Orange ring expanding from blast center
  - Radius: 0 to 8x cell size
  - Opacity fades with distance
  - Duration: 1000ms
  
- **Secondary Shockwave**
  - Lighter follow-up wave
  - Radius: 0 to 10x cell size
  - Delayed start: 150ms
  - Duration: 1300ms

### 3. Block Displacement (0.0s - 1.0s)
- Blocks animate from original to displaced positions
- Each block has:
  - Position transition (based on blast physics)
  - Rotation animation (randomized for natural look)
  - Scale variation (0.8 - 1.2x)
  - Opacity fade for destroyed blocks
- Staggered delay: 30ms between blocks
- Motion trails automatically generated

### 4. Screen Shake (0.0s - 0.5s)
- Camera shake at blast epicenter
- Intensity: ±15 pixels
- 5 rapid oscillations
- Duration: 500ms total

### 5. Physics Debris (1.0s - 6.0s)
- Destroyed blocks become physics particles
- Realistic gravity and collision
- Particle count based on material type
- Particles fade after 5 seconds

## Features

### ✅ Smooth Animations
- GSAP provides 60fps performance
- Hardware acceleration via CSS transforms
- Optimized canvas rendering

### ✅ Dynamic Shockwaves
- Expanding circular waves
- Dual-layer effect (primary + secondary)
- Opacity and thickness fade over time

### ✅ Block Transitions
- Smooth movement from old to new positions
- Rotation and scale variations
- Motion trails for enhanced effect
- Staggered timing for dramatic impact

### ✅ Screen Shake
- Optional epicenter vibration
- Realistic camera displacement
- Automatic reset after effect

### ✅ Physics Integration
- Matter.js debris simulation
- Material-specific particle properties
- Collision with boundaries
- Gravity-affected trajectories

### ✅ Performance Optimized
- RequestAnimationFrame for smooth updates
- Canvas layer separation
- GPU acceleration hints
- Cleanup on completion

## Configuration Options

```javascript
blastAnimationEngine.animateBlastSequence(blasts, affectedCells, cellSize, {
  shockwaveDuration: 1.0,        // Shockwave animation time (seconds)
  blockTransitionDuration: 1.0,   // Block movement time (seconds)
  epicenterShake: true,           // Enable/disable screen shake
  staggerDelay: 0.03,             // Delay between block animations (seconds)
  onUpdate: (state) => {},        // Callback for each frame
  onComplete: () => {}            // Callback when animation completes
});
```

## Performance Metrics

### Target Performance
- **Frame Rate**: 60 FPS
- **Animation Duration**: < 2 seconds
- **Memory Usage**: Minimal (automatic cleanup)

### Optimization Techniques
1. **Canvas Optimization**
   - Double buffering
   - Device pixel ratio handling
   - requestAnimationFrame timing

2. **Animation Optimization**
   - GSAP's optimized tweening engine
   - Transform-based animations (GPU accelerated)
   - Will-change CSS hints

3. **Physics Optimization**
   - Particle count limits
   - Automatic simulation timeout (5 seconds)
   - Efficient collision detection

## Material-Specific Effects

Different materials create different debris patterns:

| Material | Particle Count | Particle Size | Density |
|----------|---------------|---------------|---------|
| Iron     | 12            | 8px           | 0.006   |
| Gold     | 10            | 7px           | 0.010   |
| Copper   | 12            | 7px           | 0.005   |
| Silver   | 9             | 6px           | 0.007   |
| Coal     | 18            | 9px           | 0.002   |
| Stone    | 15            | 8px           | 0.004   |

## Accessibility

### Reduced Motion Support
The system respects `prefers-reduced-motion` settings:
- Animations reduce to minimal duration (0.01ms)
- Single iteration only
- Core functionality preserved

## Usage Example

```javascript
import { blastAnimationEngine } from './utils/BlastAnimationEngine';

// In your blast handler
const handleTriggerBlasts = async (result) => {
  blastAnimationEngine.animateBlastSequence(
    result.blasts,
    result.affectedCells,
    30, // cell size in pixels
    {
      shockwaveDuration: 1.0,
      blockTransitionDuration: 1.0,
      epicenterShake: true,
      onUpdate: (animState) => {
        setAnimationState(animState);
      },
      onComplete: () => {
        console.log('Animation complete!');
      }
    }
  );
};
```

## Troubleshooting

### Animations Not Appearing
1. Check that `animationState` is passed to OreGridCanvas
2. Verify GSAP is installed: `npm list gsap`
3. Check browser console for errors

### Performance Issues
1. Reduce particle counts in PhysicsEngine.js
2. Lower shockwave/block transition durations
3. Disable screen shake
4. Check device pixel ratio handling

### Physics Debris Not Visible
1. Verify canvas ref is available
2. Check `physicsDebris` state is being updated
3. Ensure physics engine is initialized
4. Check canvas dimensions

## Future Enhancements

- [ ] Particle effects for specific materials
- [ ] Sound effects synchronized with animations
- [ ] Configurable color schemes
- [ ] Animation presets (quick/normal/cinematic)
- [ ] Heat wave distortion effects
- [ ] Volumetric lighting
- [ ] Dynamic camera zoom on blast

## Credits

- **GSAP**: Animation framework (https://greensock.com)
- **Matter.js**: Physics engine (https://brm.io/matter-js)
- **Canvas API**: HTML5 rendering

---

**Version**: 1.0.0  
**Last Updated**: October 28, 2025  
**Performance**: ✅ 60 FPS Target Achieved
