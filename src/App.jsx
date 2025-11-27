import React, { useState, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import './components/app.css'
import GridManager from './components/GridManager'
import OreGrid from './components/OreGrid'
import OreGridCanvas from './components/OreGridCanvas'
import CSVErrorUI from './components/csvErrorUI'
import BlastToolPanel from './components/BlastToolPanel'
import BlastPlacementPanel from './components/BlastPlacementPanel'
import BlastSummaryPanel from './components/BlastSummaryPanel'
import ScoreFeedback from './components/ScoreFeedback'
import BlastFeedback from './components/BlastFeedback'
import MaterialLegend from './components/MaterialLegend'
import SaveLoadPanel from './components/SaveLoadPanel'
import SaveToast from './components/SaveToast'
import { parseCSVToGrid, OreGrid as OreGridClass, OreBlock } from './utils/OreGrid'
import { useGameState } from './hooks/useGameState'
import { physicsEngine } from './utils/PhysicsEngine'
import { blastAnimationEngine } from './utils/BlastAnimationEngine'
import { materialPropertyHandler } from './utils/MaterialPropertyHandler'
import blastHistoryStore from './utils/BlastHistoryStore'
import simulationStorage from './utils/SimulationStorage'
import { isOre, normalizeMaterialName, getOreValue } from './utils/OreClassification'

function App() {
  // Use global game state instead of individual state variables
  const {
    playerName,
    score,
    currentScenario,
    blasts,
    setPlayerName,
    setScore,
    addScore,
    setCurrentScenario,
    setGrid,
    addBlast,
    triggerBlasts,
    hasPlayerName,
    reset: resetGameState,
    clearBlasts
  } = useGameState();

  const [currentView, setCurrentView] = useState('home') // 'home', 'game', 'leaderboard', 'help'
  const [csvData, setCsvData] = useState(null)
  const [originalCsvData, setOriginalCsvData] = useState(null) // Store original CSV for reset
  const [csvError, setCsvError] = useState(null)
  const [oreGrid, setOreGrid] = useState(null) // Add grid state for canvas
  const [isLoadingGrid, setIsLoadingGrid] = useState(false)
  const [csvReady, setCsvReady] = useState(false) // Track if CSV is loaded and ready
  
  // Blast simulation state
  const [blastPower, setBlastPower] = useState(500)
  const [blastDirection, setBlastDirection] = useState(180)
  const [mineralRecovery, setMineralRecovery] = useState(100)
  const [dilution, setDilution] = useState(0)
  const [simulationResults, setSimulationResults] = useState(null)
  
  // Blast placement state
  const [placementMode, setPlacementMode] = useState(false)
  const [explosionAnimations, setExplosionAnimations] = useState([])
  const [physicsDebris, setPhysicsDebris] = useState([]) // Physics debris state
  const [animationState, setAnimationState] = useState(null) // GSAP animation state
  const [cameraShake, setCameraShake] = useState({ x: 0, y: 0 }) // Camera shake effect
  
  // Blast summary panel state
  const [showBlastSummary, setShowBlastSummary] = useState(false)
  const [blastResults, setBlastResults] = useState(null)
  const [previousScore, setPreviousScore] = useState(0)
  
  // Blast feedback state
  const [showBlastFeedback, setShowBlastFeedback] = useState(false)
  const [feedbackResults, setFeedbackResults] = useState(null)
  const [highlightedCells, setHighlightedCells] = useState({ recovered: [], lost: [] })
  
  // Reset feedback state
  const [resetMessage, setResetMessage] = useState(null)
  
  // Save simulation state
  const [saveToast, setSaveToast] = useState({ show: false, message: '', type: 'success', simulationId: null })
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  
  const canvasRef = React.useRef(null)

  const rebuildGridFromSnapshot = useCallback(async (scenarioSnapshot) => {
    if (!scenarioSnapshot) {
      throw new Error('Simulation is missing scenario information.');
    }

    const snapshot = scenarioSnapshot.grid || scenarioSnapshot.gridSnapshot;
    const blockSnapshots = snapshot?.blocks || snapshot?.data;

    if (Array.isArray(blockSnapshots) && blockSnapshots.length > 0) {
      const inferredWidth = snapshot?.width ?? (Math.max(...blockSnapshots.map(block => block?.x ?? 0)) + 1);
      const inferredHeight = snapshot?.height ?? (Math.max(...blockSnapshots.map(block => block?.y ?? 0)) + 1);
      const width = Math.max(1, inferredWidth || 0);
      const height = Math.max(1, inferredHeight || 0);

      const restoredGrid = new OreGridClass(width, height);
      restoredGrid.grid = Array.from({ length: height }, () => Array(width).fill(null));

      blockSnapshots.forEach((blockData) => {
        if (typeof blockData?.x !== 'number' || typeof blockData?.y !== 'number') return;

        const oreType = blockData.oreType || blockData.material || blockData.type || 'stone';
        const hardness = blockData.maxHealth ?? blockData.hardness ?? blockData.hardness_mohs ?? 100;
        const value = blockData.value ?? blockData.game_value ?? 10;
        const materialProps = materialPropertyHandler.getMaterialProperties(oreType);

        const oreBlock = new OreBlock(blockData.x, blockData.y, oreType, hardness, value, materialProps);
        oreBlock.maxHealth = blockData.maxHealth ?? hardness;
        oreBlock.health = blockData.health ?? oreBlock.maxHealth;
        oreBlock.damage = blockData.damage ?? (oreBlock.maxHealth - oreBlock.health);
        oreBlock.isDestroyed = Boolean(blockData.isDestroyed);
        oreBlock.recentlyDisplaced = Boolean(blockData.recentlyDisplaced);
        oreBlock.isDisplaced = Boolean(blockData.isDisplaced);
        oreBlock.isBlasted = Boolean(blockData.isBlasted);
        oreBlock.animatedX = blockData.animatedX ?? oreBlock.x;
        oreBlock.animatedY = blockData.animatedY ?? oreBlock.y;
        oreBlock.crackLevel = blockData.crackLevel ?? oreBlock.crackLevel;
        oreBlock.crackPatterns = blockData.crackPatterns || oreBlock.crackPatterns;
        oreBlock.fragmentationData = blockData.fragmentationData || null;

        restoredGrid.setBlock(oreBlock.x, oreBlock.y, oreBlock);
      });

      return restoredGrid;
    }

    const csvSource = scenarioSnapshot.data || scenarioSnapshot.originalCsvData;
    if (csvSource && csvSource.length > 0) {
      const csvString = Array.isArray(csvSource) ? Papa.unparse(csvSource) : csvSource;
      return await parseCSVToGrid(csvString);
    }

    throw new Error('No grid snapshot found for the selected simulation.');
  }, []);

  // Initialize blast history store when player name changes
  useEffect(() => {
    if (playerName && playerName.trim().length > 0) {
      blastHistoryStore.initializeSession(playerName);
    }
  }, [playerName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ctrl+R or Cmd+R for reset (prevent default browser refresh)
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        if (currentView === 'game' && originalCsvData && !isLoadingGrid) {
          handleResetSimulation();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentView, originalCsvData, isLoadingGrid]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      blastAnimationEngine.destroy();
      physicsEngine.destroy();
    };
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setCsvError(null)
    setIsLoadingGrid(true)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log("Parsed CSV:", results.data)
        
        // Compare against exact columns from blast_scenario_sample.csv
        const requiredColumns = ['x', 'y', 'material', 'type', 'density_g_cm3', 'hardness_mohs', 'game_value', 'blast_hole']
        const playerColumns = (results.meta.fields || []).map(h => h.toLowerCase().trim())
        
        // Find missing columns by comparing player's columns with required columns
        const missingColumns = requiredColumns.filter(reqCol => {
          return !playerColumns.some(playerCol => 
            playerCol === reqCol || 
            playerCol.replace(/[_\s]/g, '') === reqCol.replace(/[_\s]/g, '')
          )
        })
        
        if (missingColumns.length > 0) {
          const errorMessage = `Missing required columns: ${missingColumns.join(', ')}`
          
          setCsvError({
            type: 'validation',
            message: errorMessage
          })
          setIsLoadingGrid(false)
          return
        }
        
        try {
          // Convert Papa Parse data to CSV string for grid creation
          const csvString = Papa.unparse(results.data)
          const grid = await parseCSVToGrid(csvString)
          
          console.log('Grid created successfully, ready for simulation')
          setCsvData(results.data)
          setOriginalCsvData(results.data) // Store original data for reset functionality
          setOreGrid(grid)
          setCsvReady(true) // Mark CSV as ready for simulation
          setIsLoadingGrid(false)
          
          // Store the scenario in global state
          setCurrentScenario({
            data: results.data,
            grid: grid,
            fileName: file.name,
            uploadedAt: new Date().toISOString()
          })
          
          // Set grid in game state for blast functionality
          setGrid(grid.data || grid)
        } catch (error) {
          console.error("Grid creation error:", error)
          setCsvError({
            type: 'grid_creation',
            message: 'Failed to create grid from CSV data',
            details: error.message
          })
          setIsLoadingGrid(false)
        }
      },
      error: (err) => {
        console.error("CSV Parse Error:", err)
        setCsvError({
          type: 'parse',
          message: 'Failed to parse CSV file',
          details: err.message
        })
        setIsLoadingGrid(false)
      }
    })
  }

  const handleRetry = () => {
    setCsvError(null)
    setCsvData(null)
    setOriginalCsvData(null) // Clear original data
    setOreGrid(null)
    setIsLoadingGrid(false)
    setCsvReady(false)
    setCurrentView('home')
    
    // Reset global state scenario but keep player name
    setCurrentScenario(null)
  }

  const handleResetSimulation = async () => {
    if (!originalCsvData) {
      console.warn('No original CSV data available for reset');
      return;
    }

    try {
      setIsLoadingGrid(true);
      
      // Reset game state (keep player name, reset score and blasts)
      resetGameState(true); // true = keep player name
      
      // Recreate grid from original CSV data
      const csvString = originalCsvData.map(row => {
        return Object.keys(row).map(key => row[key]).join(',');
      }).join('\n');
      
      const headerString = Object.keys(originalCsvData[0]).join(',');
      const fullCsvString = headerString + '\n' + csvString;
      
      const grid = await parseCSVToGrid(fullCsvString);
      
      // Reset all simulation state
      setCsvData(originalCsvData);
      setOreGrid(grid);
      setGrid(grid.data || grid);
      
      // Reset blast simulation values
      setBlastPower(500);
      setBlastDirection(180);
      setMineralRecovery(100);
      setDilution(0);
      setSimulationResults(null);
      
      // Reset UI state
      setPlacementMode(false);
      setExplosionAnimations([]);
      setPhysicsDebris([]);
      setAnimationState(null);
      setCameraShake({ x: 0, y: 0 });
      
      // Stop any running animations
      blastAnimationEngine.stopAll();
      physicsEngine.destroy();
      
      // Clear blast history (new session)
      blastHistoryStore.clearHistory();
      console.log('Blast history cleared for new session');
      
      // Update scenario with reset grid
      setCurrentScenario({
        data: originalCsvData,
        grid: grid,
        fileName: 'Reset Simulation',
        uploadedAt: new Date().toISOString()
      });
      
      setIsLoadingGrid(false);
      console.log('Simulation reset successfully');
      
      // Show success message
      setResetMessage('✅ Simulation reset successfully!');
      setTimeout(() => setResetMessage(null), 3000); // Clear message after 3 seconds
      
    } catch (error) {
      console.error('Error resetting simulation:', error);
      setIsLoadingGrid(false);
      
      // Show error message
      setResetMessage('❌ Failed to reset simulation. Please try again.');
      setTimeout(() => setResetMessage(null), 5000);
    }
  }

  // Blast simulation handlers
  const handlePowerChange = (power) => {
    setBlastPower(power)
  }

  const handleDirectionChange = (direction) => {
    setBlastDirection(direction)
  }

  const handleRunSimulation = () => {
    if (!oreGrid) return
    
    // Simple blast simulation logic
    const recovery = Math.max(60, 100 - (blastPower / 20) + Math.random() * 20)
    const newDilution = Math.max(0, (blastPower / 50) - 10 + Math.random() * 10)
    
    setMineralRecovery(Math.round(recovery))
    setDilution(Math.round(newDilution))
    
    // Calculate and update score in global state
    const blastScore = Math.round(recovery * 10 - newDilution * 5)
    addScore(Math.max(0, blastScore))
    
    console.log(`Blast simulation: Power=${blastPower}, Direction=${blastDirection}°`)
    console.log(`Results: Recovery=${Math.round(recovery)}%, Dilution=${Math.round(newDilution)}%`)
    console.log(`Score added: ${Math.max(0, blastScore)}, Total score: ${score + Math.max(0, blastScore)}`)
  }

  const handleReset = () => {
    // Use the comprehensive reset simulation functionality
    handleResetSimulation();
  }

  // Blast placement handlers
  const handlePlacementModeChange = (mode) => {
    setPlacementMode(mode)
  }

  const handleBlockClick = (block, position) => {
    // Close blast summary panel when new action begins
    if (showBlastSummary) {
      handleCloseBlastSummary();
    }
    
    if (placementMode) {
      // Place blast marker with current direction
      const success = addBlast(position.x, position.y, blastDirection)
      if (!success) {
        alert('Maximum number of blasts reached!')
      }
    } else {
      // No direct blasting - explosives must be placed and triggered
      console.log('Block clicked, but direct blasting is disabled. Use placement mode to add explosives.');
    }
  }

  const handleTriggerBlasts = async (result) => {
    if (result.blasts.length > 0) {
      // Store previous score before blast
      setPreviousScore(score);
      
      console.log('🎆 Starting blast animation and physics');
      
      // Calculate score increase based on materials destroyed
      const materialsDestroyed = result.destroyedCells?.length || 0;
      const scoreIncrease = materialsDestroyed * 10; // 10 points per material destroyed
      addScore(scoreIncrease);
      
        const destroyedCells = result.destroyedCells || [];
        const classifiedCells = destroyedCells.map(cell => {
          const normalized = normalizeMaterialName(cell.material || '');
          const oreMaterial = isOre(normalized);
          return { cell, normalized, oreMaterial };
        });

        const recoveredOres = classifiedCells
          .filter(({ oreMaterial }) => oreMaterial)
          .map(({ cell }) => cell);
        
        const lostWaste = classifiedCells
          .filter(({ oreMaterial }) => !oreMaterial)
          .map(({ cell }) => cell);
        
        let totalValue = 0;
        const materialBreakdown = {};
        
        classifiedCells.forEach(({ normalized, oreMaterial }) => {
          const key = normalized || 'unknown';
          materialBreakdown[key] = (materialBreakdown[key] || 0) + 1;
          
          if (oreMaterial && normalized) {
            totalValue += getOreValue(normalized);
          }
        });

      // Calculate performance metrics
      const oresRecovered = recoveredOres.length;
      const wasteCollected = lostWaste.length;
      const totalDestroyed = materialsDestroyed;
      const recovery = totalDestroyed > 0 ? Math.round((oresRecovered / totalDestroyed) * 100) : 0;
      const dilution = totalDestroyed > 0 ? Math.round((wasteCollected / totalDestroyed) * 100) : 0;
      const efficiency = Math.max(0, recovery - dilution);

      // Save to blast history store
      const blastRecord = blastHistoryStore.addBlastRecord({
        recovery,
        dilution,
        efficiency,
        oresRecovered,
        wasteCollected: wasteCollected,
        totalValue: Math.max(0, totalValue),
        score: scoreIncrease,
        totalScore: score + scoreIncrease,
        blastsUsed: result.blasts.length,
        blastRadius: result.blastRadius || 0,
        cellsDestroyed: materialsDestroyed,
        cellsAffected: result.affectedCells?.length || 0,
        materialBreakdown
      });

      const roundNumberForAutoSave = blastRecord?.round || blastHistoryStore.getCurrentRound();

      console.log('📊 Blast record saved:', blastRecord);
      
      // Set highlighted cells for canvas rendering
      setHighlightedCells({
        recovered: recoveredOres,
        lost: lostWaste
      });
      
      // Show blast summary panel
      setBlastResults(result);
      setShowBlastSummary(true);

      // *** START GSAP ANIMATION SEQUENCE ***
      const cellSize = 35; // Cell size in pixels (matches OreGridCanvas default)
      
      // Start blast animation engine
      blastAnimationEngine.animateBlastSequence(
        result.blasts,
        result.affectedCells || [],
        cellSize,
        {
          shockwaveDuration: 1.0,
          blockTransitionDuration: 1.0,
          epicenterShake: true,
          staggerDelay: 0.03,
          onUpdate: (animState) => {
            // Update animation state for canvas rendering
            setAnimationState(animState);
            
            // Apply screen shake effect
            if (animState.animations) {
              const shakeAnim = animState.animations.find(a => a.type === 'shake');
              if (shakeAnim) {
                const shakeX = (Math.random() - 0.5) * shakeAnim.intensity;
                const shakeY = (Math.random() - 0.5) * shakeAnim.intensity;
                setCameraShake({ x: shakeX, y: shakeY });
              } else {
                setCameraShake({ x: 0, y: 0 });
              }
            }
          },
          onComplete: () => {
            console.log('✨ Animation complete');
            setCameraShake({ x: 0, y: 0 });
            
            // Clear animation state after a delay, then show feedback
            setTimeout(() => {
              setAnimationState(null);
              
              // Show blast feedback modal after animations complete
              setFeedbackResults(result);
              setShowBlastFeedback(true);
            }, 500);

            // Trigger immediate auto-save once the blast fully completes
            handleAutoSave(roundNumberForAutoSave);
          }
        }
      );
      
      // *** PHYSICS SIMULATION (runs in parallel with GSAP animations) ***
      if (result.destroyedCells && result.destroyedCells.length > 0 && canvasRef.current) {
        try {
          console.log('💥 Starting physics simulation with', result.destroyedCells.length, 'destroyed cells');
          
          // Initialize physics engine with canvas dimensions
          const canvas = canvasRef.current;
          const canvasWidth = canvas.width || canvas.clientWidth || 800;
          const canvasHeight = canvas.height || canvas.clientHeight || 600;
          
          console.log('Canvas dimensions:', { 
            width: canvasWidth, 
            height: canvasHeight,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
            actualWidth: canvas.width,
            actualHeight: canvas.height
          });
          
          physicsEngine.initialize({
            width: canvasWidth,
            height: canvasHeight,
            gravity: { x: 0, y: 0.9 }, // Enhanced gravity for better falling effect
            enableSleeping: false, // Keep particles active for visual effect
            constraintIterations: 2,
            positionIterations: 6,
            velocityIterations: 4
          });

          // Add boundaries to contain debris
          physicsEngine.addBoundaries(canvasWidth, canvasHeight);

          // Start physics simulation
          physicsEngine.start();
          console.log('Physics engine started with boundaries');

          const cellSize = 35; // Cell size (matches OreGridCanvas default)
          
          // Create debris for all destroyed cells with averaged blast center
          if (result.destroyedCells.length > 0) {
            // Calculate average blast center for physics simulation
            const avgBlastCenter = result.blasts.reduce((acc, blast) => ({
              x: acc.x + blast.x / result.blasts.length,
              y: acc.y + blast.y / result.blasts.length
            }), { x: 0, y: 0 });
            
            // Convert all destroyed cells to debris data
            const debrisData = result.destroyedCells.map(cell => ({
              x: cell.x,
              y: cell.y,
              originalMaterial: cell.material || 'stone'
            }));
            
            console.log(`Creating debris for ${debrisData.length} destroyed cells`);
            console.log('Average blast center:', avgBlastCenter);
            console.log('Blast directions used:', result.blasts.map(b => b.direction));
            
            // Create debris using the physics engine
            // For now, use the first blast's direction if available
            const primaryDirection = result.blasts.length > 0 ? result.blasts[0].direction : null;
            
            const debris = physicsEngine.createDebris(
              debrisData,
              cellSize,
              { x: avgBlastCenter.x * cellSize, y: avgBlastCenter.y * cellSize },
              primaryDirection
            );
            
            console.log(`🌪️ Created ${debris.length} debris particles with direction ${primaryDirection}°`);
            
            // Force initial debris state update
            if (debris.length > 0) {
              setPhysicsDebris([...debris]);
              console.log('Initial physics debris state set with', debris.length, 'particles');
              
              // Debug: Check first few particle positions
              debris.slice(0, 3).forEach((particle, i) => {
                console.log(`Particle ${i}:`, {
                  position: particle.body.position,
                  color: particle.color,
                  size: particle.size
                });
              });
            } else {
              console.error('No debris particles were created!');
              
              // Fallback: Create a simple test particle
              console.log('Creating fallback test debris...');
              const testDebris = [{
                body: { position: { x: 400, y: 300 } },
                color: '#FFD700',
                size: 8,
                material: 'test'
              }];
              setPhysicsDebris(testDebris);
            }
          }

          // Update debris state continuously
          const updatePhysics = () => {
            if (physicsEngine.isRunning && physicsEngine.shouldContinue()) {
              physicsEngine.update();
              const debris = physicsEngine.getDebris();
              setPhysicsDebris([...debris]);
              
              // More detailed debugging
              if (debris.length > 0) {
                console.log('Physics update:', debris.length, 'debris particles');
                console.log('First particle position:', debris[0]?.body?.position);
                console.log('Physics debris state being set:', debris.length);
              }
              
              requestAnimationFrame(updatePhysics);
            } else {
              // Simulation ended
              console.log('🏁 Physics simulation ended');
              setTimeout(() => {
                physicsEngine.destroy();
                setPhysicsDebris([]);
              }, 1000);
            }
          };
          
          requestAnimationFrame(updatePhysics);
          
        } catch (error) {
          console.error('❌ Physics simulation error:', error);
        }
      }
      
    }
  }

  const handleCloseBlastSummary = () => {
    setShowBlastSummary(false);
    setBlastResults(null);
  };

  const handleCloseFeedback = () => {
    setShowBlastFeedback(false);
    setFeedbackResults(null);
    setHighlightedCells({ recovered: [], lost: [] });
  };

  const handleFeedbackReset = () => {
    handleResetSimulation();
  };

  const handleFeedbackContinue = () => {
    // Just close the feedback and continue playing
    handleCloseFeedback();
  };

  const handleSave = (saveData) => {
    const gameStateData = {
      playerName,
      score,
      currentScenario,
      blasts,
      csvData: originalCsvData,
      gridState: oreGrid ? {
        width: oreGrid.width,
        height: oreGrid.height,
        blocks: oreGrid.getAllBlocks()
      } : null,
      simulationSettings: {
        blastPower,
        blastDirection,
        mineralRecovery,
        dilution
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    
    console.log('Game state saved:', gameStateData);
    // The SaveLoadPanel handles the actual file download
    return gameStateData;
  }

  // New Save Simulation functionality
  const handleSaveSimulation = async (customName = null, options = {}) => {
    const {
      reason = 'manual',
      silent = false,
      autoSaveRound = null,
      autoSaveLabel = customName
    } = options;

    try {
      setIsAutoSaving(true);
      
      // Collect comprehensive game state
      const gameData = {
        playerName,
        score,
        currentScenario,
        blasts,
        originalCsvData,
        oreGrid,
        blastPower,
        blastDirection,
        mineralRecovery,
        dilution,
        simulationResults,
        currentView,
        isComplete: false, // Could be enhanced to detect completion
        saveReason: reason,
        autoSaveRound,
        autoSaveLabel
      };

      // Save to persistent storage
      const result = await simulationStorage.saveSimulation(gameData, customName);
      
      if (result.success) {
        if (!silent) {
          setSaveToast({
            show: true,
            message: result.message,
            type: 'success',
            simulationId: result.simulationId
          });
        }
        
        console.log('Simulation saved successfully:', result);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error saving simulation:', error);
      if (!silent) {
        setSaveToast({
          show: true,
          message: 'Failed to save simulation: ' + error.message,
          type: 'error',
          simulationId: null
        });
      }
      throw error;
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Load simulation from storage
  const handleLoadSimulation = async (simulationId) => {
    try {
      setIsLoadingGrid(true);
      
      const simulation = await simulationStorage.loadSimulation(simulationId);
      const restoredGrid = await rebuildGridFromSnapshot(simulation.scenario);
      
      // Restore game state
      if (simulation.player?.name) {
        setPlayerName(simulation.player.name);
        blastHistoryStore.initializeSession(simulation.player.name);
      }
      setScore(simulation.player?.score ?? 0);

      const scenarioData = simulation.scenario?.data || simulation.scenario?.originalCsvData || null;
      if (scenarioData) {
        setCsvData(scenarioData);
        setOriginalCsvData(simulation.scenario?.originalCsvData || scenarioData);
      }

      setCurrentScenario({
        ...simulation.scenario,
        grid: restoredGrid,
        uploadedAt: simulation.scenario?.uploadedAt || new Date().toISOString()
      });
      setOreGrid(restoredGrid);
      setGrid(restoredGrid);

      if (simulation.settings) {
        setBlastPower(simulation.settings.blastPower || 500);
        setBlastDirection(simulation.settings.blastDirection || 180);
        setMineralRecovery(simulation.settings.mineralRecovery ?? mineralRecovery);
        setDilution(simulation.settings.dilution ?? dilution);
      } else if (simulation.blasts) {
        setBlastPower(simulation.blasts.currentPower || blastPower);
        setBlastDirection(simulation.blasts.currentDirection || blastDirection);
      }

      // Restore blasts via game state
      clearBlasts();
      const savedBlasts = (simulation.blasts?.placements?.length ? simulation.blasts.placements : simulation.blasts?.history) || [];
      savedBlasts.forEach((blast) => {
        if (typeof blast?.x === 'number' && typeof blast?.y === 'number') {
          addBlast(blast.x, blast.y, blast.direction ?? simulation.blasts?.currentDirection ?? 180);
        }
      });

      // Restore progress-driven UI state
      setSimulationResults(simulation.progress?.simulationResults || null);
      setBlastResults(simulation.progress?.simulationResults || null);
      setShowBlastSummary(false);
      setShowBlastFeedback(false);
      setFeedbackResults(null);
      setHighlightedCells({ recovered: [], lost: [] });
      setCameraShake({ x: 0, y: 0 });
      setAnimationState(null);
      setPhysicsDebris([]);
      setPlacementMode(false);
      setExplosionAnimations([]);
      setResetMessage(null);
      
      setCsvReady(true);
      setCurrentView(simulation.progress?.currentView || 'game');
      
      setSaveToast({
        show: true,
        message: `Simulation loaded: ${simulation.scenario?.name || 'Unknown'}`,
        type: 'success',
        simulationId: simulation.id
      });
      
      console.log('Simulation loaded successfully:', simulation);
      return simulation;
    } catch (error) {
      console.error('Error loading simulation:', error);
      setSaveToast({
        show: true,
        message: 'Failed to load simulation: ' + error.message,
        type: 'error',
        simulationId: null
      });
      throw error;
    } finally {
      setIsLoadingGrid(false);
    }
  };

  // Auto-save functionality (can be called after significant game events)
  const handleAutoSave = async (roundNumber = null) => {
    if (csvReady && playerName && oreGrid) {
      const autoSaveLabel = roundNumber
        ? `Auto-Save – Round ${roundNumber}`
        : `Auto-Save – ${new Date().toLocaleTimeString()}`;

      try {
        await handleSaveSimulation(autoSaveLabel, {
          reason: 'auto',
          silent: true,
          autoSaveRound: roundNumber,
          autoSaveLabel
        });
      } catch (error) {
        // Auto-save failures should not interrupt gameplay
        console.warn('Auto-save failed:', error);
      }
    }
  };

  // Close toast notification
  const handleCloseToast = () => {
    setSaveToast(prev => ({ ...prev, show: false }));
  };

  const handleLoad = async (loadedData) => {
    try {
      setIsLoadingGrid(true);
      
      // Restore player name and score
      if (loadedData.playerName) setPlayerName(loadedData.playerName);
      if (typeof loadedData.score === 'number') setScore(loadedData.score);
      
      // Restore CSV data and grid
      if (loadedData.csvData) {
        setOriginalCsvData(loadedData.csvData);
        setCsvData(loadedData.csvData);
        
        // Parse the CSV data and create grid
        const csvString = Papa.unparse(loadedData.csvData);
        const grid = await parseCSVToGrid(csvString);
        
        setOreGrid(grid);
        setCsvReady(true);
        
        // Store in game state
        setCurrentScenario({
          data: loadedData.csvData,
          grid: grid,
          fileName: loadedData.currentScenario?.fileName || 'Loaded Save',
          uploadedAt: new Date().toISOString()
        });
        
        setGrid(grid.data || grid);
      }
      
      // Restore simulation settings
      if (loadedData.simulationSettings) {
        const settings = loadedData.simulationSettings;
        if (typeof settings.blastPower === 'number') setBlastPower(settings.blastPower);
        if (typeof settings.blastDirection === 'number') setBlastDirection(settings.blastDirection);
        if (typeof settings.mineralRecovery === 'number') setMineralRecovery(settings.mineralRecovery);
        if (typeof settings.dilution === 'number') setDilution(settings.dilution);
      }
      
      // Restore blasts (if any were saved)
      // Note: The blasts are managed by useGameState, but we can restore them via addBlast
      // Clear existing blasts first
      if (loadedData.blasts && Array.isArray(loadedData.blasts)) {
        clearBlasts();
        loadedData.blasts.forEach(blast => {
          if (blast.x !== undefined && blast.y !== undefined) {
            addBlast(blast.x, blast.y, blast.direction || 90);
          }
        });
      }
      
      // Switch to game view if we have player name and CSV data
      if (loadedData.playerName && loadedData.csvData) {
        setCurrentView('game');
      }
      
      setIsLoadingGrid(false);
      console.log('Game state loaded successfully:', loadedData);
      
      // Show success message
      setResetMessage('✅ Game loaded successfully!');
      setTimeout(() => setResetMessage(null), 3000);
      
    } catch (error) {
      console.error('Error loading game state:', error);
      setIsLoadingGrid(false);
      
      // Show error message
      setResetMessage('❌ Failed to load game. Please try again.');
      setTimeout(() => setResetMessage(null), 5000);
      
      throw new Error('Failed to load game state');
    }
  };

  const handleExport = (csvData) => {
    console.log('Grid data exported as CSV:', csvData);
    // The SaveLoadPanel handles the actual file download
    return csvData;
  };

  const handleExportSessionData = useCallback(() => {
    if (!oreGrid) {
      console.warn('Export aborted: grid not ready');
      return;
    }

    try {
      const timestamp = new Date();
      const isoTimestamp = timestamp.toISOString();

      const blockData = (() => {
        if (!oreGrid) return [];
        if (typeof oreGrid.getAllBlocks === 'function') {
          return oreGrid.getAllBlocks();
        }
        if (Array.isArray(oreGrid.blocks)) {
          return oreGrid.blocks;
        }
        if (Array.isArray(oreGrid.data)) {
          return oreGrid.data;
        }
        return [];
      })();

      const gridSnapshot = {
        width: oreGrid.width ?? null,
        height: oreGrid.height ?? null,
        blocks: blockData
      };

      const exportPayload = {
        metadata: {
          exportedAt: isoTimestamp,
          fileVersion: '1.0.0',
          playerName: playerName || 'Unknown Player',
          sessionId: blastHistoryStore.sessionId
        },
        scenario: currentScenario ? {
          fileName: currentScenario.fileName,
          uploadedAt: currentScenario.uploadedAt,
          source: currentScenario.source || null
        } : null,
        grid: gridSnapshot,
        blasts: {
          activeBlasts: blasts,
          lastBlastResult: blastResults,
          sessionHistory: blastHistoryStore.exportSessionData()
        },
        scores: {
          currentScore: score,
          previousScore,
          lastScoreGain: Math.max(0, score - (previousScore || 0)),
          mineralRecovery,
          dilution
        },
        simulationSettings: {
          blastPower,
          blastDirection
        },
        rawData: {
          simulationResults,
          csvData: originalCsvData
        }
      };

      const fileContents = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([fileContents], { type: 'application/json' });
      const fileName = `simulation_${isoTimestamp.replace(/[:]/g, '-').split('.')[0]}.json`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session data:', error);
    }
  }, [oreGrid, playerName, currentScenario, blasts, blastResults, score, previousScore, mineralRecovery, dilution, blastPower, blastDirection, simulationResults, originalCsvData, blastHistoryStore]);

  const handleImport = async (csvData) => {
    try {
      setCsvError(null);
      setIsLoadingGrid(true);
      
      // Parse the CSV string using Papa Parse
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          console.log("Parsed imported CSV:", results.data);
          
          // Validate columns like in handleFileUpload
          const requiredColumns = ['x', 'y', 'material', 'type', 'density_g_cm3', 'hardness_mohs', 'game_value', 'blast_hole'];
          const playerColumns = (results.meta.fields || []).map(h => h.toLowerCase().trim());
          
          const missingColumns = requiredColumns.filter(reqCol => {
            return !playerColumns.some(playerCol => 
              playerCol === reqCol || 
              playerCol.replace(/[_\s]/g, '') === reqCol.replace(/[_\s]/g, '')
            );
          });
          
          if (missingColumns.length > 0) {
            const errorMessage = `Missing required columns: ${missingColumns.join(', ')}`;
            setCsvError({
              type: 'validation',
              message: errorMessage
            });
            setIsLoadingGrid(false);
            throw new Error(errorMessage);
          }
          
          try {
            // Create grid from the parsed data
            const grid = await parseCSVToGrid(csvData);
            
            // Update all states
            setCsvData(results.data);
            setOriginalCsvData(results.data);
            setOreGrid(grid);
            setCsvReady(true);
            setIsLoadingGrid(false);
            
            // Store in game state
            setCurrentScenario({
              data: results.data,
              grid: grid,
              fileName: 'imported-data.csv',
              uploadedAt: new Date().toISOString()
            });
            
            setGrid(grid.data || grid);
            console.log('CSV data imported successfully');
            
            // Switch to game view if not already there
            if (hasPlayerName()) {
              setCurrentView('game');
            }
          } catch (gridError) {
            console.error("Grid creation error during import:", gridError);
            setCsvError({
              type: 'grid_creation',
              message: 'Failed to create grid from imported CSV data',
              details: gridError.message
            });
            setIsLoadingGrid(false);
            throw new Error('Failed to create grid from imported data');
          }
        },
        error: (err) => {
          console.error("CSV Parse Error during import:", err);
          setCsvError({
            type: 'parse',
            message: 'Failed to parse imported CSV data',
            details: err.message
          });
          setIsLoadingGrid(false);
          throw new Error('Failed to parse imported CSV data');
        }
      });
    } catch (error) {
      console.error('Error importing CSV data:', error);
      throw new Error('Failed to import CSV data');
    }
  };

  const handleReplay = () => {
    console.log('Replaying last simulation...')
    handleRunSimulation()
  }

  // Home View (UPLOAD-CSV Interface)
  const renderHomeView = () => (
    <div className="blast-sim-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="blast-header">
        <div style={{ width: '24px' }}></div>
        <h1 className="blast-title">BlastSim</h1>
        <span className="material-symbols-outlined settings-icon">
          settings
        </span>
      </header>

      <main className="blast-main">
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <input
            className="name-input"
            placeholder="Enter your name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          {csvReady && !hasPlayerName() && (
            <p className="name-required-message">
              ⚠️ Name is required to start the simulation
            </p>
          )}
        </div>

        <div className="button-container">
          <label className="blast-button secondary-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            Upload CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          {csvReady && (
            <button 
              className={`blast-button start-button ${!hasPlayerName() ? 'disabled' : ''}`}
              onClick={() => hasPlayerName() && setCurrentView('game')}
              disabled={!hasPlayerName()}
              title={!hasPlayerName() ? "Please enter your name to start" : "Start the blast simulation"}
            >
              Start Simulation
            </button>
          )}
        </div>

        {csvReady && (
          <div className="csv-success-message">
            <div className="success-icon">✓</div>
            <p>CSV file loaded successfully! Ready to start simulation.</p>
          </div>
        )}

        {csvError && <CSVErrorUI error={csvError} onRetry={handleRetry} onFileUpload={handleFileUpload} />}
      </main>
    </div>
  )

  // Game View (2D Grid Interface)
  const renderGameView = () => (
    <div className="relative flex h-auto min-h-screen w-full flex-col justify-between overflow-x-hidden blast-game-view">
      <div className="flex-grow">
        <header className="p-4">
          <div className="flex items-center justify-between">
            <button 
              className="flex items-center justify-center size-10 text-white dark:text-white"
              onClick={() => setCurrentView('home')}
            >
              <svg className="feather feather-arrow-left" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <line x1="19" x2="5" y1="12" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white dark:text-white text-center">Blast Simulation</h1>
            <div className="size-10"></div>
          </div>
          <p className="text-lg font-medium text-white dark:text-white mt-4">
            Welcome, {playerName}! | Score: {score}
          </p>
        </header>

        {/* Reset Message Display */}
        {resetMessage && (
          <div className="mx-4 mb-4 p-3 rounded-lg bg-opacity-90 backdrop-blur-sm transition-all duration-300" 
               style={{
                 backgroundColor: resetMessage.includes('✅') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                 border: `1px solid ${resetMessage.includes('✅') ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
               }}>
            <p className="text-white text-center font-medium">{resetMessage}</p>
          </div>
        )}
        
        <main className="blast-simulation-main">
          {isLoadingGrid ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '2rem',
              color: 'white'
            }}>
              <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
              <p>Processing CSV data and creating grid...</p>
            </div>
          ) : csvData && oreGrid ? (
            <>
              {/* Welcome Message */}
              <div className="welcome-section">
                <h2 className="welcome-message">
                  Welcome, {playerName}! 👋
                </h2>
                <p className="welcome-subtitle">
                </p>
              </div>
              
              {/* Main Container with T-Shaped Sidebar + Centered Canvas */}
              <div className="blast-simulation-container">
                {/* Left Sidebar - T-Shaped Controls */}
                <div className="controls-sidebar">
                  {/* Top Row: Two panels side by side */}
                  <div className="controls-top-row">
                    <BlastToolPanel
                      blastPower={blastPower}
                      setBlastPower={setBlastPower}
                      blastDirection={blastDirection}
                      setBlastDirection={setBlastDirection}
                      onSimulate={handleRunSimulation}
                      onReset={handleReset}
                    />
                    
                    <ScoreFeedback
                      mineralRecovery={mineralRecovery}
                      dilution={dilution}
                    />
                  </div>
                  
                  {/* Bottom Row: Two panels side by side */}
                  <div className="controls-bottom-row">
                    <BlastPlacementPanel
                      onPlacementModeChange={handlePlacementModeChange}
                      onTriggerBlasts={handleTriggerBlasts}
                      placementMode={placementMode}
                      canvasRef={canvasRef}
                      blastDirection={blastDirection}
                    />
                    
                    <MaterialLegend grid={oreGrid} />
                  </div>
                </div>
                
                {/* Canvas Grid Section - Centered */}
                <div className="canvas-section">
                  <div className="canvas-container">
                    <OreGridCanvas 
                      ref={canvasRef}
                      grid={oreGrid} 
                      onBlockClick={handleBlockClick}
                      placementMode={placementMode}
                      blastMarkers={blasts}
                      explosionAnimations={explosionAnimations}
                      physicsDebris={physicsDebris}
                      animationState={animationState}
                      cameraShake={cameraShake}
                      blastDirection={blastDirection}
                      showBlastDirection={true}
                      highlightedCells={highlightedCells}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <GridManager />
          )}
        </main>
      </div>
      
      {/* Save/Load Panel - only show in game view */}
      <SaveLoadPanel
        onSave={handleSave}
        onLoad={handleLoad}
        onExport={handleExport}
        onImport={handleImport}
        onSaveSimulation={handleSaveSimulation}
        onLoadSimulation={handleLoadSimulation}
        onExportSession={handleExportSessionData}
        canExportSession={Boolean(oreGrid)}
        gameState={{
          playerName,
          score,
          currentScenario,
          blasts,
          csvData: originalCsvData,
          grid: oreGrid,
          simulationSettings: {
            blastPower,
            blastDirection,
            mineralRecovery,
            dilution
          }
        }}
        isVisible={csvData && oreGrid}
        position="right"
      />
    </div>
  )



  return (
    <div>
      {currentView === 'home' && renderHomeView()}
      {currentView === 'game' && renderGameView()}
      {currentView === 'leaderboard' && (
        <div className="flex items-center justify-center min-h-screen text-white blast-sim-container">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
            <p>Coming soon...</p>
          </div>
        </div>
      )}
      {currentView === 'help' && (
        <div className="flex items-center justify-center min-h-screen text-white blast-sim-container">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Help</h2>
            <p>Game instructions coming soon...</p>
          </div>
        </div>
      )}

      {/* Blast Summary Panel */}
      <BlastSummaryPanel 
        blastResults={blastResults}
        isVisible={showBlastSummary}
        onClose={handleCloseBlastSummary}
        playerScore={score}
        previousScore={previousScore}
        grid={oreGrid}
      />

      {/* Blast Feedback Modal */}
      <BlastFeedback 
        blastResults={feedbackResults}
        isVisible={showBlastFeedback}
        onClose={handleCloseFeedback}
        onReset={handleFeedbackReset}
        onContinue={handleFeedbackContinue}
        playerScore={score}
        previousScore={previousScore}
        grid={oreGrid}
      />

      {/* Save Simulation Toast Notification */}
      <SaveToast 
        message={saveToast.message}
        type={saveToast.type}
        isVisible={saveToast.show}
        onClose={handleCloseToast}
        simulationId={saveToast.simulationId}
        duration={4000}
      />
    </div>
  )
}

export default App
