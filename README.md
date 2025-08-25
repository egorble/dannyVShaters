# Danny Game - Linera Blockchain Game

🎮 **A multiplayer tower defense game built on the Linera blockchain platform**

## 🌟 About the Game

Danny Game is an innovative blockchain-based tower defense game where players can:
- Build and defend their castle against waves of enemies
- Compete with other players in real-time
- Earn rewards and track scores on the blockchain
- Experience seamless Web3 gaming with Linera's fast finality

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
   The game will be available at `http://localhost:3000`

2. **Run the Orchestrator**
   ```bash
   node player-name-orchestrator.js
   ```
   This handles the blockchain communication layer.

3. **Start Linera Service**
   ```bash
   linera service --port 8081
   ```
   Make sure your Linera service is running on port 8081.

### ⚙️ Configuration

**Important**: Before running the game, you need to update the following configuration:

- **Module ID**: Update the application module ID in the orchestrator
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

```bash
cd danny-game
cargo build --release
```

### Deploying to Linera

```bash
linera publish-and-create target/wasm32-unknown-unknown/release/danny_game.wasm
```

## 🎯 Game Controls

- **Mouse**: Navigate and interact with game elements
- **Click**: Place towers and select targets
- **Keyboard**: Use hotkeys for quick actions

## 🏆 Scoring System

The game features a blockchain-based scoring system where:
- Scores are permanently recorded on Linera
- Leaderboards update in real-time
- Player achievements are verifiable and tamper-proof

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## 📄 License

This project is open source. See the license file for details.

## 🔗 Links

- [Linera Documentation](https://docs.linera.io/)
- [Linera GitHub](https://github.com/linera-io/linera-protocol)

---

**Ready to defend your castle? Start playing Danny Game today!** 🏰⚔️