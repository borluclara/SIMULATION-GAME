# Load Simulation Feature - Visual Workflow

## 🎨 User Interface Overview

### Save/Load Panel (Right Side)

```
┌─────────────────────────┐
│  📁 File Manager        │
├─────────────────────────┤
│  [💾 Save Game]         │
│  [📂 Load/Import]       │
│  [📥 Export CSV]        │
├─────────────────────────┤
│  ☁️ Drop files here     │
│     or click Load       │
├─────────────────────────┤
│  ℹ️ Info:               │
│  • Save: Game → JSON    │
│  • Export: Grid → CSV   │
│  • Load: Both formats   │
└─────────────────────────┘
```

## 📋 Workflow Diagrams

### 1. Saving a Game

```
User Playing Game
       ↓
[Click "Save Game" button]
       ↓
SaveLoadManager.saveGame()
       ↓
Create Save Object with:
- ID (timestamp-based)
- Version (1.0.0)
- Timestamp
- Save Name
- Complete Game State
       ↓
Store in localStorage
       ↓
Update Save Index
       ↓
✅ Success Message
"Game saved to browser storage!"
```

### 2. Loading a Game

```
User at Home/Game Screen
       ↓
[Click "Load/Import" button]
       ↓
SaveLoadManager.getAllSaves()
       ↓
┌─────────────────────────────────────┐
│  Load Simulation Modal              │
├─────────────────────────────────────┤
│  🔍 Search: [____________]  Sort: ▼ │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ 📝 Alice - 11/13/2025, 2:30 PM│  │
│  │ 👤 Alice  ⭐ 1500  💥 3 blasts│  │
│  │ 🕒 2 hours ago               │  │
│  │ [▶️ Load] [⬇️] [🗑️]          │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 📝 Bob - 11/12/2025, 5:15 PM  │  │
│  │ 👤 Bob  ⭐ 2800  💥 5 blasts  │  │
│  │ 🕒 1 day ago                 │  │
│  │ [▶️ Load] [⬇️] [🗑️]          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
       ↓
[User clicks Load button]
       ↓
SaveLoadManager.loadGame(saveId)
       ↓
Validate & Parse Save Data
       ↓
Check Version Compatibility
       ↓
App.handleLoad(gameState)
       ↓
Restore All Game State:
- Player Name
- Score
- CSV Data → Grid
- Blast Markers
- Settings
       ↓
Switch to Game View
       ↓
✅ Success Message
"Loaded: Alice - 11/13/2025, 2:30 PM"
       ↓
Continue Playing!
```

### 3. Error Handling Flow

```
Load Game Attempt
       ↓
     ┌─────────────┐
     │ Check Save  │
     └─────────────┘
           ↓
    Is Valid JSON?
    ╱           ╲
  YES            NO
   ↓              ↓
Has Version?    ❌ Error
╱          ╲     "Corrupted"
YES         NO      ↓
↓           ↓    Show Badge
Compatible? Invalid  Can't Load
╱      ╲    Format
YES     NO      ↓
↓       ↓    ❌ Error
Load   ⚠️ Warning
✅      "Incompatible"
        ↓
     Show Badge
        ↓
     Can't Load
```

## 🎯 Feature States

### Save Card States

#### 1. Normal/Compatible Save
```
┌─────────────────────────────────┐
│ 📝 Player - 11/13/2025, 2:30 PM │  ← Green border
│ 👤 Player  ⭐ 1500  💥 3 blasts │
│ 🕒 2 hours ago                 │
│ [▶️ Load] [⬇️] [🗑️]            │  ← All buttons enabled
└─────────────────────────────────┘
```

#### 2. Corrupted Save
```
┌─────────────────────────────────┐
│ 📝 Corrupted Save ⚠️ Corrupted  │  ← Red border + badge
│ 👤 Unknown  ⭐ 0  💥 0 blasts   │
│ 🕒 Unknown                     │
│ [▶️ Load] [⬇️] [🗑️]            │  ← Load disabled
│   (disabled)                   │
└─────────────────────────────────┘
```

#### 3. Incompatible Version
```
┌─────────────────────────────────┐
│ 📝 Old Save ⚠️ Incompatible     │  ← Yellow border + badge
│ 👤 Player  ⭐ 1500  💥 3 blasts │
│ 🕒 1 week ago                  │
│ [▶️ Load] [⬇️] [🗑️]            │  ← Load disabled
│   (disabled)                   │
└─────────────────────────────────┘
```

## 🔄 State Transitions

### From Home Screen
```
Home Screen
    ↓
[Upload CSV] → [Enter Name] → [Start Simulation]
    ↓
Game Screen (Playing)
    ↓
[Save Game] → Save to localStorage
    ↓
Continue Playing OR Close Browser
```

### Returning User
```
Home Screen
    ↓
[Load/Import] → Modal Opens
    ↓
Select Save → [Click Load]
    ↓
Game Screen (Resumed from exact point)
    ↓
Continue Playing!
```

## 📊 Data Flow

### Save Operation
```
Game State (Memory)
    ↓
Serialize to JSON
    ↓
Add Metadata (timestamp, version, name)
    ↓
localStorage.setItem(id, json)
    ↓
Update Index
    ↓
Success Feedback
```

### Load Operation
```
localStorage.getItem(id)
    ↓
Parse JSON
    ↓
Validate Structure
    ↓
Check Version
    ↓
Extract Game State
    ↓
Restore to Memory
    ↓
Rebuild Grid
    ↓
Restore UI State
    ↓
Success Feedback
```

## 🎨 Visual Elements

### Color Coding

- **Green**: Successful operations, compatible saves
- **Blue**: Information, normal state
- **Yellow**: Warnings, incompatible versions
- **Red**: Errors, corrupted saves
- **Gray**: Disabled states

### Icons Used

- 💾 Save
- 📂 Load
- 📥 Export
- 📝 Save name
- 👤 Player
- ⭐ Score
- 💥 Blasts
- 🕒 Time
- ⬇️ Download
- 🗑️ Delete
- ⚠️ Warning/Error
- ✅ Success
- ❌ Error
- 🔍 Search
- ☁️ Upload

### Animations

1. **Modal Open**: Fade in + Slide up (0.3s)
2. **Save Card Hover**: Translate right + Highlight (0.2s)
3. **Button Hover**: Lift up + Shadow (0.2s)
4. **Success Message**: Slide down + Fade (0.3s)
5. **Error Badge**: Pulse animation
6. **Delete Confirmation**: Scale in (0.2s)

## 📱 Responsive Behavior

### Desktop (> 768px)
- Modal: Centered, max-width 700px
- Panel: Fixed right side
- Cards: Single column, full width

### Mobile (≤ 768px)
- Modal: Full width, bottom sheet
- Panel: Bottom fixed
- Cards: Stack vertically
- Buttons: Full width

## 🎯 Key User Interactions

1. **Click Save** → Instant save to localStorage
2. **Click Load** → Modal opens with all saves
3. **Search** → Real-time filter
4. **Sort** → Instant re-order
5. **Load Save** → Modal closes + Game restores
6. **Delete** → Confirmation → Remove
7. **Export** → Download JSON
8. **Import** → Drag/drop or select file

---

This visual guide provides a comprehensive overview of how the Load Simulation feature works from a user's perspective.
