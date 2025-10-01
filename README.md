# AI Blast Simulation Game 💥

A sophisticated 2D blast simulation game built with React and JavaScript, featuring realistic explosion physics, particle systems, and interactive controls.

## Features

### 🎮 Core Gameplay
- **Interactive Explosions**: Click anywhere on the canvas to create dynamic explosions
- **Real-time Physics**: Realistic particle physics with gravity, friction, and collision detection
- **Visual Effects**: Stunning explosion effects with particle systems and blast waves
- **Ambient Particles**: Background particles that create an atmospheric environment

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
2. **Create Explosions**: Click anywhere on the dark canvas area
3. **Adjust Settings**: Use the control panel to modify physics parameters
4. **Try Presets**: Use preset buttons for different simulation modes
5. **Reset**: Clear all particles and start fresh

## Project Structure

```
src/
├── components/
│   ├── Game/
│   │   ├── GameCanvas.js          # Main game canvas component
│   │   └── GameCanvas.css         # Canvas styling
│   └── UI/
│       ├── Header.js              # Application header
│       ├── Header.css             # Header styling
│       ├── ControlPanel.js        # Settings and controls
│       └── ControlPanel.css       # Control panel styling
├── engine/
│   ├── GameEngine.js              # Core game engine
│   ├── Particle.js                # Particle class
│   └── Explosion.js               # Explosion effects
├── utils/
│   └── Physics.js                 # Physics calculations
├── styles/
│   └── App.css                    # Global app styling
├── App.js                         # Main application component
├── index.js                       # Application entry point
└── index.css                      # Global styles
```

## Technical Implementation

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

## License

This project is licensed under the MIT License.

---

**Enjoy creating spectacular explosions!** 🚀💥
