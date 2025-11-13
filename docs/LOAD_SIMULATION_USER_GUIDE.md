# Load Simulation Feature - Quick User Guide

## 🎮 How to Use the Load Simulation Feature

### Saving Your Game

1. **Locate the Save/Load Panel**
   - Look for the collapsible panel on the right side of the game screen
   - Click the expand button if it's collapsed

2. **Click "Save Game"**
   - Your current game state is instantly saved to your browser
   - You'll see a success message confirming the save
   - Save includes: player name, score, grid state, blast positions, and settings

### Loading a Saved Game

1. **Click "Load/Import" Button**
   - Opens a modal showing all your saved games

2. **Browse Your Saves**
   - Each save shows:
     - 📝 Save name (player name + date)
     - 👤 Player name
     - ⭐ Score
     - 💥 Number of blasts placed
     - 🕒 When it was saved

3. **Find Your Save**
   - Use the **search box** to filter by name or date
   - **Sort** by Recent, Score, or Name
   - Saves with issues show warning badges:
     - 🔴 "Corrupted" - Cannot be loaded
     - 🟡 "Incompatible" - Different version

4. **Load the Save**
   - Click the green "Load" button
   - Game will restore to exactly where you left off
   - You'll be taken directly to the game view

### Managing Your Saves

#### Export a Save
- Click the download icon (↓) next to any save
- Downloads a .json file you can share or backup

#### Delete a Save
- Click the trash icon (🗑️) next to any save
- Confirm the deletion
- Cannot be undone!

#### Import a Save
- Drag and drop a .json save file onto the drop zone
- OR click "Load/Import" and select a file
- Save will be added to your list

## 🎯 Tips & Tricks

1. **Quick Access**: The panel collapses to save screen space - just click to expand

2. **Search Saves**: Use the search box to quickly find saves by player name or date

3. **Sort Options**:
   - **Recent**: Shows newest saves first
   - **Score**: Highest scores at the top
   - **Name**: Alphabetical order

4. **Storage**: Saves are stored in your browser - they persist until you clear browser data

5. **Multiple Players**: Each save remembers the player name, so multiple people can use the same browser

## ⚠️ Important Notes

- **Browser Storage**: Saves are stored locally in your browser (not on a server)
- **Clear Browser Data**: If you clear your browser's data, saves will be lost
- **Backup Important Saves**: Use the export feature to backup saves you want to keep
- **Storage Limit**: Browser has a storage limit (~5-10MB) - delete old saves if needed

## 🐛 Troubleshooting

### "Corrupted" Badge
- The save file is damaged and cannot be loaded
- Delete it to free up space

### "Incompatible" Badge
- Save is from a different version of the game
- Cannot be loaded, but can be exported/deleted

### Save Not Appearing
- Make sure you clicked "Save Game" and saw success message
- Check if you're in the same browser
- Try refreshing the page

### Load Failed
- Check if the save shows any error badges
- Try reloading the page and trying again
- If persists, delete and create a new save

## 🔄 What Gets Saved?

When you save a game, the following is stored:

✅ Player name  
✅ Current score  
✅ Entire grid/map state  
✅ All placed blast markers  
✅ Blast power settings  
✅ Blast direction settings  
✅ Mineral recovery stats  
✅ Dilution stats  
✅ Current scenario info  

## 🚀 Quick Start Example

1. Play the game, place some blasts, earn points
2. Click Save Game → Success! ✅
3. Close the browser or play more
4. Come back later
5. Click Load/Import
6. Click Load on your save
7. Continue exactly where you left off! 🎉

---

**Need More Help?** Check the full implementation documentation in `LOAD_SIMULATION_IMPLEMENTATION.md`
