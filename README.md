# AI Blast Simulation Game 💥

A sophisticated 2D blast simulation built with React and JavaScript. Combine realistic blast physics, density-aware material behavior, and a polished save/load workflow to plan, detonate, and analyze every round like a pro engineer.

## Features

### 🎮 Core Gameplay
- **Interactive Grid System** – Load CSV ore data, inspect materials, and place directional blast markers with precision.
- **Realistic Blast Physics** – Material density, hardness, and blast resistance drive displacement, fragmentation, and scoring.
- **Interactive Explosions** – Canvas-based particle effects, shockwaves, and debris fields for every detonation.
- **Strategic Feedback Loop** – Real-time score, recovery, and dilution metrics highlight each blast’s efficiency.

### ⚙️ Material Property System ✨ NEW
- **Material-Based Physics** – Gold, iron, coal, limestone, etc. each carry real geological properties (density, hardness, fragmentation_index, blast_resistance).
- **Density Effects** – Dense materials (gold 19.3 g/cm³) barely move, while light materials (soil 1.3 g/cm³) fly far.
- **Fragmentation Logic** – Fragile rock (limestone 0.8) shatters into 18+ particles; granite (0.3) breaks into dense chunks.
- **CSV Driven** – Extend behavior instantly by uploading enhanced CSVs with physical properties.

### 💾 Save & Load System (NEW!)
- **Persistent Saves** – One-click browser storage (IndexedDB/localStorage fallback) with metadata and versioning.
- **Saved Sessions Modal** – Search, sort, and filter saves by name, score, or date in a dedicated UI.
- **Export/Import** – Download saves as JSON or restore from external files.
- **Auto-Saves** – Automatic “Auto-Save – Round N” entries keep the last three rounds without interrupting gameplay.
- **Auto-Recovery** – Resume exactly where you stopped thanks to complete state restoration, including blasts and settings.
- **Error Handling** – Corruption and compatibility checks warn players before loading questionable data.

### ⚙️ Simulation Controls
- **Blast Parameters** – Adjust power, radius, and direction in real time.
- **Physics Tweaks** – Tune gravity, friction, and time scale for experimentation.
- **Preset Modes** – Quickly flip between simulation profiles.
- **Full Session Control** – Start, pause, resume, and reset at any time.

### 🎨 Visual Design
- **Material-Specific Colors** – Gold (#FFD700), diamond (#B9F2FF), coal (#2F2F2F), etc. for instant recognition.
- **Texture & Border Indicators** – Metallic shine for very hard materials, dashed borders for light materials, grain textures for soft waste.
- **Type Markers** – Gold corner tags for ore, gray for waste.
- **Responsive Canvas** – Optimized for large grids with a 60 FPS target and reduced overdraw.
- **Dark Theme** – High-contrast layout with green scoring cues keeps long play sessions comfortable.

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
npm install
npm run dev
```
Visit `http://localhost:5173` (Vite default) to start playing.

### Available Scripts
- `npm run dev` – Run the Vite development server
- `npm run build` – Production build
- `npm run preview` – Preview the prod bundle locally
- `npm test` – Execute the Jest test suite

## How to Play
1. **Start the Simulation** – Launch the app and enter your player name.
2. **Load CSV Data** – Upload `enhanced_ore_data.csv` or your own CSV.
3. **Place Explosives** – Enter placement mode and click cells to queue directional blasts.
4. **Configure Settings** – Adjust blast power, radius, and direction.
5. **Trigger Blasts** – Detonate all placements and watch GSAP + Matter.js animations.
6. **Observe Physics** – Dense ore barely moves, light soil flies, fragile rock shatters.
7. **Review Metrics** – Recovery %, dilution %, efficiency, and material breakdowns update instantly.
8. **Save Progress** – Manual saves or automatic “Round N” saves keep your session safe.
9. **Load / Export** – Resume from any save or export data for reports.

### Material Behavior Cheat Sheet
- **Gold** – 19.3 g/cm³, minimal displacement, high value.
- **Iron/Hematite** – 5.3 g/cm³, moderate movement, balanced fragmentation.
- **Coal** – 1.3 g/cm³, long travel distance, many particles.
- **Limestone** – Frag. 0.8, shatters into 18+ pieces.
- **Granite** – Blast resistance 0.7, absorbs ~70 % damage.
- **Diamond** – Hardness 10, barely fractures.

### Save/Load Quick Actions
- **Quick Save** – Single click to browser storage.
- **Browse Saves** – Modal lists manual vs auto-saves with badges.
- **Search & Sort** – Find sessions fast by name, round, or score.
- **Export/Import** – JSON backup + restore.
- **Auto-Pruned** – Last three auto-saves retained automatically.

## Project Structure
```
src/
├── components/
│   ├── App.jsx                     # Root UI
│   ├── BlastPlacementPanel.jsx
│   ├── BlastToolPanel.jsx
│   ├── MaterialLegend.jsx
│   ├── OreGridCanvas.jsx
│   ├── SaveLoadPanel.jsx
│   ├── SavedSessionsModal.jsx      # NEW save browser
│   └── ScoreFeedback.jsx
├── hooks/
│   ├── useBlastHistory.js
│   ├── useGameState.js
│   └── useOreGrid.js
├── utils/
│   ├── BlastAnimationEngine.js
│   ├── BlastEvaluator.js
│   ├── BlastHistoryStore.js
│   ├── MaterialPropertyHandler.js
│   ├── OreGrid.js
│   ├── PhysicsEngine.js
│   ├── SaveLoadManager.js
│   └── SimulationStorage.js
├── public/
│   ├── enhanced_ore_data.csv       # Sample with density/frag columns
│   └── sample_ore_data.csv
└── docs/
   ├── MATERIAL_PROPERTIES_GUIDE.md
   ├── MATERIAL_PROPERTY_IMPLEMENTATION.md
   ├── LOAD_SIMULATION_USER_GUIDE.md
   ├── LOAD_SIMULATION_VISUAL_GUIDE.md
   └── QUICK_REFERENCE.md
```

## Technical Implementation

### Material Property System
- CSV parsing auto-loads density, hardness, fragmentation_index, blast_resistance.
- Density factor ≈ `(1 / (density / 2.7))^1.2` gives dramatic displacement contrast.
- Fragmentation and blast resistance adjust debris count, direction spread, and force.
- Color/texture helpers expose hardness, density, and frag levels for rendering.

### Save/Load Platform
- IndexedDB primary storage with localStorage fallback.
- Metadata includes `saveReason`, `autoSaveRound`, and label text for UI.
- Auto-saves triggered at the end of every blast animation (Round N) and trimmed to the three latest entries.
- Modal integrates search, sorting, load, delete, export/import, and JSON validation.
- Versioned payloads with integrity checks guard against incompatible or corrupted saves.

### Engine & Physics
- GSAP handles shockwaves, debris displacement, and screen shake.
- Matter.js simulates debris, gravity, collisions, and settling.
- Directional blasts bias force vectors; omnidirectional mode falls back to radial.
- Scoring blends recovery vs dilution with ore/waste categorization for each blast history record.

## CSV Format
```csv
x,y,ore_type,hardness,value,density,fragmentation_index,blast_resistance
0,0,gold,3,100,19.3,0.7,0.3
1,0,iron,6,50,5.3,0.5,0.6
2,0,coal,2,15,1.3,0.8,0.2
3,0,granite,6,0,2.6,0.3,0.7
```
Required columns: `x`, `y`, `ore_type`. Optional: `hardness`, `value`, `density`, `fragmentation_index`, `blast_resistance`. See `public/enhanced_ore_data.csv` for the complete template.

## Documentation & Guides
- **Material Reference** – `docs/MATERIAL_PROPERTIES_GUIDE.md`
- **Implementation Details** – `MATERIAL_PROPERTY_IMPLEMENTATION.md` & `MATERIAL_PROPERTY_FEATURE_SUMMARY.md`
- **Save/Load User Guide** – `docs/LOAD_SIMULATION_USER_GUIDE.md`
- **Visual Workflow Guide** – `docs/LOAD_SIMULATION_VISUAL_GUIDE.md`
- **Quick Reference** – `QUICK_REFERENCE.md`

## Browser Compatibility
- ✅ Chrome / Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ✅ Opera (v76+)
- ⚠️ Requires IndexedDB/localStorage for persistence

## License
MIT License. Enjoy realistic blast engineering with material-aware physics! 💥⛏️🪨
