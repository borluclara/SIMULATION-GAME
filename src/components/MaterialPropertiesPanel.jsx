import React from 'react';
import './MaterialPropertiesPanel.css';
import { materialPropertyHandler } from '../utils/MaterialPropertyHandler';

const MaterialPropertiesPanel = ({ hoveredMaterial, className = '' }) => {
  if (!hoveredMaterial) {
    return (
      <div className={`material-properties-panel ${className}`}>
        <h3>Material Properties</h3>
        <p className="no-material">Hover over a block to see its material properties</p>
      </div>
    );
  }

  const properties = materialPropertyHandler.getMaterialProperties(hoveredMaterial);
  
  const formatValue = (value, unit, decimals = 1) => {
    if (typeof value === 'number') {
      return `${value.toFixed(decimals)}${unit}`;
    }
    return `${value}${unit}`;
  };

  const getPropertyDescription = (property) => {
    const descriptions = {
      density: 'Mass per unit volume',
      hardness: 'Mohs scale (1-10)',
      game_value: 'Economic value in game',
      fragmentation_index: 'How easily it breaks (0-1)',
      blast_resistance: 'Resistance to damage (0-1)',
      type: 'Material classification'
    };
    return descriptions[property] || '';
  };

  const renderMaterialCard = () => {
    return (
      <div className="material-card">
        <div className="material-header">
          <h4 className="material-name">{hoveredMaterial}</h4>
          <span className={`material-type type-${properties.type}`}>
            {properties.type}
          </span>
        </div>
        
        <div className="properties-grid">
          <div className="property-item">
            <span className="property-label">Density</span>
            <span className="property-value">{formatValue(properties.density, ' g/cm³', 1)}</span>
            <span className="property-desc">{getPropertyDescription('density')}</span>
          </div>
          
          <div className="property-item">
            <span className="property-label">Hardness</span>
            <span className="property-value">{properties.hardness}</span>
            <span className="property-desc">{getPropertyDescription('hardness')}</span>
          </div>
          
          <div className="property-item">
            <span className="property-label">Game Value</span>
            <span className="property-value">${properties.game_value}</span>
            <span className="property-desc">{getPropertyDescription('game_value')}</span>
          </div>
          
          <div className="property-item">
            <span className="property-label">Fragmentation</span>
            <span className="property-value">{formatValue(properties.fragmentation_index, '', 2)}</span>
            <span className="property-desc">{getPropertyDescription('fragmentation_index')}</span>
          </div>
          
          <div className="property-item">
            <span className="property-label">Blast Resistance</span>
            <span className="property-value">{formatValue(properties.blast_resistance, '', 2)}</span>
            <span className="property-desc">{getPropertyDescription('blast_resistance')}</span>
          </div>
        </div>
        
        {properties.notes && (
          <div className="material-notes">
            <span className="notes-label">Notes:</span>
            <p>{properties.notes}</p>
          </div>
        )}
        
        <div className="source-indicator">
          <small>
            {materialPropertyHandler.loadedFromCSV ? 
              'Properties loaded from CSV' : 
              'Default material properties'
            }
          </small>
        </div>
      </div>
    );
  };

  return (
    <div className={`material-properties-panel ${className}`}>
      <h3>Material Properties</h3>
      {renderMaterialCard()}
    </div>
  );
};

export default MaterialPropertiesPanel;