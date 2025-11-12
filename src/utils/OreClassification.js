/**
 * Ore Classification System
 * Defines all ore types, waste materials, and their properties
 * Used for blast evaluation and scoring calculations
 */

// Ore type constants with material properties
const ORE_TYPES = {
  VALUABLE: {
    gold: { value: 100, density: 19.3, hardness: 3 },
    chalcopyrite: { value: 40, density: 4.2, hardness: 4 },
    hematite: { value: 50, density: 5.3, hardness: 6 },
    magnetite: { value: 45, density: 5.2, hardness: 6 }
  },
  WASTE: {
    granite: { value: 0, density: 2.6, hardness: 0 },
    limestone: { value: 0, density: 2.7, hardness: 3 },
    sandstone: { value: 0, density: 2.5, hardness: 6 },
    basalt: { value: 0, density: 2.9, hardness: 6 },
    soil: { value: 0, density: 1.3, hardness: 1.3 }
  }
};

/**
 * Normalize material name for case-insensitive matching
 * @param {string} materialName - Raw material name
 * @returns {string} - Lowercase, trimmed material name
 */
const normalizeMaterialName = (materialName) => {
  if (typeof materialName !== 'string') {
    return '';
  }
  return materialName.toLowerCase().trim();
};

/**
 * Check if material is a valuable ore
 * @param {string} materialName - Material name to check
 * @returns {boolean} - True if material is in VALUABLE category
 */
export const isOre = (materialName) => {
  const normalized = normalizeMaterialName(materialName);
  return normalized in ORE_TYPES.VALUABLE;
};

/**
 * Check if material is waste
 * @param {string} materialName - Material name to check
 * @returns {boolean} - True if material is in WASTE category
 */
export const isWaste = (materialName) => {
  const normalized = normalizeMaterialName(materialName);
  return normalized in ORE_TYPES.WASTE;
};

/**
 * Get the economic value of a material
 * @param {string} materialName - Material name
 * @returns {number} - Value (0-100), or 0 if not found
 */
export const getOreValue = (materialName) => {
  const normalized = normalizeMaterialName(materialName);
  
  if (normalized in ORE_TYPES.VALUABLE) {
    return ORE_TYPES.VALUABLE[normalized].value;
  }
  
  if (normalized in ORE_TYPES.WASTE) {
    return ORE_TYPES.WASTE[normalized].value;
  }
  
  // Unknown material
  console.warn(`Unknown material type: "${materialName}". Returning value 0.`);
  return 0;
};

/**
 * Get all valuable ore type names
 * @returns {string[]} - Array of ore names ['gold', 'chalcopyrite', 'hematite', 'magnetite']
 */
export const getAllOreTypes = () => {
  return Object.keys(ORE_TYPES.VALUABLE);
};

/**
 * Get all waste material type names
 * @returns {string[]} - Array of waste names ['granite', 'limestone', 'sandstone', 'basalt', 'soil']
 */
export const getAllWasteTypes = () => {
  return Object.keys(ORE_TYPES.WASTE);
};

/**
 * Get complete properties of a material
 * @param {string} materialName - Material name
 * @returns {object|null} - { value, density, hardness } or null if not found
 */
export const getMaterialProperties = (materialName) => {
  const normalized = normalizeMaterialName(materialName);
  
  if (normalized in ORE_TYPES.VALUABLE) {
    return { ...ORE_TYPES.VALUABLE[normalized] };
  }
  
  if (normalized in ORE_TYPES.WASTE) {
    return { ...ORE_TYPES.WASTE[normalized] };
  }
  
  // Unknown material
  console.warn(`Unknown material type: "${materialName}". Returning null.`);
  return null;
};

/**
 * Validate if a material name is recognized
 * @param {string} materialName - Material name to validate
 * @returns {boolean} - True if material exists in classification system
 */
export const isValidMaterial = (materialName) => {
  const normalized = normalizeMaterialName(materialName);
  return normalized in ORE_TYPES.VALUABLE || normalized in ORE_TYPES.WASTE;
};

/**
 * Get category of a material (VALUABLE, WASTE, or UNKNOWN)
 * @param {string} materialName - Material name
 * @returns {string} - 'VALUABLE', 'WASTE', or 'UNKNOWN'
 */
export const getMaterialCategory = (materialName) => {
  const normalized = normalizeMaterialName(materialName);
  
  if (normalized in ORE_TYPES.VALUABLE) {
    return 'VALUABLE';
  }
  
  if (normalized in ORE_TYPES.WASTE) {
    return 'WASTE';
  }
  
  return 'UNKNOWN';
};

/**
 * Get total number of ore types
 * @returns {number} - Count of valuable ore types
 */
export const getOreTypeCount = () => {
  return Object.keys(ORE_TYPES.VALUABLE).length;
};

/**
 * Get total number of waste types
 * @returns {number} - Count of waste material types
 */
export const getWasteTypeCount = () => {
  return Object.keys(ORE_TYPES.WASTE).length;
};

/**
 * Get all materials (ores + waste) as a flat list
 * @returns {string[]} - Array of all material names
 */
export const getAllMaterialTypes = () => {
  return [...getAllOreTypes(), ...getAllWasteTypes()];
};

/**
 * Export ore types constant for direct access if needed
 */
export { ORE_TYPES };

/**
 * Default export with all helper functions
 */
export default {
  ORE_TYPES,
  isOre,
  isWaste,
  getOreValue,
  getAllOreTypes,
  getAllWasteTypes,
  getMaterialProperties,
  isValidMaterial,
  getMaterialCategory,
  getOreTypeCount,
  getWasteTypeCount,
  getAllMaterialTypes
};
