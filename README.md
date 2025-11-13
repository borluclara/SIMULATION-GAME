# AI Blast Simulation Game 💥

A sophisticated 2D blast simulation game built with React and JavaScript, featuring realistic explosion physics, particle systems, and interactive controls.

## Features

### 🎮 Core Gameplay
- **Interactive Explosions**: Click anywhere on the canvas to create dynamic explosions
- **Real-time Physics**: Realistic particle physics with gravity, friction, and collision detection
- **Visual Effects**: Stunning explosion effects with particle systems and blast waves
- **Ambient Particles**: Background particles that create an atmospheric environment

### 💾 Save & Load System (NEW!)
- **Save Progress**: Save your game state to browser localStorage with one click
- **Load Saves**: View and manage all your saved games in a beautiful modal interface
- **Search & Sort**: Find saves quickly with search and sort by date, score, or name
- **Export/Import**: Download saves as JSON files or import external saves
- **Auto-recovery**: Resume exactly where you left off with complete state restoration
- **Error Handling**: Smart detection of corrupted or incompatible saves

### ⚙️ Simulation Controls
- **Physics Parameters**: Adjust gravity, friction, and time scale in real-time
- **Explosion Settings**: Control explosion intensity and particle count
- **Preset Configurations**: Quick access to different simulation modes
- **Start/Pause/Reset**: Full control over the simulation state

### 🎨 Visual Design
- **Dark Theme**: Professional dark interface with orange accent colors
- **Responsive Design**: Optimized for desktop and mobile devices
- **Smooth Animations**: 60fps game loop with optimized rendering
- **Accessibility**: High contrast support and keyboard navigation

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

3. **Open your browser**
   Navigate to `http://localhost:3000` to see the application

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run preview` - Serves the production build locally

## How to Play

1. **Start the Simulation**: Click the "Start Simulation" button
2. **Upload CSV Data**: Upload your ore grid CSV file (or use sample data)
3. **Enter Player Name**: Provide your name to track your progress
4. **Place Explosives**: Enable placement mode and click on grid cells to place directional blasts
5. **Trigger Blasts**: Detonate all placed explosives to see realistic physics
6. **Save Progress**: Click "Save Game" to save your current state
7. **Load Saves**: Click "Load/Import" to view and load previous saves
8. **Adjust Settings**: Use the control panel to modify blast parameters
9. **Export Data**: Export your grid data or save files for backup

### Save/Load Features
- **Quick Save**: One-click save to browser storage
- **Browse Saves**: View all saves with player, score, and timestamp
- **Search**: Filter saves by name, player, or date
- **Sort**: Order by recent, score, or name
- **Load**: Resume from any saved point
- **Export**: Download saves as JSON files
- **Import**: Load external save files
- **Delete**: Remove unwanted saves with confirmation

## Project Structure

```
src/
├── components/
│   ├── Game/
│   │   ├── GameCanvas.js          # Main game canvas component
│   │   └── GameCanvas.css         # Canvas styling
│   ├── UI/
│   │   ├── Header.js              # Application header
│   │   ├── Header.css             # Header styling
│   │   ├── ControlPanel.js        # Settings and controls
│   │   ├── ControlPanel.css       # Control panel styling
│   │   ├── SaveLoadPanel.jsx      # Save/Load panel component
│   │   ├── SavedSessionsModal.jsx # Save browser modal (NEW!)
│   │   └── SavedSessionsModal.css # Modal styling (NEW!)
│   └── [Other components...]
├── engine/
│   ├── GameEngine.js              # Core game engine
│   ├── Particle.js                # Particle class
│   └── Explosion.js               # Explosion effects
├── utils/
│   ├── Physics.js                 # Physics calculations
│   ├── SaveLoadManager.js         # Save/Load manager (NEW!)
│   └── [Other utilities...]
├── styles/
│   └── App.css                    # Global app styling
├── App.js                         # Main application component
├── index.js                       # Application entry point
└── index.css                      # Global styles
```

## Documentation

### User Guides
- **[Load Simulation User Guide](docs/LOAD_SIMULATION_USER_GUIDE.md)** - How to use save/load features
- **[Visual Workflow Guide](docs/LOAD_SIMULATION_VISUAL_GUIDE.md)** - Visual diagrams and UI overview

### Technical Documentation
- **[Implementation Details](LOAD_SIMULATION_IMPLEMENTATION.md)** - Complete technical documentation
- **[Feature Summary](LOAD_SIMULATION_SUMMARY.md)** - Implementation summary and testing

### Quick Reference
- **[Quick Reference](QUICK_REFERENCE.md)** - Quick reference for all features

## Technical Implementation

### Save/Load System (NEW!)
- **localStorage Integration**: Browser-based persistent storage
- **Version Control**: Automatic compatibility checking (v1.0.0)
- **Data Validation**: Multi-layer validation for save integrity
- **Error Recovery**: Graceful handling of corrupted or incompatible saves
- **Efficient Storage**: Optimized JSON serialization
- **Export/Import**: File-based backup and sharing

### Game Engine Architecture
- **Component-based Design**: Modular React components for UI and game logic
- **Entity System**: Separate classes for particles, explosions, and physics
- **Optimized Rendering**: Canvas 2D API with efficient drawing operations
- **Performance Monitoring**: Real-time particle and explosion counters

### Physics System
- **Gravity Simulation**: Configurable gravitational force affecting particles
- **Collision Detection**: Boundary collision with realistic bounce physics
- **Particle Dynamics**: Velocity, acceleration, and life-cycle management
- **Blast Wave Propagation**: Realistic explosion force application

## Browser Compatibility

- ✅ Chrome/Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ✅ Opera (v76+)
- ⚠️ Requires localStorage support for save/load features

## License

This project is licensed under the MIT License.

---

**Enjoy creating spectacular explosions!** 🚀💥
