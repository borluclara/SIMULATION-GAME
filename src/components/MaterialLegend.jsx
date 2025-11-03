import React, { useMemo } from 'react';
import './MaterialLegend.css';

const MaterialLegend = ({ grid }) => {
  // Extract unique materials from the grid
  const materials = useMemo(() => {
    if (!grid) {
      console.log('MaterialLegend: No grid provided');
      return [];
    }
    
    console.log('MaterialLegend: Processing grid', { width: grid.width, height: grid.height });
    
    const materialMap = new Map();
    
    // Scan through the grid to find all unique materials
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const block = grid.getBlockAtGridPos(x, y);
        if (block && !block.isDestroyed) {
          const materialName = block.oreType;
          if (!materialMap.has(materialName)) {
            materialMap.set(materialName, block.getColor());
          }
        }
      }
    }
    
    console.log('MaterialLegend: Found materials', Array.from(materialMap.keys()));
    
    // Convert to array and sort alphabetically
    const materialsArray = Array.from(materialMap.entries())
      .map(([name, color]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        color: color
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('MaterialLegend: Processed materials', materialsArray);
    return materialsArray;
  }, [grid]);

  // Don't render if no grid or no materials
  if (!grid) {
    console.log('MaterialLegend: Not rendering - no grid');
    return null;
  }
  
  if (materials.length === 0) {
    console.log('MaterialLegend: Not rendering - no materials found');
    return null;
  }

  console.log('MaterialLegend: Rendering with', materials.length, 'materials');

  return (
    <div className="material-legend">
      <div className="legend-title">Materials</div>
      <div className="legend-items">
        {materials.map((material) => (
          <div key={material.name} className="legend-item">
            <div 
              className="legend-color-box" 
              style={{ backgroundColor: material.color }}
            ></div>
            <span className="legend-label">{material.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MaterialLegend;
