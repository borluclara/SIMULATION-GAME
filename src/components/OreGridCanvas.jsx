import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import './OreGridCanvas.css';
import { getMaterialTexture, getMovementBehavior } from '../utils/MaterialPropertyHandler';

const OreGridCanvas = forwardRef(({ 
  grid, 
  onBlockClick = null,
  cellSize = 45,
  showGrid = true,
  showLabels = false,
  className = '',
  placementMode = false,
  blastMarkers = [],
  explosionAnimations = [],
  physicsDebris = [],  // NEW: debris particles from physics
  blastDirection = 90,  // NEW: blast direction for visual indicators
  showBlastDirection = true,  // NEW: toggle for blast direction indicators
  animationState = null,  // NEW: Animation state from BlastAnimationEngine
  cameraShake = { x: 0, y: 0 }  // NEW: Camera shake offset
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Expose canvas ref to parent
  useImperativeHandle(ref, () => canvasRef.current);

  const calculateCanvasSize = useCallback(() => {
    if (!grid || !containerRef.current) return { width: 0, height: 0, scale: 1 };

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    const minWidth = Math.max(containerWidth, 300);
    const minHeight = Math.max(containerHeight, 200);
    
    const gridPixelWidth = grid.width * cellSize;
    const gridPixelHeight = grid.height * cellSize;
    
    const scaleX = minWidth / gridPixelWidth;
    const scaleY = minHeight / gridPixelHeight;
    const scale = Math.min(scaleX, scaleY, 2);
    
    const minCellSize = 8;
    const adjustedScale = Math.max(scale, minCellSize / cellSize);
    
    const finalWidth = Math.floor(gridPixelWidth * adjustedScale);
    const finalHeight = Math.floor(gridPixelHeight * adjustedScale);
    
    return { width: finalWidth, height: finalHeight, scale: adjustedScale };
  }, [grid, cellSize]);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const dimensions = calculateCanvasSize();
      setCanvasDimensions({ width: dimensions.width, height: dimensions.height });
      setScaleFactor(dimensions.scale);
    };

    updateDimensions();
    
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 150);
    };
    
    let resizeObserver;
    if (window.ResizeObserver && containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [calculateCanvasSize]);

  // Helper function to get material color
  const getMaterialColorFromType = useCallback((material) => {
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
  }, []);

  const renderGrid = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || !grid || canvasDimensions.width === 0) {
        setIsCanvasReady(false);
        return;
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      const { width, height } = canvasDimensions;
      const scaledCellSize = cellSize * scaleFactor;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Apply camera shake
      ctx.save();
      ctx.translate(cameraShake.x, cameraShake.y);

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-cameraShake.x, -cameraShake.y, width + Math.abs(cameraShake.x) * 2, height + Math.abs(cameraShake.y) * 2);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw grid cells
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const block = grid.getBlockAtGridPos(x, y);
          
          const pixelX = Math.floor(x * scaledCellSize);
          const pixelY = Math.floor(y * scaledCellSize);
          const cellWidth = Math.ceil(scaledCellSize);
          const cellHeight = Math.ceil(scaledCellSize);
          
          if (block) {
            // Skip destroyed blocks (they're now debris!)
            if (block.isDestroyed) {
              ctx.fillStyle = '#0a0a0a'; // Empty space
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
              continue;
            }

            // Enhanced material-based rendering
            const materialTexture = getMaterialTexture(block.oreType);
            const movementBehavior = getMovementBehavior(block.oreType);
            
            // Base color
            ctx.fillStyle = block.getColor();
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            
            // Material-specific visual effects
            renderMaterialEffects(ctx, pixelX, pixelY, cellWidth, cellHeight, block, materialTexture);
            
            // Base gradient for depth
            const gradient = ctx.createLinearGradient(pixelX, pixelY, pixelX + cellWidth, pixelY + cellHeight);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            
            // Damage visualization removed (preserve original material colors after blasts)
            
            // NEW: Crack visualization for damaged blocks
            if (block.crackLevel > 0 && block.crackPatterns && block.crackPatterns.length > 0) {
              renderCrackPatterns(ctx, pixelX, pixelY, cellWidth, cellHeight, block);
            }
            
            // Enhanced displacement visual effects with movement behavior
            if (block.recentlyDisplaced) {
              const displacementColor = movementBehavior.movementColor;
              ctx.strokeStyle = displacementColor;
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(pixelX + 1, pixelY + 1, cellWidth - 2, cellHeight - 2);
              ctx.setLineDash([]); // Reset line dash
              
              // Movement range indicator
              const alpha = movementBehavior.displacementRange === 'far' ? 0.25 : 
                           movementBehavior.displacementRange === 'medium' ? 0.15 : 0.08;
              ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            }
            
            if (showLabels && scaledCellSize > 16) {
              const fontSize = Math.max(8, scaledCellSize / 3.5);
              ctx.font = `bold ${fontSize}px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              const textX = pixelX + cellWidth / 2;
              const textY = pixelY + cellHeight / 2;
              const text = block.oreType.charAt(0).toUpperCase();
              ctx.fillText(text, textX + 1, textY + 1);
              
              ctx.fillStyle = '#ffffff';
              ctx.fillText(text, textX, textY);
            }
          } else {
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          }
          
          // Hover highlighting removed
          // No visual effects when hovering over grid cells
          
          if (showGrid && scaledCellSize > 8) {
            ctx.strokeStyle = block ? '#666666' : '#444444';
            ctx.lineWidth = scaledCellSize > 20 ? 1 : 0.5;
            ctx.strokeRect(pixelX + 0.5, pixelY + 0.5, cellWidth - 1, cellHeight - 1);
          }
        }
      }
      
      // Draw blast markers
      if (blastMarkers && blastMarkers.length > 0) {
        blastMarkers.forEach(blast => {
          const blastX = Math.floor(blast.x * scaledCellSize);
          const blastY = Math.floor(blast.y * scaledCellSize);
          const markerSize = scaledCellSize * 0.8;
          const centerX = blastX + scaledCellSize / 2;
          const centerY = blastY + scaledCellSize / 2;
          
          // Draw main blast marker circle
          ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
          ctx.beginPath();
          ctx.arc(centerX, centerY, markerSize / 2, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw directional arrow if blast has direction
          if (blast.direction !== undefined && scaledCellSize > 20) {
            const directionRadians = (blast.direction * Math.PI) / 180;
            const arrowLength = scaledCellSize * 0.4;
            
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 2;
            
            // Calculate arrow end point (0° = North, 90° = East, 180° = South, 270° = West)
            const endX = centerX + Math.sin(directionRadians) * arrowLength;
            const endY = centerY - Math.cos(directionRadians) * arrowLength;
            
            // Draw arrow line
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Draw arrowhead
            const arrowHeadSize = scaledCellSize * 0.15;
            const arrowHeadAngle = Math.PI / 6; // 30 degrees
            
            const leftX = endX - Math.sin(directionRadians - arrowHeadAngle) * arrowHeadSize;
            const leftY = endY + Math.cos(directionRadians - arrowHeadAngle) * arrowHeadSize;
            const rightX = endX - Math.sin(directionRadians + arrowHeadAngle) * arrowHeadSize;
            const rightY = endY + Math.cos(directionRadians + arrowHeadAngle) * arrowHeadSize;
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(leftX, leftY);
            ctx.moveTo(endX, endY);
            ctx.lineTo(rightX, rightY);
            ctx.stroke();
            
            ctx.restore();
          }
          
          if (scaledCellSize > 16) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${scaledCellSize * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', centerX, centerY);
          }
        });
      }
      
      // Draw explosion animations
      if (explosionAnimations && explosionAnimations.length > 0) {
        explosionAnimations.forEach(explosion => {
          const expX = Math.floor(explosion.x * scaledCellSize);
          const expY = Math.floor(explosion.y * scaledCellSize);
          const progress = explosion.frame / explosion.maxFrames;
          const radius = scaledCellSize * (1 + progress * 2);
          
          const gradient = ctx.createRadialGradient(
            expX + scaledCellSize / 2, expY + scaledCellSize / 2, 0,
            expX + scaledCellSize / 2, expY + scaledCellSize / 2, radius
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${1 - progress})`);
          gradient.addColorStop(0.5, `rgba(200, 200, 200, ${0.8 - progress})`);
          gradient.addColorStop(1, `rgba(150, 150, 150, ${0.3 - progress})`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(
            expX + scaledCellSize / 2, 
            expY + scaledCellSize / 2, 
            radius, 
            0, 
            2 * Math.PI
          );
          ctx.fill();
        });
      }

      // *** ENHANCED: Draw falling physics debris with realistic effects ***
      if (physicsDebris && physicsDebris.length > 0) {
        console.log('Canvas: Drawing', physicsDebris.length, 'enhanced falling debris particles');
        physicsDebris.forEach(debris => {
          const pos = debris.body.position;
          const velocity = debris.body.velocity;
          const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
          const rotation = debris.body.angle;
          
          ctx.save();
          
          // Material-based particle rendering with enhanced effects
          const materialProps = debris.materialProps || {};
          const density = materialProps.density || 2.5;
          const hardness = materialProps.hardness || 5;
          const fragmentation = materialProps.fragmentation_index || 0.5;
          const bounceCount = debris.bounceCount || 0;
          
          // Enhanced particle size based on fragmentation and age
          const age = Date.now() - debris.createdAt;
          const ageFactor = Math.max(0.7, 1 - (age / 15000)); // Slowly shrink over 15s
          const effectiveSize = debris.size * (0.4 + fragmentation * 0.6) * ageFactor;
          
          // Rotation-based visual effects for falling debris
          ctx.translate(pos.x, pos.y);
          ctx.rotate(rotation);
          
          // Base particle color with brightness based on speed
          const speedBrightness = Math.min(1, 0.6 + (speed * 0.1));
          const baseColor = debris.color;
          
          // Enhanced motion trails for falling particles
          if (speed > 1) {
            const trailLength = Math.min(speed * 3, 20);
            const trailOpacity = Math.min(speed * 0.15, 0.7);
            
            ctx.strokeStyle = `rgba(255, 150, 50, ${trailOpacity})`;
            ctx.lineWidth = effectiveSize * 0.3;
            ctx.beginPath();
            ctx.moveTo(-trailLength, 0);
            ctx.lineTo(0, 0);
            ctx.stroke();
          }
          
          // Material-specific enhanced visual effects
          if (density > 4.0) {
            // Dense materials: strong metallic glow, spark effects
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = 8 + (speed * 0.5);
            
            // Sparks for high-speed dense materials
            if (speed > 3) {
              ctx.fillStyle = 'rgba(255, 255, 150, 0.8)';
              for (let i = 0; i < 3; i++) {
                const sparkAngle = (i * Math.PI * 2 / 3) + rotation;
                const sparkDistance = effectiveSize * 1.5;
                ctx.beginPath();
                ctx.arc(
                  Math.cos(sparkAngle) * sparkDistance, 
                  Math.sin(sparkAngle) * sparkDistance, 
                  1, 0, Math.PI * 2
                );
                ctx.fill();
              }
            }
          } else if (density < 2.0) {
            // Light materials: floating, wispy effects
            ctx.shadowColor = 'rgba(200, 220, 255, 0.6)';
            ctx.shadowBlur = 12;
            
            // Dust trail for light materials
            if (speed > 0.5) {
              ctx.fillStyle = `rgba(180, 180, 200, ${Math.min(speed * 0.2, 0.4)})`;
              for (let i = 1; i <= 3; i++) {
                const dustSize = effectiveSize * (0.3 / i);
                ctx.beginPath();
                ctx.arc(-i * 5, (Math.random() - 0.5) * 4, dustSize, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          } else {
            // Medium density: standard effects with bounce enhancement
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = 6 + (bounceCount * 2); // Glow increases with bounces
          }
          
          // Main particle with enhanced shape based on material
          ctx.fillStyle = baseColor;
          
          if (hardness >= 7) {
            // Hard materials: angular, crystalline shapes
            ctx.beginPath();
            const sides = 6;
            for (let i = 0; i < sides; i++) {
              const angle = (i * Math.PI * 2 / sides);
              const x = Math.cos(angle) * effectiveSize;
              const y = Math.sin(angle) * effectiveSize;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          } else if (fragmentation > 0.7) {
            // High fragmentation: irregular shapes
            ctx.beginPath();
            const irregularity = fragmentation * 0.3;
            for (let i = 0; i < 8; i++) {
              const angle = (i * Math.PI * 2 / 8);
              const variation = 1 + (Math.sin(angle * 3 + rotation) * irregularity);
              const x = Math.cos(angle) * effectiveSize * variation;
              const y = Math.sin(angle) * effectiveSize * variation;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            // Standard materials: circular particles
            ctx.beginPath();
            ctx.arc(0, 0, effectiveSize, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Enhanced material-specific additional effects
          ctx.shadowBlur = 0;
          
          // Hardness indicator with enhanced sparkle effects for falling debris
          if (hardness >= 7) {
            // Bright highlight spot
            ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + (speed * 0.1)})`;
            ctx.beginPath();
            ctx.arc(-effectiveSize * 0.3, -effectiveSize * 0.3, effectiveSize * 0.25, 0, Math.PI * 2);
            ctx.fill();
            
            // Enhanced sparkle pattern for very hard materials with rotation
            if (hardness >= 9) {
              ctx.strokeStyle = `rgba(200, 255, 255, ${0.5 + (speed * 0.2)})`;
              ctx.lineWidth = Math.max(1, effectiveSize * 0.1);
              ctx.beginPath();
              // Rotating cross pattern
              ctx.moveTo(-effectiveSize * 0.8, 0);
              ctx.lineTo(effectiveSize * 0.8, 0);
              ctx.moveTo(0, -effectiveSize * 0.8);
              ctx.lineTo(0, effectiveSize * 0.8);
              // Diagonal cross
              ctx.moveTo(-effectiveSize * 0.6, -effectiveSize * 0.6);
              ctx.lineTo(effectiveSize * 0.6, effectiveSize * 0.6);
              ctx.moveTo(effectiveSize * 0.6, -effectiveSize * 0.6);
              ctx.lineTo(-effectiveSize * 0.6, effectiveSize * 0.6);
              ctx.stroke();
            }
          }
          
          // Enhanced valuable materials with dynamic shimmer based on movement
          const economicValue = materialProps.economic_value || 1;
          if (economicValue >= 5) {
            const shimmerIntensity = 0.3 + (speed * 0.1) + (Math.sin(Date.now() * 0.01) * 0.2);
            ctx.fillStyle = `rgba(255, 215, 0, ${shimmerIntensity})`;
            ctx.beginPath();
            ctx.arc(effectiveSize * 0.4, -effectiveSize * 0.4, effectiveSize * 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Extra sparkle for very valuable materials
            if (economicValue >= 10) {
              ctx.fillStyle = `rgba(255, 255, 150, ${shimmerIntensity * 0.8})`;
              ctx.beginPath();
              ctx.arc(-effectiveSize * 0.2, effectiveSize * 0.3, effectiveSize * 0.1, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          
          // Bounce effect indicator
          if (bounceCount > 0 && bounceCount < 5) {
            const bounceGlow = Math.max(0, 1 - (age / 2000)); // Fade over 2 seconds
            ctx.strokeStyle = `rgba(255, 100, 100, ${bounceGlow * 0.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, effectiveSize * 1.5, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.restore();
        });
      }

      // Blast direction indicator removed
      
      // *** NEW: Draw GSAP animated shockwaves ***
      if (animationState && animationState.shockwaves && animationState.shockwaves.length > 0) {
        animationState.shockwaves.forEach(shockwave => {
          const shockX = Math.floor(shockwave.x * scaledCellSize + scaledCellSize / 2);
          const shockY = Math.floor(shockwave.y * scaledCellSize + scaledCellSize / 2);
          const shockRadius = shockwave.radius * scaleFactor;
          
          // Draw shockwave ring with gradient
          ctx.save();
          ctx.strokeStyle = `rgba(255, 140, 0, ${shockwave.opacity})`;
          ctx.lineWidth = shockwave.lineWidth;
          ctx.shadowColor = 'rgba(255, 69, 0, 0.8)';
          ctx.shadowBlur = 10;
          
          ctx.beginPath();
          ctx.arc(shockX, shockY, shockRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner glow
          ctx.strokeStyle = `rgba(255, 200, 0, ${shockwave.opacity * 0.6})`;
          ctx.lineWidth = shockwave.lineWidth * 1.5;
          ctx.shadowBlur = 15;
          ctx.stroke();
          
          ctx.restore();
        });
      }

      // *** NEW: Draw animated block transitions ***
      if (animationState && animationState.blockTransitions && animationState.blockTransitions.length > 0) {
        animationState.blockTransitions.forEach(transition => {
          const blockX = transition.currentX * scaledCellSize;
          const blockY = transition.currentY * scaledCellSize;
          const blockSize = scaledCellSize * transition.scale;
          
          ctx.save();
          ctx.globalAlpha = transition.opacity;
          ctx.translate(blockX + scaledCellSize / 2, blockY + scaledCellSize / 2);
          ctx.rotate((transition.rotation * Math.PI) / 180);
          
          // Draw block with material color
          const materialColor = getMaterialColorFromType(transition.material);
          ctx.fillStyle = materialColor;
          ctx.fillRect(-blockSize / 2, -blockSize / 2, blockSize, blockSize);
          
          // Add highlight
          const gradient = ctx.createLinearGradient(-blockSize / 2, -blockSize / 2, blockSize / 2, blockSize / 2);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
          ctx.fillStyle = gradient;
          ctx.fillRect(-blockSize / 2, -blockSize / 2, blockSize, blockSize);
          
          ctx.restore();
          
          // Motion trail effect - draw faded copy behind moving block
          if (transition.progress > 0.1 && transition.progress < 0.9) {
            const trailX = (transition.originalX + (transition.currentX - transition.originalX) * 0.7) * scaledCellSize;
            const trailY = (transition.originalY + (transition.currentY - transition.originalY) * 0.7) * scaledCellSize;
            
            ctx.save();
            ctx.globalAlpha = 0.2 * transition.opacity;
            ctx.fillStyle = materialColor;
            ctx.fillRect(trailX, trailY, blockSize, blockSize);
            ctx.restore();
          }
        });
      }

      // *** NEW: Draw flash effects ***
      if (animationState && animationState.animations) {
        animationState.animations.forEach(anim => {
          if (anim.type === 'flash') {
            const flashX = Math.floor(anim.x * scaledCellSize + scaledCellSize / 2);
            const flashY = Math.floor(anim.y * scaledCellSize + scaledCellSize / 2);
            const flashRadius = scaledCellSize * anim.scale;
            
            // Bright flash
            const gradient = ctx.createRadialGradient(
              flashX, flashY, 0,
              flashX, flashY, flashRadius
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${anim.opacity})`);
            gradient.addColorStop(0.4, `rgba(255, 200, 0, ${anim.opacity * 0.7})`);
            gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(flashX, flashY, flashRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // Restore context after camera shake
      ctx.restore();
      
      setIsCanvasReady(true);
    });
  }, [grid, canvasDimensions, scaleFactor, cellSize, showGrid, showLabels, blastMarkers, explosionAnimations, physicsDebris, hoveredBlock, animationState, cameraShake, getMaterialColorFromType]);

  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  const getBlockFromMouseEvent = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const scaledCellSize = cellSize * scaleFactor;
    const gridX = Math.floor(mouseX / scaledCellSize);
    const gridY = Math.floor(mouseY / scaledCellSize);
    
    if (gridX >= 0 && gridX < grid.width && gridY >= 0 && gridY < grid.height) {
      const block = grid.getBlockAtGridPos(gridX, gridY);
      return { block, gridX, gridY, mouseX, mouseY };
    }
    
    return null;
  };

  // Render material-specific visual effects
  const renderMaterialEffects = useCallback((ctx, x, y, width, height, block, materialTexture) => {
    const cellSize = Math.min(width, height);
    
    // Hardness visualization
    if (materialTexture.hardnessLevel === 'very-hard') {
      // Metallic shine for very hard materials
      const shineGradient = ctx.createLinearGradient(x, y, x + width * 0.3, y + height * 0.3);
      shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = shineGradient;
      ctx.fillRect(x, y, width * 0.3, height * 0.3);
    } else if (materialTexture.hardnessLevel === 'hard') {
      // Glossy finish for hard materials
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, y, width * 0.4, height * 0.1);
    }
    
    // Density visualization - border thickness
    if (materialTexture.densityLevel === 'very-dense') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
    } else if (materialTexture.densityLevel === 'dense') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    } else if (materialTexture.densityLevel === 'light') {
      ctx.strokeStyle = 'rgba(200, 200, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
      ctx.setLineDash([]);
    }
    
    // Fragmentation visualization removed
    // No X marks or crack patterns on materials
    
    // Valuable ore sparkles removed
    // No sparkly effects on valuable materials
    
    // Grain texture for soft materials
    if (materialTexture.showGrain && cellSize > 12) {
      ctx.fillStyle = 'rgba(160, 120, 80, 0.1)';
      const grainSize = 2;
      
      for (let gx = 0; gx < width; gx += grainSize * 2) {
        for (let gy = 0; gy < height; gy += grainSize * 2) {
          if (Math.random() > 0.7) {
            ctx.fillRect(x + gx, y + gy, grainSize, grainSize);
          }
        }
      }
    }
    
    // Material type indicator corners
    if (cellSize > 20) {
      const cornerSize = cellSize * 0.15;
      
      if (block.materialProperties?.type === 'ore') {
        // Gold corner for ore
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillRect(x + width - cornerSize, y, cornerSize, cornerSize);
      } else if (block.materialProperties?.type === 'waste') {
        // Gray corner for waste
        ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.fillRect(x, y + height - cornerSize, cornerSize, cornerSize);
      }
    }
  }, []);

  // Render crack patterns on damaged blocks
  const renderCrackPatterns = useCallback((ctx, x, y, width, height, block) => {
    if (!block.crackPatterns || block.crackPatterns.length === 0) return;
    
    ctx.save();
    
    // Set up crack rendering properties
    const baseColor = block.getColor();
    const crackIntensity = Math.min(1, block.crackLevel / 3);
    
    // Create darker version of block color for cracks
    const crackColor = darkenColor(baseColor, 0.6 + (crackIntensity * 0.3));
    
    // Render each crack pattern
    block.crackPatterns.forEach(crack => {
      ctx.strokeStyle = crackColor;
      ctx.lineWidth = Math.max(1, crack.width * (width / 30)); // Scale with cell size
      ctx.globalAlpha = crack.opacity * crackIntensity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Start the crack path
      ctx.beginPath();
      
      // Convert normalized coordinates to pixel coordinates
      const startX = x + crack.start.x * width;
      const startY = y + crack.start.y * height;
      const endX = x + crack.end.x * width;
      const endY = y + crack.end.y * height;
      
      ctx.moveTo(startX, startY);
      
      // Draw through mid points for irregular cracks
      if (crack.midPoints && crack.midPoints.length > 0) {
        crack.midPoints.forEach(point => {
          const midX = x + point.x * width;
          const midY = y + point.y * height;
          ctx.lineTo(midX, midY);
        });
      }
      
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Add subtle glow for more visible cracks on higher damage levels
      if (block.crackLevel >= 2) {
        ctx.shadowColor = crackColor;
        ctx.shadowBlur = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
    
    ctx.restore();
  }, []);
  
  // Helper function to darken colors for crack effect
  const darkenColor = useCallback((hexColor, factor) => {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken by factor
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }, []);

  const handleMouseMove = (event) => {
    const result = getBlockFromMouseEvent(event);
    if (result) {
      setHoveredBlock({
        ...result.block,
        x: result.gridX,
        y: result.gridY,
        canvasX: result.mouseX,
        canvasY: result.mouseY
      });
    } else {
      setHoveredBlock(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredBlock(null);
  };

  const handleClick = (event) => {
    const result = getBlockFromMouseEvent(event);
    if (result && onBlockClick) {
      const { gridX, gridY, block } = result;
      
      // Check if cell is already occupied by a blast marker
      const isOccupied = blastMarkers && blastMarkers.some(blast => blast.x === gridX && blast.y === gridY);
      
      // Prevent clicking on occupied cells or destroyed blocks
      if (isOccupied || (block && block.isDestroyed)) {
        console.log(`Cannot place blast at (${gridX}, ${gridY}): ${isOccupied ? 'Cell already occupied' : 'Block is destroyed'}`);
        return;
      }
      
      onBlockClick(block, { x: gridX, y: gridY });
      setTimeout(renderGrid, 50);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`ore-grid-canvas-container ${className} ${!isCanvasReady ? 'loading' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className={`ore-grid-canvas ${
          hoveredBlock 
            ? (blastMarkers && blastMarkers.some(blast => blast.x === hoveredBlock.x && blast.y === hoveredBlock.y) || hoveredBlock.isDestroyed) 
              ? 'cursor-occupied' 
              : 'cursor-available'
            : 'cursor-default'
        }`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          width: canvasDimensions.width,
          height: canvasDimensions.height,
          maxWidth: '100%',
          maxHeight: '100%',
          display: canvasDimensions.width > 0 ? 'block' : 'none'
        }}
        aria-label="Interactive ore grid - place explosives to blast ore blocks"
        role="img"
      />
      
      {!isCanvasReady && canvasDimensions.width === 0 && (
        <div className="canvas-loading">
          <div className="loading-spinner"></div>
          <span>Initializing canvas...</span>
        </div>
      )}
      
      {isCanvasReady && grid && (
        <div className="canvas-info">
          <span className="grid-size">{grid.width} × {grid.height}</span>
          <span className="zoom-level">Zoom: {Math.round(scaleFactor * 100)}%</span>
        </div>
      )}
      
      {hoveredBlock && !hoveredBlock.isDestroyed && (
        <div 
          className="block-tooltip"
          style={{
            position: 'absolute',
            left: `${hoveredBlock.canvasX + 10}px`,
            top: `${hoveredBlock.canvasY - 10}px`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div className="tooltip-content">
            <div className="tooltip-title">{hoveredBlock.oreType}</div>
            <div className="tooltip-info">
              Position: ({hoveredBlock.x}, {hoveredBlock.y})
            </div>
            <div className="tooltip-info">
              Health: {hoveredBlock.health}/{hoveredBlock.maxHealth} | Value: {hoveredBlock.value}
            </div>
            {hoveredBlock.damage > 0 && (
              <div className="tooltip-damage">Damage: {hoveredBlock.damage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

OreGridCanvas.displayName = 'OreGridCanvas';

export default OreGridCanvas;