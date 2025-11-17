# AI Blast Simulation Game 💥

A sophisticated 2D blast simulation game built with React and JavaScript, featuring realistic explosion physics, particle systems, and interactive controls.

## Features

### 🎮 Core Gameplay
- **Interactive Grid System**: Visual ore grid with CSV data loading
- **Realistic Blast Physics**: Material-based displacement using density and hardness properties
- **Strategic Placement**: Place blast markers with directional control
- **Score & Feedback**: Real-time evaluation of mineral recovery and dilution
- **Save/Load System**: Persistent game state with session management

### ⚙️ Material Property System ✨ NEW
- **Material-Based Physics**: Each material (gold, iron, coal, etc.) behaves differently based on real geological properties
- **Density Effects**: Dense materials (gold 19.3 g/cm³) barely move, light materials (soil 1.3 g/cm³) fly far
- **Hardness Integration**: Soft materials (coal, hardness 2) fragment easily, hard materials (diamond, hardness 10) resist
- **Fragmentation Index**: Controls particle count - limestone (0.8) shatters into 18+ pieces, granite (0.3) creates 11 chunks
- **Blast Resistance**: Materials resist damage differently - granite (0.7) absorbs 70% damage, soil (0.1) only 10%
- **CSV Loading**: Load material properties from CSV with density, hardness, fragmentation_index, blast_resistance columns

### 🎨 Visual Design
- **Material-Specific Colors**: Each material has distinct colors (gold=#FFD700, diamond=#B9F2FF, coal=#2F2F2F)
- **Texture Effects**: Visual indicators for hardness (metallic shine), density (border thickness), fragmentation (grain patterns)
- **Type Markers**: Gold corners for ore, gray corners for waste materials
- **Responsive Grid**: Optimized rendering for large grids with 60fps target
- **Dark Theme**: Professional interface with green scoring theme

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

1. **Load CSV Data**: Upload a CSV file with ore grid data (or use sample data)
2. **Place Blast Markers**: Click on grid to place explosives, set power and direction
3. **Trigger Blast**: Click "Trigger Blast" to simulate explosion
4. **Observe Physics**: Watch materials behave differently:
   - Dense materials (gold, iron) barely move
   - Light materials (soil, coal) fly far
   - Fragile materials (limestone) shatter into many pieces
   - Hard materials (granite, diamond) resist fragmentation
5. **Review Results**: Check mineral recovery rate, dilution percentage, and score
6. **Save Progress**: Use Save/Load panel to preserve your simulation state

### Material Behavior Guide
- **Gold** (density 19.3): Minimal displacement, large chunks, high value
- **Iron** (density 5.3): Moderate movement, balanced fragmentation
- **Coal** (density 1.3): Flies far, creates many small particles
- **Limestone** (frag 0.8): Shatters easily into 18+ fragments
- **Granite** (blast_res 0.7): Resists 70% of blast damage
- **Diamond** (hardness 10): Extremely resistant, barely fragments

See `docs/MATERIAL_PROPERTIES_GUIDE.md` for complete material reference.

## Project Structure

```
src/
├── components/
│   ├── OreGridCanvas.jsx          # Main grid rendering with material effects
│   ├── BlastToolPanel.jsx         # Blast controls and settings
│   ├── BlastPlacementPanel.jsx    # Marker placement interface
│   ├── ScoreFeedback.jsx          # Recovery and dilution metrics
│   ├── MaterialLegend.jsx         # Material type reference
│   └── SaveLoadPanel.jsx          # Save/load game state
├── utils/
│   ├── MaterialPropertyHandler.js # ⭐ Material property system (NEW)
│   ├── PhysicsEngine.js           # ⭐ Material-based blast physics (ENHANCED)
│   ├── OreGrid.js                 # Grid data and block management
│   ├── BlastEvaluator.js          # Scoring system
│   ├── BlastAnimationEngine.js    # GSAP-based animations
│   ├── BlastHistoryStore.js       # Blast history tracking
│   └── SaveLoadManager.js         # Session persistence
├── hooks/
│   ├── useGameState.js            # Global game state
│   ├── useOreGrid.js              # Grid state management
│   └── useBlastHistory.js         # History management
├── public/
│   ├── enhanced_ore_data.csv      # ⭐ Sample CSV with material properties
│   └── sample_ore_data.csv        # Basic sample data
└── docs/
    ├── MATERIAL_PROPERTIES_GUIDE.md    # ⭐ User guide for materials
    └── MATERIAL_PROPERTY_IMPLEMENTATION.md # ⭐ Technical documentation
```

⭐ = Material Property System files (NEW)

## Technical Implementation

### Material Property System 🆕
- **CSV Integration**: Loads density, hardness, fragmentation_index, blast_resistance from CSV
- **Physics Coefficients**: Density factor (3.0/√density), hardness factor ((12-h)/8), fragmentation multiplier
- **Displacement Calculation**: Light materials move 4.8x farther than dense materials
- **Particle Generation**: Fragile materials create 18+ particles, hard materials create 8-11 particles
- **Visual Rendering**: Material-specific colors, textures, borders based on properties
- **Performance**: <0.1ms per block, deterministic calculations, cached lookups

### Blast Physics Engine
- **Matter.js Integration**: Realistic particle physics with gravity, friction, collision
- **Material-Based Forces**: Force calculations modified by density, hardness, fragmentation
- **Directional Blasts**: Configurable blast direction (N/S/E/W)
- **Decay Models**: Hybrid exponential-linear force decay with distance
- **Particle Systems**: Dynamic debris with rotation, bounce, settling behavior

### Scoring System
- **Recovery Rate**: Percentage of ore successfully collected (count-based and value-weighted)
- **Dilution Rate**: Percentage of waste contamination in collection zone
- **Multi-Ore Support**: Tracks gold, chalcopyrite, hematite, magnetite separately
- **Letter Grades**: A/B/C/D/F based on weighted score formula
- **Performance**: <3ms evaluation time for 1000+ blocks

### Save/Load System
- **LocalStorage Persistence**: Browser-based save system with version control
- **Session Management**: Search, sort, filter saved games by date/score/name
- **Export/Import**: JSON file export for sharing simulations
- **State Recovery**: Complete restoration of grid, blasts, scores, history

## CSV Format

### Basic Format (Backward Compatible)
```csv
x,y,ore_type,hardness,value
0,0,gold,3,100
1,0,iron,6,50
```

### Enhanced Format with Material Properties 🆕
```csv
x,y,ore_type,hardness,value,density,fragmentation_index,blast_resistance
0,0,gold,3,100,19.3,0.7,0.3
1,0,iron,6,50,5.3,0.5,0.6
2,0,coal,2,15,1.3,0.8,0.2
3,0,granite,6,0,2.6,0.3,0.7
```

### Column Definitions
- **x, y**: Grid coordinates (required)
- **ore_type**: Material name - gold, iron, coal, granite, etc. (required)
- **hardness**: Mohs hardness scale 0-10 (optional, default: 5)
- **value**: Economic value 0-500 (optional, default: varies by type)
- **density**: Density in g/cm³, range 1-25 (optional, default: 2.7)
- **fragmentation_index**: Fragmentation tendency 0-1 (optional, default: 0.5)
- **blast_resistance**: Damage resistance 0-1 (optional, default: 0.5)

See `public/enhanced_ore_data.csv` for complete example.

---

## Documentation

### Quick References
- **Material Properties Guide**: `docs/MATERIAL_PROPERTIES_GUIDE.md` - User-friendly material reference
- **Implementation Details**: `MATERIAL_PROPERTY_IMPLEMENTATION.md` - Technical documentation
- **Feature Summary**: `MATERIAL_PROPERTY_FEATURE_SUMMARY.md` - Executive overview
- **Blast System**: `BLAST_ANIMATION_SYSTEM.md` - Animation and physics details
- **Scoring Guide**: `docs/SCORING_SYSTEM_GUIDE.md` - Evaluation metrics

---

## License

This project is licensed under the MIT License.

---

**Enjoy realistic blast physics with material properties!** 💥⛏️🪨
