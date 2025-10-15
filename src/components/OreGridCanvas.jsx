import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import './OreGridCanvas.css';

const OreGridCanvas = forwardRef(({ 
  grid, 
  onBlockClick = null,
  cellSize = 30,
  showGrid = true,
  showLabels = false,
  className = '',
  placementMode = false,
  blastMarkers = [],
  explosionAnimations = [],
  physicsDebris = []  // NEW: debris particles from physics
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

      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

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

            ctx.fillStyle = block.getColor();
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            
            const gradient = ctx.createLinearGradient(pixelX, pixelY, pixelX + cellWidth, pixelY + cellHeight);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            
            if (block.damage > 0) {
              const damageIntensity = (block.damage / block.maxHealth) * 0.4;
              ctx.fillStyle = `rgba(255, 100, 100, ${damageIntensity})`;
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
          
          // Add hover highlighting
          if (hoveredBlock && hoveredBlock.x === x && hoveredBlock.y === y) {
            // Check if cell is already occupied by a blast marker
            const isOccupied = blastMarkers && blastMarkers.some(blast => blast.x === x && blast.y === y);
            
            if (!isOccupied && !block?.isDestroyed) {
              // Highlight available cells
              ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
              
              // Add glowing border for hover effect
              ctx.strokeStyle = '#00ff88';
              ctx.lineWidth = 2;
              ctx.strokeRect(pixelX + 1, pixelY + 1, cellWidth - 2, cellHeight - 2);
            } else {
              // Show red highlight for occupied/unavailable cells
              ctx.fillStyle = 'rgba(255, 69, 0, 0.2)';
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
              
              ctx.strokeStyle = '#ff4500';
              ctx.lineWidth = 2;
              ctx.strokeRect(pixelX + 1, pixelY + 1, cellWidth - 2, cellHeight - 2);
            }
          }
          
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
          
          ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
          ctx.beginPath();
          ctx.arc(
            blastX + scaledCellSize / 2, 
            blastY + scaledCellSize / 2, 
            markerSize / 2, 
            0, 
            2 * Math.PI
          );
          ctx.fill();
          
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          if (scaledCellSize > 16) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${scaledCellSize * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', blastX + scaledCellSize / 2, blastY + scaledCellSize / 2);
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
          gradient.addColorStop(0, `rgba(255, 255, 0, ${1 - progress})`);
          gradient.addColorStop(0.5, `rgba(255, 69, 0, ${0.8 - progress})`);
          gradient.addColorStop(1, `rgba(255, 0, 0, ${0.3 - progress})`);
          
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

      // *** NEW: Draw physics debris particles ***
      if (physicsDebris && physicsDebris.length > 0) {
        physicsDebris.forEach(debris => {
          const pos = debris.body.position;
          
          // Draw particle with glow effect
          ctx.save();
          ctx.fillStyle = debris.color;
          ctx.shadowColor = debris.color;
          ctx.shadowBlur = 4;
          
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, debris.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Add inner highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(pos.x - debris.size * 0.2, pos.y - debris.size * 0.2, debris.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        });
      }
      
      setIsCanvasReady(true);
    });
  }, [grid, canvasDimensions, scaleFactor, cellSize, showGrid, showLabels, blastMarkers, explosionAnimations, physicsDebris, hoveredBlock]);

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
        aria-label="Interactive ore grid - click on blocks to apply blast effects"
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