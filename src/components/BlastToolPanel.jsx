import React from 'react'
import './BlastToolPanel.css'

const BlastToolPanel = ({ 
  blastPower, 
  setBlastPower, 
  blastDirection, 
  setBlastDirection, 
  onSimulate, 
  onReset 
}) => {
  // Helper function to get direction name
  const getDirectionName = (angle) => {
    const directions = [
      { name: 'North', angle: 0 },
      { name: 'NE', angle: 45 },
      { name: 'East', angle: 90 },
      { name: 'SE', angle: 135 },
      { name: 'South', angle: 180 },
      { name: 'SW', angle: 225 },
      { name: 'West', angle: 270 },
      { name: 'NW', angle: 315 }
    ];
    
    const closest = directions.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.angle - angle);
      const currDiff = Math.abs(curr.angle - angle);
      return currDiff < prevDiff ? curr : prev;
    });
    
    return closest.name;
  };

  // Arrow button handlers
  const handleDirectionClick = (angle) => {
    setBlastDirection(angle);
  };

  return (
    <div className="blast-tool-panel">
      <h3 className="panel-title">Blast Tool Panel</h3>
      
      <div className="slider-container">
        <div className="slider-label">
          <span>Blast Power</span>
          <span className="slider-value">{blastPower}</span>
        </div>
        <input
          id="blast-power"
          type="range"
          min="100"
          max="1000"
          value={blastPower}
          onChange={(e) => setBlastPower(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="slider-container">
        <div className="slider-label">
          <span>Blast Direction</span>
          <span className="slider-value">{blastDirection}° ({getDirectionName(blastDirection)})</span>
        </div>
        <input
          id="blast-direction"
          type="range"
          min="0"
          max="360"
          value={blastDirection}
          onChange={(e) => setBlastDirection(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="control-buttons">
        <button 
          className="blast-button run-simulation"
          onClick={onSimulate}
        >
          Run Simulation
        </button>
        <div className="button-row">
          <button 
            className="blast-button reset"
            onClick={onReset}
          >
            Reset
          </button>
          <button 
            className="blast-button save"
            onClick={() => console.log('Save functionality')}
          >
            Save
          </button>
        </div>
        <button 
          className="blast-button replay"
          onClick={() => console.log('Replay functionality')}
        >
          Replay
        </button>
      </div>
    </div>
  )
}

export default BlastToolPanel