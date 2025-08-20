# Danny Game - Linera Integration

## Description
This is the frontend for Danny Game with Linera blockchain integration through orchestrator.

## Project Setup

### 1. Start Orchestrator
First, start the orchestrator:
```bash
cd c:\linera-app
node player-name-orchestrator.js
```
Orchestrator will be available at `http://localhost:3001`

### 2. Start Frontend
In a new terminal, start the frontend:
```bash
cd c:\linera-app\player-name\frontend
node start-server.js
```
Game will be available at `http://localhost:8080`

## Functionality

### Automatic Initialization
When visiting the site, automatically:
1. Creates new chain
2. Adds application using module ID
3. Prompts for player name

### Available Functions
- **Add coins**: `window.lineraSDK.addCoins(amount)`
- **Add health**: `window.lineraSDK.addHealth(amount)`
- **Get statistics**: `window.lineraSDK.fetchPlayerStats()`
- **Change name**: `window.lineraSDK.setPlayerName(name)`

### Game Integration
In `game.js` file you can use:
```javascript
// Add coins after killing enemy
window.lineraSDK.addCoins(10);

// Add health after picking up health pack
window.lineraSDK.addHealth(25);

// Get current statistics
const stats = window.lineraSDK.getPlayerStats();
console.log('Coins:', stats.totalCoins);
console.log('Health:', stats.health);
```

## File Structure
- `index.html` - Main game page
- `js/linera-sdk-integration.js` - Linera integration through orchestrator
- `js/game.js` - Game logic
- `css/` - Styles
- `assets/` - Game assets
- `start-server.js` - HTTP server for frontend

## Configuration
All settings are located in `js/linera-sdk-integration.js`:
- `ORCHESTRATOR_URL` - Orchestrator URL
- `MODULE_ID` - Application module ID

## Troubleshooting

### CORS Error
Make sure you use `start-server.js` to run the frontend, not opening files directly in the browser.

### Orchestrator Not Responding
Make sure the orchestrator is running on port 3001:
```bash
netstat -an | findstr :3001
```

### SharedArrayBuffer Not Supported
Use `start-server.js` - it sets up the necessary CORS headers.