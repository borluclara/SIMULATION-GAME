/**
 * Material Property Handler
 * Manages material properties for ore blocks including density, hardness, fragmentation index, etc.
 * Based on realistic geological material properties
 */

/**
 * Default material properties based on geological data
 * Properties include: density (g/cm³), hardness (Mohs scale), game value, fragmentation_index (0-1), blast_resistance (0-1)
 */
export const DEFAULT_MATERIAL_PROPERTIES = {
  // Precious metals and ores
  gold: {
    type: 'ore',
    density: 19.3,
    hardness: 3,
    game_value: 100,
    fragmentation_index: 0.7,
    blast_resistance: 0.3,
    notes: 'Very dense, soft; moves less but high value.'
  },
  
  chalcopyrite: {
    type: 'ore',
    density: 4.2,
    hardness: 4,
    game_value: 40,
    fragmentation_index: 0.6,
    blast_resistance: 0.4,
    notes: 'Copper ore; medium density & value.'
  },
  
  hematite: {
    type: 'ore',
    density: 5.3,
    hardness: 6,
    game_value: 50,
    fragmentation_index: 0.5,
    blast_resistance: 0.6,
    notes: 'Iron ore; dense, moderate value.'
  },
  
  magnetite: {
    type: 'ore',
    density: 5.2,
    hardness: 6,
    game_value: 45,
    fragmentation_index: 0.5,
    blast_resistance: 0.6,
    notes: 'Another iron ore; magnetic, similar to hematite.'
  },
  
  // Waste materials and host rocks
  granite: {
    type: 'waste',
    density: 2.6,
    hardness: 6,
    game_value: 0,
    fragmentation_index: 0.3,
    blast_resistance: 0.7,
    notes: 'Hard igneous host rock; resists fragmentation'
  },
  
  limestone: {
    type: 'waste',
    density: 2.7,
    hardness: 3,
    game_value: 0,
    fragmentation_index: 0.8,
    blast_resistance: 0.3,
    notes: 'Softer carbonate rock; moves easier'
  },
  
  sandstone: {
    type: 'waste',
    density: 2.5,
    hardness: 6,
    game_value: 0,
    fragmentation_index: 0.6,
    blast_resistance: 0.4,
    notes: 'Sedimentary; weaker, porous'
  },
  
  basalt: {
    type: 'waste',
    density: 2.9,
    hardness: 6,
    game_value: 0,
    fragmentation_index: 0.4,
    blast_resistance: 0.6,
    notes: 'Dense volcanic host rock; tough but movable'
  },
  
  'soil/overburden': {
    type: 'waste',
    density: 1.3,
    hardness: 1,
    game_value: 0,
    fragmentation_index: 1.0,
    blast_resistance: 0.1,
    notes: 'Loose surface material; flies everywhere'
  },
  
  // Common ore types for backward compatibility
  stone: {
    type: 'waste',
    density: 2.6,
    hardness: 6,
    game_value: 0,
    fragmentation_index: 0.4,
    blast_resistance: 0.5,
    notes: 'Generic rock material'
  },
  
  coal: {
    type: 'ore',
    density: 1.3,
    hardness: 2,
    game_value: 15,
    fragmentation_index: 0.8,
    blast_resistance: 0.2,
    notes: 'Light, soft coal'
  },
  
  iron: {
    type: 'ore',
    density: 5.3,
    hardness: 6,
    game_value: 50,
    fragmentation_index: 0.5,
    blast_resistance: 0.6,
    notes: 'Iron ore (hematite)'
  },
  
  copper: {
    type: 'ore',
    density: 4.2,
    hardness: 4,
    game_value: 40,
    fragmentation_index: 0.6,
    blast_resistance: 0.4,
    notes: 'Copper ore (chalcopyrite)'
  },
  
  diamond: {
    type: 'ore',
    density: 3.5,
    hardness: 10,
    game_value: 200,
    fragmentation_index: 0.2,
    blast_resistance: 0.9,
    notes: 'Extremely hard, high value'
  },
  
  silver: {
    type: 'ore',
    density: 10.5,
    hardness: 3,
    game_value: 75,
    fragmentation_index: 0.6,
    blast_resistance: 0.4,
    notes: 'Dense precious metal'
  }
};

/**
 * Material Property Handler Class
 * Manages loading, validation, and access to material properties
 */
export class MaterialPropertyHandler {
  constructor() {
    this.materialProperties = { ...DEFAULT_MATERIAL_PROPERTIES };
    this.csvColumns = [];
    this.loadedFromCSV = false;
  }

  /**
   * Load material properties from CSV data
   * Supports flexible column detection for existing CSV formats
   */
  loadFromCSV(csvContent) {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      console.log('CSV Headers detected:', headers);
      
      // Find material/ore column
      const materialIndex = headers.findIndex(h => 
        h.includes('ore') || h.includes('material') || h.includes('type')
      );
      
      if (materialIndex === -1) {
        console.warn('No material/ore column found in CSV');
        return false;
      }

      // Find property columns
      const densityIndex = headers.findIndex(h => h.includes('density'));
      const hardnessIndex = headers.findIndex(h => h.includes('hardness'));
      const valueIndex = headers.findIndex(h => h.includes('value') || h.includes('game_value'));
      const fragmentationIndex = headers.findIndex(h => h.includes('fragmentation'));
      const blastResistanceIndex = headers.findIndex(h => h.includes('blast_resistance'));

      this.csvColumns = {
        material: materialIndex,
        density: densityIndex,
        hardness: hardnessIndex,
        value: valueIndex,
        fragmentation_index: fragmentationIndex,
        blast_resistance: blastResistanceIndex
      };

      console.log('Column mapping:', this.csvColumns);

      // Parse data rows and update material properties
      const updatedMaterials = new Set();
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < 3) continue;

        const materialName = row[materialIndex]?.toLowerCase();
        if (!materialName) continue;

        // Get or create material properties
        if (!this.materialProperties[materialName]) {
          this.materialProperties[materialName] = {
            type: 'unknown',
            density: 2.7,
            hardness: 5,
            game_value: 10,
            fragmentation_index: 0.5,
            blast_resistance: 0.5,
            notes: 'Loaded from CSV'
          };
        }

        const material = this.materialProperties[materialName];

        // Update properties if columns exist
        if (densityIndex !== -1 && row[densityIndex]) {
          const density = parseFloat(row[densityIndex]);
          if (!isNaN(density) && density > 0) {
            material.density = density;
          }
        }

        if (hardnessIndex !== -1 && row[hardnessIndex]) {
          const hardness = parseInt(row[hardnessIndex]);
          if (!isNaN(hardness) && hardness >= 0 && hardness <= 10) {
            material.hardness = hardness;
          }
        }

        if (valueIndex !== -1 && row[valueIndex]) {
          const value = parseInt(row[valueIndex]);
          if (!isNaN(value) && value >= 0) {
            material.game_value = value;
          }
        }

        if (fragmentationIndex !== -1 && row[fragmentationIndex]) {
          const fragmentation = parseFloat(row[fragmentationIndex]);
          if (!isNaN(fragmentation) && fragmentation >= 0 && fragmentation <= 1) {
            material.fragmentation_index = fragmentation;
          }
        }

        if (blastResistanceIndex !== -1 && row[blastResistanceIndex]) {
          const resistance = parseFloat(row[blastResistanceIndex]);
          if (!isNaN(resistance) && resistance >= 0 && resistance <= 1) {
            material.blast_resistance = resistance;
          }
        }

        updatedMaterials.add(materialName);
      }

      this.loadedFromCSV = true;
      console.log(`Material properties updated for: ${Array.from(updatedMaterials).join(', ')}`);
      console.log('Current material properties:', this.materialProperties);
      
      return true;
    } catch (error) {
      console.error('Error loading material properties from CSV:', error);
      return false;
    }
  }

  /**
   * Get material properties for a given material name
   */
  getMaterialProperties(materialName) {
    const normalizedName = materialName?.toLowerCase();
    const properties = this.materialProperties[normalizedName];
    
    if (!properties) {
      console.warn(`Unknown material: ${materialName}, using default properties`);
      return this.getDefaultProperties();
    }
    
    return { ...properties };
  }

  /**
   * Get default properties for unknown materials
   */
  getDefaultProperties() {
    return {
      type: 'unknown',
      density: 2.7,
      hardness: 5,
      game_value: 10,
      fragmentation_index: 0.5,
      blast_resistance: 0.5,
      notes: 'Default material properties'
    };
  }

  /**
   * Check if a material has properties defined
   */
  hasMaterial(materialName) {
    const normalizedName = materialName?.toLowerCase();
    return this.materialProperties.hasOwnProperty(normalizedName);
  }

  /**
   * Get all available materials
   */
  getAllMaterials() {
    return Object.keys(this.materialProperties);
  }

  /**
   * Calculate blast effectiveness against a material
   */
  calculateBlastEffectiveness(materialName, baseDamage) {
    const properties = this.getMaterialProperties(materialName);
    const resistance = properties.blast_resistance || 0.5;
    
    // Blast effectiveness is reduced by material resistance
    const effectiveness = baseDamage * (1 - resistance * 0.7); // Max 70% damage reduction
    return Math.max(effectiveness, baseDamage * 0.1); // Minimum 10% damage gets through
  }

  /**
   * Calculate displacement resistance for physics calculations
   */
  getDisplacementResistance(materialName) {
    const properties = this.getMaterialProperties(materialName);
    const density = properties.density || 2.7;
    
    // Higher density = more resistance to displacement
    // Scale density (1-20 g/cm³) to resistance factor (0.2-1.0)
    const normalizedDensity = Math.min(20, Math.max(1, density));
    const resistance = 0.2 + (normalizedDensity - 1) * (0.8 / 19);
    
    return Math.min(1.0, resistance);
  }

  /**
   * Get fragmentation behavior for a material
   */
  getFragmentationBehavior(materialName) {
    const properties = this.getMaterialProperties(materialName);
    return {
      fragmentationIndex: properties.fragmentation_index || 0.5,
      hardness: properties.hardness || 5,
      breaksEasily: (properties.fragmentation_index || 0.5) > 0.7,
      isHard: (properties.hardness || 5) > 7
    };
  }

  /**
   * Validate material property values
   */
  validateProperties(properties) {
    const errors = [];
    
    if (properties.density !== undefined) {
      if (typeof properties.density !== 'number' || properties.density <= 0 || properties.density > 25) {
        errors.push('Density must be a positive number ≤ 25 g/cm³');
      }
    }
    
    if (properties.hardness !== undefined) {
      if (!Number.isInteger(properties.hardness) || properties.hardness < 0 || properties.hardness > 10) {
        errors.push('Hardness must be an integer between 0-10 (Mohs scale)');
      }
    }
    
    if (properties.fragmentation_index !== undefined) {
      if (typeof properties.fragmentation_index !== 'number' || properties.fragmentation_index < 0 || properties.fragmentation_index > 1) {
        errors.push('Fragmentation index must be a number between 0-1');
      }
    }
    
    if (properties.blast_resistance !== undefined) {
      if (typeof properties.blast_resistance !== 'number' || properties.blast_resistance < 0 || properties.blast_resistance > 1) {
        errors.push('Blast resistance must be a number between 0-1');
      }
    }
    
    return errors;
  }

  /**
   * Export current material properties as CSV
   */
  exportToCSV() {
    const headers = ['material', 'type', 'density', 'hardness', 'game_value', 'fragmentation_index', 'blast_resistance', 'notes'];
    const rows = [headers.join(',')];
    
    Object.entries(this.materialProperties).forEach(([name, props]) => {
      const row = [
        name,
        props.type || 'unknown',
        props.density || 2.7,
        props.hardness || 5,
        props.game_value || 10,
        props.fragmentation_index || 0.5,
        props.blast_resistance || 0.5,
        `"${props.notes || 'No description'}"`
      ];
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  }

  /**
   * Reset to default properties
   */
  reset() {
    this.materialProperties = { ...DEFAULT_MATERIAL_PROPERTIES };
    this.csvColumns = [];
    this.loadedFromCSV = false;
  }

  /**
   * Get summary statistics
   */
  getStatistics() {
    const materials = Object.values(this.materialProperties);
    const oreCount = materials.filter(m => m.type === 'ore').length;
    const wasteCount = materials.filter(m => m.type === 'waste').length;
    
    const densities = materials.map(m => m.density).filter(d => d);
    const avgDensity = densities.length > 0 ? densities.reduce((a, b) => a + b, 0) / densities.length : 0;
    
    const hardnesses = materials.map(m => m.hardness).filter(h => h !== undefined);
    const avgHardness = hardnesses.length > 0 ? hardnesses.reduce((a, b) => a + b, 0) / hardnesses.length : 0;
    
    return {
      totalMaterials: materials.length,
      oreTypes: oreCount,
      wasteTypes: wasteCount,
      averageDensity: Math.round(avgDensity * 100) / 100,
      averageHardness: Math.round(avgHardness * 10) / 10,
      loadedFromCSV: this.loadedFromCSV
    };
  }
}

// Create and export a singleton instance
export const materialPropertyHandler = new MaterialPropertyHandler();

// Export utility functions
export function getMaterialColor(materialName, damage = 0, maxHealth = 100) {
  // Always return stable material color; ignore damage for visual consistency
  const props = materialPropertyHandler.getMaterialProperties(materialName);
  return getEnhancedMaterialColor(materialName, props);
}

/**
 * Enhanced material color system with visual distinctions
 */
function getEnhancedMaterialColor(materialName, props) {
  const normalizedName = materialName?.toLowerCase();
  
  // Specific material colors for easy identification
  const specificColors = {
    // Precious metals - Distinctive metallics
    'gold': '#FFD700',           // Bright gold
    'silver': '#C0C0C0',         // Silver
    'platinum': '#E5E4E2',       // Platinum
    
    // Base metals - Warm tones
    'iron': '#8B7355',           // Iron brown
    'hematite': '#CD853F',       // Iron ore - peru
    'magnetite': '#A0522D',      // Magnetic iron - sienna
    'copper': '#D2691E',         // Copper orange
    'chalcopyrite': '#DAA520',   // Copper ore - goldenrod
    
    // Coal and carbon - Dark tones
    'coal': '#2F2F2F',           // Very dark gray
    'graphite': '#36454F',       // Charcoal
    
    // Precious stones - Vibrant colors
    'diamond': '#B9F2FF',        // Ice blue
    'emerald': '#50C878',        // Emerald green
    'ruby': '#E0115F',           // Ruby red
    
    // Hard rocks - Gray tones with texture indication
    'granite': '#708090',        // Slate gray
    'basalt': '#36454F',         // Dark charcoal
    'quartzite': '#F5F5DC',      // Beige
    
    // Sedimentary rocks - Earth tones
    'limestone': '#F5F5DC',      // Beige
    'sandstone': '#F4A460',      // Sandy brown
    'shale': '#8FBC8F',          // Dark sea green
    
    // Soft materials - Light, distinct colors
    'soil/overburden': '#DEB887', // Burlywood
    'clay': '#CD853F',           // Peru
    'sand': '#F4A460'            // Sandy brown
  };
  
  // Return specific color if available
  if (specificColors[normalizedName]) {
    return specificColors[normalizedName];
  }
  
  // Property-based color assignment for unknown materials
  if (props.type === 'ore') {
    // Ore colors based on value and density
    const value = props.game_value || 0;
    const density = props.density || 2.7;
    
    if (value >= 100) {
      return '#FFD700'; // Gold color for high value
    } else if (value >= 50) {
      return density > 8 ? '#CD853F' : '#DAA520'; // Bronze/goldenrod based on density
    } else if (value >= 25) {
      return '#D2691E'; // Copper for moderate value
    } else {
      return '#8B7355'; // Brown for low value ore
    }
  } else if (props.type === 'waste') {
    // Waste rock colors based on hardness and density
    const hardness = props.hardness || 5;
    const density = props.density || 2.7;
    
    if (hardness >= 8) {
      return density > 3 ? '#708090' : '#A9A9A9'; // Hard rock - slate or gray
    } else if (hardness >= 5) {
      return density > 3 ? '#8B4513' : '#CD853F'; // Medium rock - browns
    } else if (hardness >= 3) {
      return '#F4A460'; // Soft rock - sandy brown
    } else {
      return '#DEB887'; // Very soft - burlywood
    }
  }
  
  // Default fallback
  return '#8B7355';
}

/**
 * Get visual texture/pattern indicator based on material properties
 */
export function getMaterialTexture(materialName) {
  const props = materialPropertyHandler.getMaterialProperties(materialName);
  const hardness = props.hardness || 5;
  const fragmentationIndex = props.fragmentation_index || 0.5;
  const density = props.density || 2.7;
  
  return {
    // Visual indicators for rendering
    hardnessLevel: hardness >= 8 ? 'very-hard' : hardness >= 6 ? 'hard' : hardness >= 4 ? 'medium' : 'soft',
    fragmentationLevel: fragmentationIndex >= 0.8 ? 'very-fragile' : fragmentationIndex >= 0.6 ? 'fragile' : 'stable',
    densityLevel: density >= 15 ? 'very-dense' : density >= 8 ? 'dense' : density >= 4 ? 'medium' : 'light',
    
    // Visual effects
    showSparkles: props.type === 'ore' && props.game_value >= 50, // Valuable ores sparkle
    showCracks: fragmentationIndex >= 0.7, // Fragile materials show cracks
    showGloss: hardness >= 8, // Hard materials are glossy
    showGrain: hardness <= 3 && props.type === 'waste' // Soft waste shows grain texture
  };
}

/**
 * Get movement behavior indicator for visual feedback
 */
export function getMovementBehavior(materialName) {
  const props = materialPropertyHandler.getMaterialProperties(materialName);
  const density = props.density || 2.7;
  const hardness = props.hardness || 5;
  const fragmentationIndex = props.fragmentation_index || 0.5;
  
  return {
    // Expected movement characteristics
    displacementRange: density < 2 ? 'far' : density < 5 ? 'medium' : density < 10 ? 'close' : 'minimal',
    fragmentationBehavior: fragmentationIndex >= 0.8 ? 'shatters' : fragmentationIndex >= 0.6 ? 'breaks' : 'chunks',
    resistanceLevel: hardness >= 8 ? 'very-resistant' : hardness >= 6 ? 'resistant' : 'yielding',
    
    // Visual feedback colors
    movementColor: density < 2 ? '#90EE90' : density < 5 ? '#FFD700' : density < 10 ? '#FFA500' : '#FF6347',
    resistanceColor: hardness >= 8 ? '#FF0000' : hardness >= 6 ? '#FFA500' : '#00FF00'
  };
}

function adjustColorBrightness(hex, factor) {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const amt = Math.round(2.55 * factor * 100);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}