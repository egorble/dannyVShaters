# Danny Game - Linera Blockchain Game


### 🎯 Game Features

- **Real-time Multiplayer**: Battle against other players in synchronized gameplay
- **Blockchain Integration**: All game state and scores are stored on Linera blockchain
- **Modern UI**: Beautiful, responsive interface with smooth animations
- **Leaderboard System**: Track your progress and compete for the top spot
- **Cross-platform**: Play directly in your web browser

## 🚀 How to Run

### Prerequisites

- Node.js (v16 or higher)
- Linera CLI tools installed
- Active Linera wallet and chain

### 🎮 Quick Start

1. **Start the Frontend Server**
   ```bash
   cd danny-game/frontend
   node start-server.js
   ```
   The game will be available at `http://localhost:8082`

2. **Run the Orchestrator**
   ```bash
   node player-name-orchestrator.js
   ```
   This handles the blockchain communication layer.

3. **Start Linera Service**
   ```wsl
   linera service --port 8081
   ```
   Make sure your Linera service is running on port 8081.

### ⚙️ Configuration

**Important**: Before running the game, you need to update the following configuration:

- **Module ID**: Update the application module ID in the orchestrator and linera integration js file
- **Account Owner**: Set your Linera account owner address
- **Chain ID**: Configure your specific Linera chain ID

These settings can be found in the orchestrator configuration files.

## 🏗️ Project Structure

```
danny-game/
├── src/                    # Rust smart contract code
│   ├── contract.rs        # Main contract logic
│   ├── service.rs         # Service layer
│   ├── state.rs          # Game state management
│   └── lib.rs            # Library exports
├── frontend/              # Web frontend
│   ├── index.html        # Main game interface
│   ├── js/               # Game logic and Linera integration
│   ├── css/              # Styling
│   └── assets/           # Game assets
└── cargo.toml            # Rust dependencies
```

## 🔧 Development

### Building the Contract

```wsl
cd danny-game
cargo build --release --target wasm32-unknown-unknown
```

### Deploying to Linera

```wsl
linera publish-and-create target/wasm32-unknown-unknown/release/player_name_contract.wasm target/wasm32-unknown-unknown/release/player_name_service.wasm --json-argument '"YourPlayerName"'
```

## 🔗 Links

- [Linera Documentation](https://docs.linera.io/)
- [Linera GitHub](https://github.com/linera-io/linera-protocol)
