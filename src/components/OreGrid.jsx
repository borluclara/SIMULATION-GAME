import React from 'react';

function OreGrid({ data }) {
  if (!data || data.length === 0) return null;

  // Determine grid size
  const maxX = Math.max(...data.map(cell => parseInt(cell.x)));
  const maxY = Math.max(...data.map(cell => parseInt(cell.y)));

  // Build 2D grid
  const grid = Array.from({ length: maxY + 1 }, () =>
    Array.from({ length: maxX + 1 }, () => null)
  );

  data.forEach(cell => {
    const x = parseInt(cell.x);
    const y = parseInt(cell.y);
    grid[y][x] = cell.oreType || 'Empty';
  });

  return (
    <div className="flex flex-col gap-1 p-4">
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((ore, colIndex) => (
            <div
              key={colIndex}
              className={`w-10 h-10 flex items-center justify-center text-xs font-bold rounded shadow-lg transform transition-all duration-200 hover:scale-105 ${
                ore === 'Iron' ? 'bg-gray-700 text-white border border-accent-green/30' :
                ore === 'Copper' ? 'bg-orange-600 text-white border border-accent-green/30' :
                ore === 'Gold' ? 'bg-yellow-400 text-black border border-accent-green/30' :
                'bg-slate-800 text-white border border-accent-green/20'
              }`}
            >
              {ore[0]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default OreGrid;