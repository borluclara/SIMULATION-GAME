/**
 * Grid Manager Component
 * Handles loading, displaying, and managing the ore grid
 */

import React, { useState } from 'react';
import { useOreGrid } from '../hooks/useOreGrid';
import OreGridCanvas from './OreGridCanvas';
import { ORE_COLORS } from '../utils/OreGrid';
import './GridManager.css';

const GridManager = () => {
  const {
    grid,
    loading,
    error,
    gridStats,
    loadGrid,
    loadGridFromContent,
    applyBlast,
    resetGrid,
    isReady
  } = useOreGrid('/sample_ore_data.csv'); // Load sample data on mount

  const [cellSize, setCellSize] = useState(30);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [blastRadius, setBlastRadius] = useState(2);
  const [blastPower, setBlastPower] = useState(50);
  const [blastDirection, setBlastDirection] = useState(90);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      loadGridFromContent(e.target.result);
    };
    reader.readAsText(file);
  };

  // Handle block click for blasting
  const handleBlockClick = (block, position) => {
    if (!block || block.isDestroyed) return;

    const blastResult = applyBlast(block.x, block.y, blastRadius, blastPower);
    
    console.log('Blast applied!', {
      target: `${block.oreType} at (${block.x}, ${block.y})`,
      result: blastResult
    });
  };

  // Load sample data
  const loadSampleData = () => {
    loadGrid('/sample_ore_data.csv');
  };

  return (
    <>
      {/* Score and Status Cards */}
      <div className="grid grid-cols-2 gap-4 px-4">
        <div className="rounded-lg border border-white/20 dark:border-white/20 bg-primary/10 dark:bg-primary/20 p-4">
          <p className="text-sm font-medium text-white/80 dark:text-white/80">Score</p>
          <p className="text-2xl font-bold text-white dark:text-white">{gridStats.totalBlocks * 100}</p>
        </div>
        <div className="rounded-lg border border-white/20 dark:border-white/20 bg-primary/10 dark:bg-primary/20 p-4">
          <p className="text-sm font-medium text-white/80 dark:text-white/80">Status</p>
          <p className="text-2xl font-bold text-white dark:text-white">{loading ? 'Loading' : isReady ? 'Ready' : 'Error'}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner"></div>
          <p className="ml-4 text-white/80">Loading grid data...</p>
        </div>
      )}

      {error && (
        <div className="mx-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
          <p className="text-white">Error: {error}</p>
          <button onClick={loadSampleData} className="mt-2 px-4 py-2 bg-primary text-background-dark rounded font-medium">
            Try Sample Data
          </button>
        </div>
      )}

      {isReady && (
        <>
          {/* Ore Zone Canvas */}
          <div className="px-4 mt-6">
            <h2 className="text-lg font-bold text-white dark:text-white mb-2">Ore Zone Canvas</h2>
            <div className="aspect-[4/3] w-full rounded-lg overflow-hidden">
              <OreGridCanvas
                grid={grid}
                onBlockClick={handleBlockClick}
                cellSize={cellSize}
                showGrid={showGrid}
                showLabels={showLabels}
              />
            </div>
          </div>

          {/* Blast Tool Panel */}
          <div className="px-4 mt-6">
            <h2 className="text-lg font-bold text-white dark:text-white mb-2">Blast Tool Panel</h2>
            <div className="space-y-4 rounded-lg border border-white/20 dark:border-white/20 bg-primary/10 dark:bg-primary/20 p-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-base font-medium text-white dark:text-white">Power</label>
                  <span className="text-sm font-normal text-white/80 dark:text-white/80">{blastPower}</span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-white/20 dark:bg-white/20">
                  <div 
                    className="absolute h-2 rounded-full bg-primary"
                    style={{ width: `${(blastPower / 200) * 100}%` }}
                  ></div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={blastPower}
                    onChange={(e) => setBlastPower(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute -top-1 size-4 rounded-full bg-white border-2 border-primary cursor-pointer"
                    style={{ left: `calc(${(blastPower / 200) * 100}% - 8px)` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-base font-medium text-white dark:text-white">Direction</label>
                  <span className="text-sm font-normal text-white/80 dark:text-white/80">{blastDirection}°</span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-white/20 dark:bg-white/20">
                  <div 
                    className="absolute h-2 rounded-full bg-primary"
                    style={{ width: `${(blastDirection / 360) * 100}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={blastDirection}
                    onChange={(e) => setBlastDirection(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute -top-1 size-4 rounded-full bg-white border-2 border-primary cursor-pointer"
                    style={{ left: `calc(${(blastDirection / 360) * 100}% - 8px)` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 mt-6 grid grid-cols-2 gap-3">
            <button className="col-span-2 w-full h-12 flex items-center justify-center rounded-lg bg-primary text-background-dark font-bold text-sm tracking-wide">
              Run Simulation
            </button>
            <button 
              onClick={resetGrid}
              className="w-full h-12 flex items-center justify-center rounded-lg bg-primary/20 dark:bg-primary/30 text-white font-bold text-sm tracking-wide"
            >
              Reset
            </button>
            <button className="w-full h-12 flex items-center justify-center rounded-lg bg-primary/20 dark:bg-primary/30 text-white font-bold text-sm tracking-wide">
              Save
            </button>
            <button className="col-span-2 w-full h-12 flex items-center justify-center rounded-lg bg-primary/20 dark:bg-primary/30 text-white font-bold text-sm tracking-wide">
              Replay
            </button>
          </div>

          {/* Score & Feedback */}
          <div className="px-4 mt-6">
            <h2 className="text-lg font-bold text-white dark:text-white mb-2">Score & Feedback</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-primary/10 dark:bg-primary/20 p-4">
                <p className="text-sm font-medium text-white/80 dark:text-white/80">Mineral Recovery</p>
                <p className="text-2xl font-bold text-white dark:text-white">{gridStats.survivalRate}%</p>
                <p className="text-base font-medium text-primary">+5%</p>
              </div>
              <div className="rounded-lg bg-primary/10 dark:bg-primary/20 p-4">
                <p className="text-sm font-medium text-white/80 dark:text-white/80">Dilution</p>
                <p className="text-2xl font-bold text-white dark:text-white">{100 - gridStats.survivalRate}%</p>
                <p className="text-base font-medium text-red-500">-2%</p>
              </div>
            </div>
          </div>

          {/* Hidden file upload for CSV loading */}
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            id="csv-upload"
            className="hidden"
          />
        </>
      )}
    </>
  );
};

export default GridManager;