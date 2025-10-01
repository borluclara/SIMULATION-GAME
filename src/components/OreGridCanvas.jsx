/**
 * OreGrid Canvas Component
 * Renders the 2D ore grid on HTML5 Canvas with automatic resizing and refresh capabilities
 * Meets all acceptance criteria for canvas grid display
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import './OreGridCanvas.css';

const OreGridCanvas = ({ 
  grid, 
  onBlockClick = null,
  cellSize = 30,
  showGrid = true,
  showLabels = false,
  className = '',
  forceRefresh = 0 // Prop to force canvas refresh when CSV is uploaded
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Calculate optimal canvas size and scaling with enhanced responsiveness
  const calculateCanvasSize = useCallback(() => {
    if (!grid || !containerRef.current) return { width: 0, height: 0, scale: 1 };

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Ensure minimum container size
    const minWidth = Math.max(containerWidth, 300);
    const minHeight = Math.max(containerHeight, 200);
    
    // Calculate grid size in pixels
    const gridPixelWidth = grid.width * cellSize;
    const gridPixelHeight = grid.height * cellSize;
    
    // Calculate scale to fit container while maintaining aspect ratio
    const scaleX = minWidth / gridPixelWidth;
    const scaleY = minHeight / gridPixelHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Allow scaling up to 2x for small grids
    
    // Ensure minimum cell size visibility
    const minCellSize = 8;
    const adjustedScale = Math.max(scale, minCellSize / cellSize);
    
    const finalWidth = Math.floor(gridPixelWidth * adjustedScale);
    const finalHeight = Math.floor(gridPixelHeight * adjustedScale);
    
    return {
      width: finalWidth,
      height: finalHeight,
      scale: adjustedScale
    };
  }, [grid, cellSize]);

  // Update canvas dimensions when grid, container, or forceRefresh changes
  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      
      const dimensions = calculateCanvasSize();
      setCanvasDimensions({ width: dimensions.width, height: dimensions.height });
      setScaleFactor(dimensions.scale);
    };

    // Initial dimension calculation
    updateDimensions();
    
    // Enhanced resize listener with throttling
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 150); // Throttle resize events
    };
    
    // Add resize observer for better responsiveness
    let resizeObserver;
    if (window.ResizeObserver && containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }
    
    // Fallback resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [calculateCanvasSize, forceRefresh]);

  // Enhanced grid rendering with improved canvas creation and refresh functionality
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

      // Set canvas size with proper DPI scaling
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Clear canvas with dark background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // Enable anti-aliasing for smoother rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw grid cells with enhanced color coding
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const block = grid.getBlockAtGridPos(x, y);
          
          const pixelX = Math.floor(x * scaledCellSize);
          const pixelY = Math.floor(y * scaledCellSize);
          const cellWidth = Math.ceil(scaledCellSize);
          const cellHeight = Math.ceil(scaledCellSize);
          
          if (block) {
            // Draw ore block with enhanced color coding
            ctx.fillStyle = block.getColor();
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            
            // Add subtle gradient for depth
            const gradient = ctx.createLinearGradient(pixelX, pixelY, pixelX + cellWidth, pixelY + cellHeight);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = gradient;
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            
            // Add damage overlay for damaged blocks
            if (block.damage > 0 && !block.isDestroyed) {
              const damageIntensity = (block.damage / block.maxHealth) * 0.4;
              ctx.fillStyle = `rgba(255, 100, 100, ${damageIntensity})`;
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            }
            
            // Add destroyed overlay with animation effect
            if (block.isDestroyed) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
              ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
              
              // Draw X for destroyed blocks with better visibility
              ctx.strokeStyle = '#ff4444';
              ctx.lineWidth = Math.max(1, scaledCellSize / 15);
              ctx.lineCap = 'round';
              ctx.beginPath();
              const margin = cellWidth * 0.2;
              ctx.moveTo(pixelX + margin, pixelY + margin);
              ctx.lineTo(pixelX + cellWidth - margin, pixelY + cellHeight - margin);
              ctx.moveTo(pixelX + cellWidth - margin, pixelY + margin);
              ctx.lineTo(pixelX + margin, pixelY + cellHeight - margin);
              ctx.stroke();
            }
            
            // Draw ore type labels with better readability
            if (showLabels && scaledCellSize > 16) {
              const fontSize = Math.max(8, scaledCellSize / 3.5);
              ctx.font = `bold ${fontSize}px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // Add text shadow for better readability
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              const textX = pixelX + cellWidth / 2;
              const textY = pixelY + cellHeight / 2;
              const text = block.oreType.charAt(0).toUpperCase();
              ctx.fillText(text, textX + 1, textY + 1);
              
              ctx.fillStyle = '#ffffff';
              ctx.fillText(text, textX, textY);
            }
          } else {
            // Draw empty cell with subtle pattern
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            
            // Add subtle dot pattern for empty cells
            if (scaledCellSize > 10) {
              ctx.fillStyle = '#3a3a3a';
              const dotSize = Math.max(1, scaledCellSize / 10);
              const centerX = pixelX + cellWidth / 2;
              const centerY = pixelY + cellHeight / 2;
              ctx.fillRect(centerX - dotSize/2, centerY - dotSize/2, dotSize, dotSize);
            }
          }
          
          // Draw grid lines with enhanced visibility
          if (showGrid && scaledCellSize > 8) {
            ctx.strokeStyle = block ? '#666666' : '#444444';
            ctx.lineWidth = scaledCellSize > 20 ? 1 : 0.5;
            ctx.strokeRect(pixelX + 0.5, pixelY + 0.5, cellWidth - 1, cellHeight - 1);
          }
        }
      }
      
      setIsCanvasReady(true);
    });
  }, [grid, canvasDimensions, scaleFactor, cellSize, showGrid, showLabels, forceRefresh]);

  // Render grid when dependencies change
  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  // Handle mouse interactions
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
      return {
        block,
        gridX,
        gridY,
        mouseX,
        mouseY
      };
    }
    
    return null;
  };

  const handleMouseMove = (event) => {
    const result = getBlockFromMouseEvent(event);
    if (result && result.block) {
      setHoveredBlock({
        ...result.block,
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
    if (result && result.block && onBlockClick) {
      onBlockClick(result.block, { x: result.gridX, y: result.gridY });
      // Re-render after click to show changes
      setTimeout(renderGrid, 50);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`ore-grid-canvas-container ${className} ${!isCanvasReady ? 'loading' : ''}`}
    >
      {/* Canvas element with enhanced attributes */}
      <canvas
        ref={canvasRef}
        className="ore-grid-canvas"
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
      
      {/* Loading indicator for canvas initialization */}
      {!isCanvasReady && canvasDimensions.width === 0 && (
        <div className="canvas-loading">
          <div className="loading-spinner"></div>
          <span>Initializing canvas...</span>
        </div>
      )}
      
      {/* Grid info overlay */}
      {isCanvasReady && grid && (
        <div className="canvas-info">
          <span className="grid-size">{grid.width} × {grid.height}</span>
          <span className="zoom-level">Zoom: {Math.round(scaleFactor * 100)}%</span>
        </div>
      )}
      
      {/* Hover tooltip */}
      {hoveredBlock && (
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
            {hoveredBlock.isDestroyed && (
              <div className="tooltip-status destroyed">DESTROYED</div>
            )}
            {hoveredBlock.damage > 0 && !hoveredBlock.isDestroyed && (
              <div className="tooltip-damage">Damage: {hoveredBlock.damage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OreGridCanvas;