#!/bin/bash
set -e

echo "🚀 Starting Danny Game Simple Setup..."

# Initialize wallet if not exists
if [ ! -f "/app/wallet/wallet.json" ]; then
    echo "Creating wallet..."
    cd /app/wallet
    linera wallet init --faucet https://faucet.testnet-babbage.linera.net
fi

# Deploy application if not exists
if [ ! -f "/app/data/app_id.txt" ]; then
    echo "Deploying application..."
    cd /app
    APP_ID=$(linera project publish-and-create \
        target/wasm32-unknown-unknown/release/player_name_contract.wasm \
        target/wasm32-unknown-unknown/release/player_name_service.wasm \
        --json-argument '{"player_name": "Global Leaderboard"}' \
        --json-parameters '{"leaderboard_chain_id": null}')
    echo "$APP_ID" > /app/data/app_id.txt
fi

# Start services in background
echo "Starting Linera service..."
linera service --port 8080 &

echo "Starting orchestrator..."
cd /app
node player-name-orchestrator.js &

echo "Starting frontend..."
cd /app/frontend
FRONTEND_PORT=8082 node start-server.js &

echo "✅ All services started!"
echo "🎮 Game: http://localhost:8082"
echo "🔗 API: http://localhost:3001"
echo "📊 GraphQL: http://localhost:8080"

# Wait for all background processes
wait