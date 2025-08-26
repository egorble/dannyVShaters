#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Environment variables with defaults
WALLET_PATH=${WALLET_PATH:-/app/wallet}
LINERA_FAUCET=${LINERA_FAUCET:-https://faucet.testnet-babbage.linera.net}
LINERA_STORAGE=${LINERA_STORAGE:-memory}
LINERA_SERVICE_PORT=${LINERA_SERVICE_PORT:-8080}
ORCHESTRATOR_PORT=${ORCHESTRATOR_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-8082}

# Function to check if Linera is installed
check_linera() {
    if ! command -v linera &> /dev/null; then
        error "Linera CLI not found!"
        exit 1
    fi
    log "Linera CLI found: $(linera --version)"
}

# Function to initialize wallet
init_wallet() {
    log "Initializing Linera wallet..."
    
    if [ ! -f "$WALLET_PATH/wallet.json" ]; then
        log "Creating new wallet..."
        mkdir -p "$WALLET_PATH"
        cd "$WALLET_PATH"
        
        # Initialize wallet with faucet
        linera wallet init --with-new-chain --faucet "$LINERA_FAUCET"
        
        if [ $? -eq 0 ]; then
            log "Wallet created successfully"
        else
            error "Failed to create wallet"
            exit 1
        fi
    else
        log "Wallet already exists"
    fi
}

# Function to deploy Danny Game application
deploy_app() {
    log "Deploying Danny Game application..."
    
    cd /app
    
    # Check if wasm files exist
    if [ ! -f "wasm/player_name_contract.wasm" ] || [ ! -f "wasm/player_name_service.wasm" ]; then
        error "WebAssembly files not found!"
        exit 1
    fi
    
    # Publish and create application
    log "Publishing Danny Game contract..."
    APP_ID=$(linera project publish-and-create \
        wasm/player_name_contract.wasm \
        wasm/player_name_service.wasm \
        --json-argument '{"player_name": "Global Leaderboard"}' \
        --json-parameters '{"leaderboard_chain_id": null}' 2>&1 | tail -1)
    
    if [ $? -eq 0 ]; then
        log "Application deployed with ID: $APP_ID"
        echo "$APP_ID" > /app/data/app_id.txt
    else
        error "Failed to deploy application"
        exit 1
    fi
}

# Function to start Linera service
start_linera_service() {
    log "Starting Linera GraphQL service on port $LINERA_SERVICE_PORT..."
    
    # Start Linera service in background
    linera service --port "$LINERA_SERVICE_PORT" &
    LINERA_PID=$!
    echo $LINERA_PID > /app/data/linera.pid
    
    # Wait for service to be ready
    for i in {1..30}; do
        if curl -s "http://localhost:$LINERA_SERVICE_PORT" > /dev/null 2>&1; then
            log "Linera service is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            error "Linera service failed to start"
            exit 1
        fi
        sleep 2
    done
}

# Function to start orchestrator
start_orchestrator() {
    log "Starting orchestrator on port $ORCHESTRATOR_PORT..."
    
    cd /app
    node player-name-orchestrator.js &
    ORCHESTRATOR_PID=$!
    echo $ORCHESTRATOR_PID > /app/data/orchestrator.pid
    
    # Wait for orchestrator to be ready
    for i in {1..30}; do
        if curl -s "http://localhost:$ORCHESTRATOR_PORT/status" > /dev/null 2>&1; then
            log "Orchestrator is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            error "Orchestrator failed to start"
            exit 1
        fi
        sleep 2
    done
}

# Function to start frontend server
start_frontend() {
    log "Starting frontend server on port $FRONTEND_PORT..."
    
    cd /app/frontend
    node start-server.js &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > /app/data/frontend.pid
    
    # Wait for frontend to be ready
    for i in {1..30}; do
        if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
            log "Frontend server is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            error "Frontend server failed to start"
            exit 1
        fi
        sleep 2
    done
}

# Function to stop all services
stop_services() {
    log "Stopping all services..."
    
    if [ -f /app/data/frontend.pid ]; then
        kill $(cat /app/data/frontend.pid) 2>/dev/null || true
        rm -f /app/data/frontend.pid
    fi
    
    if [ -f /app/data/orchestrator.pid ]; then
        kill $(cat /app/data/orchestrator.pid) 2>/dev/null || true
        rm -f /app/data/orchestrator.pid
    fi
    
    if [ -f /app/data/linera.pid ]; then
        kill $(cat /app/data/linera.pid) 2>/dev/null || true
        rm -f /app/data/linera.pid
    fi
}

# Function to wait for services
wait_for_services() {
    log "All services started successfully!"
    log "🎮 Danny Game is available at: http://localhost:$FRONTEND_PORT"
    log "🔗 GraphQL API is available at: http://localhost:$LINERA_SERVICE_PORT"
    log "🎯 Orchestrator API is available at: http://localhost:$ORCHESTRATOR_PORT"
    
    # Wait for any service to exit
    wait
}

# Signal handlers
trap 'stop_services; exit 0' SIGTERM SIGINT

# Main execution
case "${1:-start}" in
    start)
        log "🚀 Starting Danny Game with Linera..."
        check_linera
        init_wallet
        deploy_app
        start_linera_service
        start_orchestrator
        start_frontend
        wait_for_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        exec "$0" start
        ;;
    status)
        info "Checking service status..."
        curl -f "http://localhost:$ORCHESTRATOR_PORT/status" && log "Services are running" || error "Services are not running"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac