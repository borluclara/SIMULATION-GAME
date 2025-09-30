import React from 'react'
import './App.css'
function App() {
  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="blast-icon">:boom:</span>
            <h1>WELCOME TO OUR MINERAL BLASTING SIMULATOR</h1>
          </div>
          <p className="subtitle">Experience realistic mining blast simulations</p>
        </header>
        <main className="main-content">
          <div className="simulation-area">
            <div className="blast-zone">
              <div className="rock-layer layer-1"></div>
              <div className="rock-layer layer-2"></div>
              <div className="rock-layer layer-3"></div>
              <div className="explosion-point">
                <span className="explosion">:boom:</span>
              </div>
            </div>
          </div>
          <div className="controls">
            <button className="start-btn">Start Simulation</button>
            <button className="reset-btn">Reset</button>
          </div>
        </main>
        <footer className="footer">
          <p>Advanced Mining Technology Simulation Platform</p>
        </footer>
      </div>
    </div>
  )
}
export default App