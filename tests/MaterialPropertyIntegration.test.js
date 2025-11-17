/**
 * Material Property Integration Tests
 * Tests that material properties correctly affect blast behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MaterialPropertyHandler } from '../src/utils/MaterialPropertyHandler.js';
import { PhysicsEngine } from '../src/utils/PhysicsEngine.js';

describe('Material Property Integration', () => {
  let materialHandler;
  let physicsEngine;

  beforeEach(() => {
    materialHandler = new MaterialPropertyHandler();
    physicsEngine = new PhysicsEngine();
    physicsEngine.initialize();
  });

  describe('CSV Property Loading', () => {
    it('should load material properties from CSV with all columns', () => {
      const csvContent = `x,y,ore_type,hardness,value,density,fragmentation_index,blast_resistance
0,0,gold,3,100,19.3,0.7,0.3
1,0,limestone,3,0,2.7,0.8,0.3
2,0,granite,6,0,2.6,0.3,0.7`;

      const result = materialHandler.loadFromCSV(csvContent);
      expect(result).toBe(true);

      const goldProps = materialHandler.getMaterialProperties('gold');
      expect(goldProps.density).toBe(19.3);
      expect(goldProps.hardness).toBe(3);
      expect(goldProps.fragmentation_index).toBe(0.7);
      expect(goldProps.blast_resistance).toBe(0.3);

      const graniteProps = materialHandler.getMaterialProperties('granite');
      expect(graniteProps.density).toBe(2.6);
      expect(graniteProps.hardness).toBe(6);
      expect(graniteProps.blast_resistance).toBe(0.7);
    });

    it('should handle CSV with missing optional columns', () => {
      const csvContent = `x,y,ore_type,hardness,value
0,0,iron,6,50
1,0,coal,2,15`;

      const result = materialHandler.loadFromCSV(csvContent);
      expect(result).toBe(true);

      const ironProps = materialHandler.getMaterialProperties('iron');
      expect(ironProps.hardness).toBe(6);
      expect(ironProps.game_value).toBe(50);
      // Should use defaults for missing columns
      expect(ironProps.density).toBeGreaterThan(0);
    });
  });

  describe('Material Displacement Behavior', () => {
    it('should give lighter materials higher displacement', () => {
      const lightMaterial = materialHandler.getMaterialProperties('soil/overburden'); // density ~1.3
      const heavyMaterial = materialHandler.getMaterialProperties('gold'); // density ~19.3

      const lightResistance = materialHandler.getDisplacementResistance('soil/overburden');
      const heavyResistance = materialHandler.getDisplacementResistance('gold');

      // Higher density = more resistance = less displacement
      expect(lightResistance).toBeLessThan(heavyResistance);
      console.log('Light material resistance:', lightResistance);
      console.log('Heavy material resistance:', heavyResistance);
    });

    it('should give softer materials more fragmentation', () => {
      const softMaterial = materialHandler.getFragmentationBehavior('limestone'); // hardness 3
      const hardMaterial = materialHandler.getFragmentationBehavior('diamond'); // hardness 10

      expect(softMaterial.breaksEasily).toBe(true);
      expect(hardMaterial.isHard).toBe(true);
      console.log('Limestone fragmentation:', softMaterial);
      console.log('Diamond fragmentation:', hardMaterial);
    });
  });

  describe('Physics Integration', () => {
    it('should create more particles for fragile materials', () => {
      const fragmentedCount = physicsEngine.getParticleCount('limestone'); // high fragmentation
      const solidCount = physicsEngine.getParticleCount('granite'); // low fragmentation

      expect(fragmentedCount).toBeGreaterThan(solidCount);
      console.log('Limestone particle count:', fragmentedCount);
      console.log('Granite particle count:', solidCount);
    });

    it('should create larger particles for dense materials', () => {
      const lightSize = physicsEngine.getParticleSize('coal'); // low density
      const heavySize = physicsEngine.getParticleSize('gold'); // high density

      expect(heavySize).toBeGreaterThan(lightSize);
      console.log('Coal particle size:', lightSize);
      console.log('Gold particle size:', heavySize);
    });

    it('should calculate different physics densities for different materials', () => {
      const lightDensity = physicsEngine.getMaterialDensity('coal');
      const mediumDensity = physicsEngine.getMaterialDensity('iron');
      const heavyDensity = physicsEngine.getMaterialDensity('gold');

      expect(lightDensity).toBeLessThan(mediumDensity);
      expect(mediumDensity).toBeLessThan(heavyDensity);
      console.log('Coal physics density:', lightDensity);
      console.log('Iron physics density:', mediumDensity);
      console.log('Gold physics density:', heavyDensity);
    });
  });

  describe('Blast Force Calculation', () => {
    it('should apply material coefficients to blast force', () => {
      physicsEngine.initialize();
      
      const blastCenter = { x: 100, y: 100 };
      const targetPos = { x: 150, y: 100 };
      const distance = 50;

      const lightMaterialProps = materialHandler.getMaterialProperties('soil/overburden');
      const heavyMaterialProps = materialHandler.getMaterialProperties('gold');

      const lightForce = physicsEngine.calculateEnhancedBlastForce(
        targetPos.x, 
        targetPos.y, 
        blastCenter, 
        distance, 
        90, // East direction
        lightMaterialProps
      );

      const heavyForce = physicsEngine.calculateEnhancedBlastForce(
        targetPos.x, 
        targetPos.y, 
        blastCenter, 
        distance, 
        90, // East direction
        heavyMaterialProps
      );

      // Light materials should experience more force (less resistance)
      const lightMagnitude = Math.sqrt(lightForce.x ** 2 + lightForce.y ** 2);
      const heavyMagnitude = Math.sqrt(heavyForce.x ** 2 + heavyForce.y ** 2);

      expect(lightMagnitude).toBeGreaterThan(heavyMagnitude);
      console.log('Light material force magnitude:', lightMagnitude);
      console.log('Heavy material force magnitude:', heavyMagnitude);
    });

    it('should apply hardness factor correctly', () => {
      const softMaterialProps = materialHandler.getMaterialProperties('coal'); // hardness 2
      const hardMaterialProps = materialHandler.getMaterialProperties('diamond'); // hardness 10

      const blastCenter = { x: 100, y: 100 };
      const targetPos = { x: 120, y: 100 };
      const distance = 20;

      const softForce = physicsEngine.calculateEnhancedBlastForce(
        targetPos.x, targetPos.y, blastCenter, distance, 90, softMaterialProps
      );
      const hardForce = physicsEngine.calculateEnhancedBlastForce(
        targetPos.x, targetPos.y, blastCenter, distance, 90, hardMaterialProps
      );

      const softMagnitude = Math.sqrt(softForce.x ** 2 + softForce.y ** 2);
      const hardMagnitude = Math.sqrt(hardForce.x ** 2 + hardForce.y ** 2);

      // Softer materials should move more easily
      expect(softMagnitude).toBeGreaterThan(hardMagnitude);
      console.log('Soft material (coal) force:', softMagnitude);
      console.log('Hard material (diamond) force:', hardMagnitude);
    });
  });

  describe('Visual Distinctions', () => {
    it('should provide different textures for different material types', () => {
      const { getMaterialTexture } = await import('../src/utils/MaterialPropertyHandler.js');
      
      const hardTexture = getMaterialTexture('diamond');
      const softTexture = getMaterialTexture('coal');
      const fragmentTexture = getMaterialTexture('limestone');

      expect(hardTexture.hardnessLevel).toBe('very-hard');
      expect(hardTexture.showGloss).toBe(true);

      expect(softTexture.hardnessLevel).toBe('soft');
      
      expect(fragmentTexture.fragmentationLevel).toBe('fragile');
      expect(fragmentTexture.showCracks).toBe(true);
    });

    it('should provide movement behavior indicators', () => {
      const { getMovementBehavior } = await import('../src/utils/MaterialPropertyHandler.js');
      
      const lightMovement = getMovementBehavior('soil/overburden');
      const heavyMovement = getMovementBehavior('gold');

      expect(lightMovement.displacementRange).toBe('far');
      expect(heavyMovement.displacementRange).toBe('minimal');
    });

    it('should use distinct colors for different materials', () => {
      const { getMaterialColor } = await import('../src/utils/MaterialPropertyHandler.js');
      
      const goldColor = getMaterialColor('gold');
      const ironColor = getMaterialColor('iron');
      const coalColor = getMaterialColor('coal');

      expect(goldColor).toBe('#FFD700'); // Gold color
      expect(ironColor).not.toBe(goldColor);
      expect(coalColor).not.toBe(ironColor);
    });
  });

  describe('Material Statistics', () => {
    it('should track loaded materials correctly', () => {
      const stats = materialHandler.getStatistics();

      expect(stats.totalMaterials).toBeGreaterThan(0);
      expect(stats.oreTypes).toBeGreaterThan(0);
      expect(stats.wasteTypes).toBeGreaterThan(0);
      expect(stats.averageDensity).toBeGreaterThan(0);
      expect(stats.averageHardness).toBeGreaterThan(0);

      console.log('Material statistics:', stats);
    });
  });

  describe('Acceptance Criteria Validation', () => {
    it('✅ Each block has material type loaded from CSV', () => {
      const csvContent = `x,y,ore_type,hardness,value,density,fragmentation_index,blast_resistance
0,0,gold,3,100,19.3,0.7,0.3
1,0,iron,6,50,5.3,0.5,0.6`;

      materialHandler.loadFromCSV(csvContent);
      
      const gold = materialHandler.getMaterialProperties('gold');
      const iron = materialHandler.getMaterialProperties('iron');

      expect(gold).toBeDefined();
      expect(iron).toBeDefined();
      expect(gold.density).toBe(19.3);
      expect(iron.density).toBe(5.3);
    });

    it('✅ Displacement results change based on density and hardness', () => {
      const lightProps = materialHandler.getMaterialProperties('coal');
      const heavyProps = materialHandler.getMaterialProperties('gold');

      const blastCenter = { x: 100, y: 100 };
      const distance = 50;

      const lightForce = physicsEngine.calculateEnhancedBlastForce(
        150, 100, blastCenter, distance, 90, lightProps
      );
      const heavyForce = physicsEngine.calculateEnhancedBlastForce(
        150, 100, blastCenter, distance, 90, heavyProps
      );

      const lightMag = Math.sqrt(lightForce.x ** 2 + lightForce.y ** 2);
      const heavyMag = Math.sqrt(heavyForce.x ** 2 + heavyForce.y ** 2);

      expect(lightMag).toBeGreaterThan(heavyMag);
    });

    it('✅ Light materials move farther than dense ones', () => {
      const lightResistance = materialHandler.getDisplacementResistance('soil/overburden');
      const denseResistance = materialHandler.getDisplacementResistance('gold');

      expect(lightResistance).toBeLessThan(denseResistance);
    });

    it('✅ Code is modular - new materials can be added easily', () => {
      // Add a new material to the handler
      materialHandler.materialProperties['testium'] = {
        type: 'ore',
        density: 5.0,
        hardness: 7,
        game_value: 60,
        fragmentation_index: 0.4,
        blast_resistance: 0.5,
        notes: 'Test material'
      };

      const testMaterial = materialHandler.getMaterialProperties('testium');
      expect(testMaterial).toBeDefined();
      expect(testMaterial.density).toBe(5.0);
      
      // Verify it integrates with physics
      const particleSize = physicsEngine.getParticleSize('testium');
      expect(particleSize).toBeGreaterThan(0);
    });

    it('✅ Visual distinction exists for different material types', () => {
      const { getMaterialTexture, getMaterialColor } = await import('../src/utils/MaterialPropertyHandler.js');
      
      const goldTexture = getMaterialTexture('gold');
      const ironTexture = getMaterialTexture('iron');
      const coalTexture = getMaterialTexture('coal');

      // Different materials should have different properties
      expect(goldTexture.densityLevel).not.toBe(coalTexture.densityLevel);
      
      // Colors should be distinct
      const goldColor = getMaterialColor('gold');
      const ironColor = getMaterialColor('iron');
      expect(goldColor).not.toBe(ironColor);
    });
  });
});
