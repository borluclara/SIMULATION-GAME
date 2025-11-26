import React from 'react'
import './BlastToolPanel.css'

const BlastToolPanel = ({ 
  blastPower, 
  setBlastPower, 
  blastDirection, 
  setBlastDirection, 
  onSimulate, 
  onReset,
  onReplay = () => {},
  onReplayPause = () => {},
  onReplayResume = () => {},
  onReplayStep = () => {},
  replayStatus = 'idle',
  replayProgress = 0,
  canReplay = false
}) => {
  const directionGrid = [
    [
      { angle: 315, label: '↖', name: 'Northwest' },
      { angle: 0, label: '↑', name: 'North' },
      { angle: 45, label: '↗', name: 'Northeast' }
    ],
    [
      { angle: 270, label: '←', name: 'West' },
      { center: true },
      { angle: 90, label: '→', name: 'East' }
    ],
    [
      { angle: 225, label: '↙', name: 'Southwest' },
      { angle: 180, label: '↓', name: 'South' },
      { angle: 135, label: '↘', name: 'Southeast' }
    ]
  ];

  // Helper function to get precise direction name following real-world bearing conventions
  const getDirectionName = (degrees) => {
    const normalized = ((degrees % 360) + 360) % 360;
    
    if (normalized === 0 || normalized === 360) return "North";
    if (normalized > 0 && normalized < 90) return "Northeast";
    if (normalized === 90) return "East";
    if (normalized > 90 && normalized < 180) return "Southeast";
    if (normalized === 180) return "South";
    if (normalized > 180 && normalized < 270) return "Southwest";
    if (normalized === 270) return "West";
    if (normalized > 270 && normalized < 360) return "Northwest";
    
    return "Unknown";
  };

  // Arrow button handlers
  const handleDirectionClick = (angle) => {
    setBlastDirection(angle);
  };

  const isReplaying = replayStatus === 'playing' || replayStatus === 'preparing';

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

      <div className="direction-container">
        <div className="slider-label">
          <span>Blast Direction</span>
          <span className="slider-value">{blastDirection}° ({getDirectionName(blastDirection)})</span>
        </div>
        <div className="direction-grid" role="group" aria-label="Select blast direction">
          {directionGrid.flat().map((cell, index) => {
            if (cell.center) {
              return (
                <div key={`center-${index}`} className="direction-center" aria-hidden="true">
                  <span className="material-symbols-outlined">explosion</span>
                </div>
              );
            }

            const isActive = blastDirection === cell.angle;
            return (
              <button
                key={`${cell.name}-${cell.angle}`}
                type="button"
                className={`direction-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleDirectionClick(cell.angle)}
                title={`${cell.name} (${cell.angle}°)`}
                aria-label={`${cell.name} direction`}
              >
                {cell.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="control-buttons">
        <div className="button-row">
          <button 
            className="blast-button reset"
            onClick={onReset}
          >
            Reset
          </button>
          <button 
            className="blast-button replay"
            onClick={onReplay}
            disabled={!canReplay || isReplaying}
          >
            {isReplaying ? 'Replaying…' : 'Replay'}
          </button>
        </div>

        {replayStatus !== 'idle' && (
          <div className="replay-controls-inline">
            <div className="mini-buttons">
              {isReplaying ? (
                <button className="blast-button" onClick={onReplayPause}>
                  Pause
                </button>
              ) : (
                <button
                  className="blast-button"
                  onClick={onReplayResume}
                  disabled={replayStatus === 'idle'}
                >
                  Resume
                </button>
              )}
              <button
                className="blast-button"
                onClick={onReplayStep}
                disabled={isReplaying}
              >
                Step
              </button>
            </div>
            <div className="replay-progress">
              <div
                className="replay-progress-bar"
                style={{ width: `${Math.min(100, Math.max(0, (replayProgress || 0) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BlastToolPanel