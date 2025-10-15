# 🎮 Quick Reference - Blast Physics System

## 🚀 Your App
**URL**: http://localhost:5175/

## ⚡ Quick Test (30 seconds)

1. Open http://localhost:5175/
2. Upload any CSV with ore data
3. Click "🎯 Place Explosives" 
4. Click on 2-3 ore cells (red X appears)
5. Click "🧨 Trigger Blast"
6. **WATCH THE DEBRIS FLY!** 💥

## 📦 What You Got

### Physics Engine ✅
- **File**: `src/utils/PhysicsEngine.js`
- **Tech**: Matter.js
- **Effect**: Realistic debris motion

### Blast Panel ✅
- **File**: `src/components/BlastPlacementPanel.jsx`
- **Controls**:
  - Place Explosives mode
  - Clear All blasts
  - Trigger Blast button
  - Physics status indicator

### Canvas Integration ✅
- **File**: `src/components/OreGridCanvas.jsx`
- **Change**: Now uses forwardRef
- **Purpose**: Allows physics overlay

## 🎯 Expected Result

```
BEFORE BLAST:
🟫🟫🟫🟫🟫
🟫🟫❌🟫🟫  ← Explosive
🟫🟫🟫🟫🟫

DURING BLAST:
     ↗️  💥  ↖️
   🟫      🟫
     ↘️     ↙️

AFTER BLAST:
       ⬇️
     ⬇️  ⬇️
   🟫 🟫 🟫  ← Falling
  ═══════════  ← Ground
```

## 🔑 Key Features

✅ **Square debris** - matches ore cells
✅ **Dark brown** - easy to see
✅ **Fast explosion** - flies outward
✅ **Rotation** - spins in air
✅ **Gravity** - falls down
✅ **Bounce** - hits ground
✅ **Auto-cleanup** - 5 seconds

## 📊 Console Logs

Press F12 to see:
```
🎮 Initializing physics engine
💥 Creating debris from X cells
✨ Created Y particles
🚀 Starting simulation
⏰ Running for 5 seconds
🧹 Cleaning up
✅ Complete
```

## 🐛 Troubleshooting

### No debris?
- **Check**: Are explosives on ore cells?
- **Fix**: Place on colored squares, not empty

### Debris too small?
- **Check**: Console says "Created X particles"
- **Should**: X > 0

### No physics happening?
- **Check**: Console for errors
- **Look for**: "🚀 Starting physics..."

## 🎨 Customization

Want to change it?

### Bigger debris:
```javascript
// PhysicsEngine.js line ~130
cellSize * 2  // Instead of cellSize - 1
```

### Different color:
```javascript
// PhysicsEngine.js line ~145
fillStyle: '#FF0000'  // Red instead of brown
```

### Faster explosion:
```javascript
// PhysicsEngine.js line ~155
x: forceX * 200  // Instead of * 100
```

## ✅ Integration Complete!

- [x] PhysicsEngine.js created
- [x] BlastPlacementPanel with physics
- [x] OreGridCanvas with forwardRef
- [x] App.jsx integrated
- [x] Server running
- [x] No errors

## 🎉 Ready to Test!

Everything is set up and running.

**Go trigger some blasts and watch the debris fly!** 💥

Your merge is complete! 🚀
