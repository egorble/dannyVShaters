#!/bin/bash

# Danny Game VPS Deployment Script
# This script automates the deployment of Danny Game on a VPS using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }

# Configuration
PROJECT_NAME="danny-game"
DOCKER_IMAGE="danny-game:latest"
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# Functions
check_requirements() {
    log "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed!"
        echo "Install Docker with: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed!"
        echo "Install Docker Compose from: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check available space
    AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 5000000 ]; then  # 5GB in KB
        warn "Low disk space detected. Recommend at least 5GB free space."
    fi
    
    log "✅ System requirements check passed"
}

setup_directories() {
    log "Setting up directories..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "./ssl"  # For SSL certificates
    
    log "✅ Directories created"
}

backup_existing() {
    if [ -d "./wallet" ] || [ -d "./data" ]; then
        log "Creating backup of existing data..."
        
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
        
        [ -d "./wallet" ] && cp -r "./wallet" "$BACKUP_DIR/$BACKUP_NAME/"
        [ -d "./data" ] && cp -r "./data" "$BACKUP_DIR/$BACKUP_NAME/"
        
        log "✅ Backup created: $BACKUP_DIR/$BACKUP_NAME"
    fi
}

build_image() {
    log "Building Docker image..."
    
    docker build -t "$DOCKER_IMAGE" .
    
    if [ $? -eq 0 ]; then
        log "✅ Docker image built successfully"
    else
        error "Failed to build Docker image"
        exit 1
    fi
}

deploy_services() {
    log "Deploying services with Docker Compose..."
    
    # Stop existing services
    docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    
    # Start services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    if [ $? -eq 0 ]; then
        log "✅ Services deployed successfully"
    else
        error "Failed to deploy services"
        exit 1
    fi
}

wait_for_services() {
    log "Waiting for services to be ready..."
    
    # Wait for main service
    for i in {1..60}; do
        if curl -s http://localhost:3001/status > /dev/null 2>&1; then
            log "✅ Orchestrator is ready"
            break
        fi
        if [ $i -eq 60 ]; then
            error "Services failed to start in time"
            docker-compose -f "$COMPOSE_FILE" logs
            exit 1
        fi
        sleep 5
    done
    
    # Wait for frontend
    for i in {1..30}; do
        if curl -s http://localhost:8082 > /dev/null 2>&1; then
            log "✅ Frontend is ready"
            break
        fi
        sleep 2
    done
}

show_status() {
    log "🎮 Danny Game deployment completed!"
    echo
    info "🌐 Service URLs:"
    echo "   Game Frontend: http://$(hostname -I | awk '{print $1}'):80"
    echo "   Direct Frontend: http://$(hostname -I | awk '{print $1}'):8082"
    echo "   Orchestrator API: http://$(hostname -I | awk '{print $1}'):3001"
    echo "   Linera GraphQL: http://$(hostname -I | awk '{print $1}'):8080"
    echo
    info "📋 Management commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   Check status: docker-compose ps"
    echo
    info "📁 Important directories:"
    echo "   Logs: $LOG_DIR"
    echo "   Backups: $BACKUP_DIR"
    echo "   SSL certificates: ./ssl"
}

configure_firewall() {
    log "Configuring firewall rules..."
    
    # Check if ufw is available
    if command -v ufw &> /dev/null; then
        # Allow necessary ports
        ufw allow 80/tcp comment "HTTP"
        ufw allow 443/tcp comment "HTTPS"
        ufw allow 22/tcp comment "SSH"
        
        # Optional: Allow direct access to services (remove in production)
        ufw allow 8080/tcp comment "Linera GraphQL"
        ufw allow 8082/tcp comment "Frontend"
        ufw allow 3001/tcp comment "Orchestrator"
        
        log "✅ Firewall rules configured"
    else
        warn "UFW not found. Please configure firewall manually."
        info "Required ports: 80, 443, 22"
        info "Optional ports: 8080, 8082, 3001"
    fi
}

setup_ssl() {
    if [ ! -z "$DOMAIN" ]; then
        log "Setting up SSL for domain: $DOMAIN"
        
        # Install certbot if not present
        if ! command -v certbot &> /dev/null; then
            apt-get update && apt-get install -y certbot
        fi
        
        # Get SSL certificate
        certbot certonly --standalone -d "$DOMAIN" --agree-tos -m "admin@$DOMAIN" --non-interactive
        
        # Copy certificates
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "./ssl/"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "./ssl/"
        
        log "✅ SSL certificates configured"
    else
        warn "No domain specified. SSL not configured."
        info "To enable SSL, set DOMAIN environment variable and re-run."
    fi
}

# Main execution
main() {
    log "🚀 Starting Danny Game VPS deployment..."
    
    check_requirements
    setup_directories
    backup_existing
    build_image
    deploy_services
    wait_for_services
    configure_firewall
    setup_ssl
    show_status
    
    log "🎉 Deployment completed successfully!"
}

# Handle command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    update)
        log "Updating Danny Game..."
        backup_existing
        build_image
        deploy_services
        wait_for_services
        show_status
        ;;
    stop)
        log "Stopping services..."
        docker-compose -f "$COMPOSE_FILE" down
        log "✅ Services stopped"
        ;;
    start)
        log "Starting services..."
        docker-compose -f "$COMPOSE_FILE" up -d
        wait_for_services
        show_status
        ;;
    restart)
        log "Restarting services..."
        docker-compose -f "$COMPOSE_FILE" restart
        wait_for_services
        show_status
        ;;
    logs)
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
    status)
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    clean)
        warn "This will remove all containers and volumes. Continue? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            docker-compose -f "$COMPOSE_FILE" down -v
            docker system prune -f
            log "✅ Cleanup completed"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|update|stop|start|restart|logs|status|clean}"
        echo
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  update  - Update and redeploy"
        echo "  stop    - Stop all services"
        echo "  start   - Start all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show service logs"
        echo "  status  - Show service status"
        echo "  clean   - Remove all containers and data"
        echo
        echo "Environment variables:"
        echo "  DOMAIN=your-domain.com - Enable SSL"
        exit 1
        ;;
esac