/**
 * OreGrid Visualizer Component
 * Renders the 2D ore grid on a canvas
 */

import React, { useEffect, useRef, useState } from 'react';
import './OreGridCanvas.css';

const OreGridCanvas = ({ 
  grid, 
  onBlockClick = null,
  cellSize = 30,
  showGrid = true,
  showLabels = false 
}) => {
  const canvasRef = useRef(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Calculate canvas size based on grid
  useEffect(() => {
    if (grid) {
      const width = grid.width * cellSize;
      const height = grid.height * cellSize;
      setCanvasDimensions({ width, height });
    }
  }, [grid, cellSize]);

  // Render the grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDimensions;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid cells
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const block = grid.getBlockAtGridPos(x, y);
        if (!block) continue;

        const pixelX = x * cellSize;
        const pixelY = y * cellSize;

        // Get visual state
        const visual = block.getVisualState();

        // Draw block
        ctx.fillStyle = visual.color;
        ctx.globalAlpha = visual.opacity;
        ctx.fillRect(pixelX, pixelY, cellSize, cellSize);

        // Draw damage overlay if block is damaged
        if (!block.isDestroyed && block.health < block.maxHealth) {
          const damageOpacity = 1 - (block.health / block.maxHealth);
          ctx.globalAlpha = damageOpacity * 0.5;
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(pixelX, pixelY, cellSize, cellSize);
        }

        ctx.globalAlpha = 1;

        // Draw grid lines
        if (showGrid) {
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
        }

        // Draw labels (ore type first letter)
        if (showLabels && cellSize >= 20) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.floor(cellSize * 0.4)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const label = block.oreType.charAt(0).toUpperCase();
          if (!block.isDestroyed) {
            ctx.fillText(
              label, 
              pixelX + cellSize / 2, 
              pixelY + cellSize / 2
            );
          }
        }

        // Highlight hovered block
        if (hoveredBlock && hoveredBlock.x === block.x && hoveredBlock.y === block.y) {
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(pixelX, pixelY, cellSize, cellSize);
        }
      }
    }
  }, [grid, canvasDimensions, cellSize, showGrid, showLabels, hoveredBlock]);

  // Handle mouse events
  const handleMouseMove = (event) => {
    if (!grid) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);

    const block = grid.getBlockAtGridPos(gridX, gridY);
    setHoveredBlock(block);
  };

  const handleMouseLeave = () => {
    setHoveredBlock(null);
  };

  const handleClick = (event) => {
    if (!grid || !onBlockClick) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);

    const block = grid.getBlockAtGridPos(gridX, gridY);
    if (block) {
      onBlockClick(block, { gridX, gridY, pixelX: x, pixelY: y });
    }
  };

  if (!grid) {
    return (
      <div className="ore-grid-placeholder">
        <p>No grid data loaded</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          width: canvasDimensions.width,
          height: canvasDimensions.height
        }}
      />
      
      {/* Block info tooltip */}
      {hoveredBlock && (
        <div className="absolute pointer-events-none z-10 bg-black/80 text-white text-xs px-2 py-1 rounded border border-white/20">
          <div className="font-medium">{hoveredBlock.oreType}</div>
          <div className="text-white/80">
            Position: ({hoveredBlock.x}, {hoveredBlock.y})
          </div>
          <div className="text-white/80">
            Health: {hoveredBlock.health}/{hoveredBlock.maxHealth} | Value: {hoveredBlock.value}
          </div>
          {hoveredBlock.isDestroyed && <span className="text-red-400 font-medium">DESTROYED</span>}
        </div>
      )}
    </div>
  );
};

export default OreGridCanvas;