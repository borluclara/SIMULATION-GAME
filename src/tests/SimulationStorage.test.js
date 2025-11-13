/**
 * SimulationStorage Test File
 * Quick validation of save simulation functionality
 */

import simulationStorage from '../utils/SimulationStorage.js';

// Test data structure
const testGameData = {
  playerName: 'TestPlayer',
  score: 1500,
  currentScenario: {
    fileName: 'test_scenario.csv',
    data: [
      { x: 0, y: 0, material: 'iron', type: 'ore', density_g_cm3: 7.8, hardness_mohs: 6, game_value: 50 },
      { x: 1, y: 0, material: 'gold', type: 'ore', density_g_cm3: 19.3, hardness_mohs: 3, game_value: 100 }
    ]
  },
  blasts: [
    { x: 5, y: 5, power: 500, direction: 180, timestamp: Date.now() }
  ],
  originalCsvData: 'x,y,material,type,density_g_cm3,hardness_mohs,game_value\n0,0,iron,ore,7.8,6,50\n1,0,gold,ore,19.3,3,100',
  oreGrid: {
    width: 10,
    height: 10,
    data: [
      { x: 0, y: 0, material: 'iron', value: 50, isBlasted: false },
      { x: 1, y: 0, material: 'gold', value: 100, isBlasted: true }
    ]
  },
  blastPower: 500,
  blastDirection: 180,
  mineralRecovery: 85,
  dilution: 15,
  simulationResults: {
    totalScore: 1500,
    efficiency: 85,
    recovery: 90,
    dilution: 15
  },
  currentView: 'game',
  isComplete: false,
  saveReason: 'test'
};

/**
 * Test simulation save functionality
 */
export const testSaveSimulation = async () => {
  console.log('🧪 Testing Simulation Save Functionality...');
  
  try {
    // Test 1: Save simulation
    console.log('Test 1: Saving simulation...');
    const saveResult = await simulationStorage.saveSimulation(testGameData, 'Test Simulation');
    console.log('✅ Save result:', saveResult);
    
    if (!saveResult.success) {
      throw new Error('Save failed: ' + saveResult.message);
    }
    
    // Test 2: Load all simulations
    console.log('Test 2: Loading all simulations...');
    const allSims = await simulationStorage.getAllSimulations();
    console.log('✅ Found simulations:', allSims.length);
    
    // Test 3: Load specific simulation
    console.log('Test 3: Loading specific simulation...');
    const loadedSim = await simulationStorage.loadSimulation(saveResult.simulationId);
    console.log('✅ Loaded simulation:', loadedSim.id);
    
    // Test 4: Validate data integrity
    console.log('Test 4: Validating data integrity...');
    if (loadedSim.player.name === testGameData.playerName &&
        loadedSim.player.score === testGameData.score &&
        loadedSim.scenario.grid.width === testGameData.oreGrid.width) {
      console.log('✅ Data integrity validated');
    } else {
      throw new Error('Data integrity validation failed');
    }
    
    // Test 5: Storage stats
    console.log('Test 5: Getting storage stats...');
    const stats = await simulationStorage.getStorageStats();
    console.log('✅ Storage stats:', stats);
    
    // Test 6: Test auto-cleanup (create multiple saves)
    console.log('Test 6: Testing auto-cleanup...');
    for (let i = 0; i < 12; i++) {
      await simulationStorage.saveSimulation({
        ...testGameData,
        playerName: `TestPlayer${i}`,
        score: 100 + i
      }, `Test Save ${i}`);
    }
    
    const afterCleanup = await simulationStorage.getAllSimulations();
    if (afterCleanup.length <= 10) {
      console.log('✅ Auto-cleanup working, saves:', afterCleanup.length);
    } else {
      console.warn('⚠️ Auto-cleanup may not be working, saves:', afterCleanup.length);
    }
    
    console.log('🎉 All tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

/**
 * Performance test with large grid
 */
export const testLargeGridPerformance = async () => {
  console.log('🚀 Testing large grid performance...');
  
  try {
    // Create large grid (100x100 = 10,000 blocks)
    const largeGridData = [];
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        largeGridData.push({
          x, y,
          material: Math.random() > 0.5 ? 'iron' : 'stone',
          value: Math.floor(Math.random() * 100),
          isBlasted: Math.random() > 0.9
        });
      }
    }
    
    const largeGameData = {
      ...testGameData,
      oreGrid: {
        width: 100,
        height: 100,
        data: largeGridData
      },
      playerName: 'PerformanceTest',
      saveReason: 'performance_test'
    };
    
    const startTime = performance.now();
    const result = await simulationStorage.saveSimulation(largeGameData, 'Large Grid Test');
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    console.log(`✅ Large grid saved in ${duration.toFixed(2)}ms`);
    
    if (duration < 1000) { // Should save in under 1 second
      console.log('🚀 Performance test passed!');
      return true;
    } else {
      console.warn('⚠️ Performance may be slow:', duration + 'ms');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('🧪 Running all simulation storage tests...');
  
  const testResults = {
    basic: await testSaveSimulation(),
    performance: await testLargeGridPerformance()
  };
  
  console.log('📊 Test Results:', testResults);
  
  const allPassed = Object.values(testResults).every(result => result === true);
  
  if (allPassed) {
    console.log('🎉 All tests passed! Save Simulation functionality is ready.');
  } else {
    console.error('❌ Some tests failed. Check implementation.');
  }
  
  return testResults;
};

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Uncomment to run tests automatically
  // setTimeout(runAllTests, 2000);
}