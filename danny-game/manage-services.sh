#!/bin/bash

# Danny Game Service Management Script
# Quick commands for managing the deployed Danny Game services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="dannyvshaters.xyz"
LINERA_PORT=8080
FRONTEND_PORT=8082
APP_DIR="/opt/danny-game"

# Function to show usage
show_usage() {
    echo -e "${BLUE}Danny Game Service Management${NC}"
    echo -e "${BLUE}=============================${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       - Start all services"
    echo "  stop        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  status      - Show status of all services"
    echo "  logs        - Show logs for all services"
    echo "  logs-linera - Show Linera service logs"
    echo "  logs-frontend - Show frontend service logs"
    echo "  logs-nginx  - Show Nginx logs"
    echo "  update      - Update and redeploy the application"
    echo "  test        - Test all endpoints"
    echo "  backup      - Backup important files"
  echo "  restore     - Restore from backup"
  echo "  ssl-renew   - Manually renew SSL certificate"
  echo "  health      - Check system health"
    echo ""
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🚀 Starting Danny Game services...${NC}"
    
    sudo systemctl start danny-game-linera
    echo -e "${GREEN}✅ Linera service started${NC}"
    
    sudo systemctl start danny-game-frontend
    echo -e "${GREEN}✅ Frontend service started${NC}"
    
    sudo systemctl start nginx
    echo -e "${GREEN}✅ Nginx started${NC}"
    
    echo -e "${GREEN}🎉 All services started successfully${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping Danny Game services...${NC}"
    
    sudo systemctl stop nginx
    echo -e "${GREEN}✅ Nginx stopped${NC}"
    
    sudo systemctl stop danny-game-frontend
    echo -e "${GREEN}✅ Frontend service stopped${NC}"
    
    sudo systemctl stop danny-game-linera
    echo -e "${GREEN}✅ Linera service stopped${NC}"
    
    echo -e "${GREEN}🎉 All services stopped successfully${NC}"
}

# Function to restart services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting Danny Game services...${NC}"
    
    sudo systemctl restart danny-game-linera
    echo -e "${GREEN}✅ Linera service restarted${NC}"
    
    sudo systemctl restart danny-game-frontend
    echo -e "${GREEN}✅ Frontend service restarted${NC}"
    
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx restarted${NC}"
    
    echo -e "${GREEN}🎉 All services restarted successfully${NC}"
}

# Function to show service status
show_status() {
    echo -e "${BLUE}📊 Danny Game Services Status${NC}"
    echo -e "${BLUE}=============================${NC}"
    echo ""
    
    echo -e "${YELLOW}Linera Service:${NC}"
    sudo systemctl status danny-game-linera --no-pager -l
    echo ""
    
    echo -e "${YELLOW}Frontend Service:${NC}"
    sudo systemctl status danny-game-frontend --no-pager -l
    echo ""
    
    echo -e "${YELLOW}Nginx Service:${NC}"
    sudo systemctl status nginx --no-pager -l
    echo ""
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 Danny Game Services Logs${NC}"
    echo -e "${BLUE}===========================${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to exit log viewing${NC}"
    echo ""
    
    sudo journalctl -u danny-game-linera -u danny-game-frontend -u nginx -f
}

# Function to show Linera logs
show_linera_logs() {
    echo -e "${BLUE}📋 Linera Service Logs${NC}"
    echo -e "${BLUE}======================${NC}"
    echo ""
    
    sudo journalctl -u danny-game-linera -f
}

# Function to show frontend logs
show_frontend_logs() {
    echo -e "${BLUE}📋 Frontend Service Logs${NC}"
    echo -e "${BLUE}========================${NC}"
    echo ""
    
    sudo journalctl -u danny-game-frontend -f
}

# Function to show Nginx logs
show_nginx_logs() {
    echo -e "${BLUE}📋 Nginx Logs${NC}"
    echo -e "${BLUE}=============${NC}"
    echo ""
    
    sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
}

# Function to update application
update_application() {
    echo -e "${YELLOW}🔄 Updating Danny Game application...${NC}"
    
    cd $APP_DIR
    
    # Pull latest changes (if using git)
    if [ -d ".git" ]; then
        git pull origin main
    fi
    
    # Rebuild the project
    echo -e "${YELLOW}🔨 Rebuilding project...${NC}"
    cargo build --release --target wasm32-unknown-unknown
    
    # Update frontend dependencies
    cd frontend
    npm install
    cd ..
    
    # Restart services
    restart_services
    
    echo -e "${GREEN}✅ Application updated successfully${NC}"
}

# Function to test endpoints
test_endpoints() {
    echo -e "${BLUE}🔍 Testing Danny Game endpoints${NC}"
    echo -e "${BLUE}===============================${NC}"
    echo ""
    
    # Test local Linera service
    echo -e "${YELLOW}Testing Linera GraphQL (localhost:$LINERA_PORT)...${NC}"
    if curl -s -X POST http://localhost:$LINERA_PORT/graphql -H "Content-Type: application/json" -d '{"query": "{ __schema { types { name } } }"}' > /dev/null; then
        echo -e "${GREEN}✅ Linera GraphQL service responding${NC}"
    else
        echo -e "${RED}❌ Linera GraphQL service not responding${NC}"
    fi
    
    # Test local frontend
    echo -e "${YELLOW}Testing Frontend (localhost:$FRONTEND_PORT)...${NC}"
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
        echo -e "${GREEN}✅ Frontend service responding${NC}"
    else
        echo -e "${RED}❌ Frontend service not responding${NC}"
    fi
    
    # Test HTTPS endpoint
    echo -e "${YELLOW}Testing HTTPS ($DOMAIN)...${NC}"
    if curl -s -k https://$DOMAIN/health > /dev/null; then
        echo -e "${GREEN}✅ HTTPS endpoint responding${NC}"
    else
        echo -e "${RED}❌ HTTPS endpoint not responding${NC}"
    fi
    
    # Test GraphQL through HTTPS
    echo -e "${YELLOW}Testing GraphQL through HTTPS...${NC}"
    if curl -s -k -X POST https://$DOMAIN/graphql -H "Content-Type: application/json" -d '{"query": "{ __schema { types { name } } }"}' > /dev/null; then
        echo -e "${GREEN}✅ HTTPS GraphQL endpoint responding${NC}"
    else
        echo -e "${RED}❌ HTTPS GraphQL endpoint not responding${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Endpoint testing complete${NC}"
}

# Function to backup important files
backup_files() {
    echo -e "${YELLOW}💾 Creating backup...${NC}"
    
    BACKUP_DIR="/opt/danny-game-backup-$(date +%Y%m%d-%H%M%S)"
    sudo mkdir -p $BACKUP_DIR
    
    # Backup application files
    sudo cp -r $APP_DIR $BACKUP_DIR/app
    
    # Backup Nginx configuration
    sudo cp /etc/nginx/sites-available/$DOMAIN $BACKUP_DIR/nginx-config
    
    # Backup systemd services
    sudo cp /etc/systemd/system/danny-game-*.service $BACKUP_DIR/
    
    # Backup Linera wallet
    if [ -f ~/.config/linera/wallet.json ]; then
        sudo cp ~/.config/linera/wallet.json $BACKUP_DIR/wallet.json
    fi
    
    # Backup SSL certificates
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        sudo cp -r /etc/letsencrypt/live/$DOMAIN $BACKUP_DIR/ssl
    fi
    
    sudo chown -R $USER:$USER $BACKUP_DIR
    
    echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
}

# Function to restore from backup
restore_files() {
    echo -e "${YELLOW}📥 Available backups:${NC}"
    ls -la /opt/danny-game-backup-* 2>/dev/null || echo "No backups found"
    echo ""
    echo "Please specify backup directory to restore from:"
    read -p "Backup directory: " BACKUP_DIR
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}❌ Backup directory not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}🔄 Restoring from backup...${NC}"
    
    # Stop services
    stop_services
    
    # Restore application files
    if [ -d "$BACKUP_DIR/app" ]; then
        sudo rm -rf $APP_DIR
        sudo cp -r $BACKUP_DIR/app $APP_DIR
        sudo chown -R $USER:$USER $APP_DIR
    fi
    
    # Restore Nginx configuration
    if [ -f "$BACKUP_DIR/nginx-config" ]; then
        sudo cp $BACKUP_DIR/nginx-config /etc/nginx/sites-available/$DOMAIN
    fi
    
    # Restore systemd services
    sudo cp $BACKUP_DIR/danny-game-*.service /etc/systemd/system/
    sudo systemctl daemon-reload
    
    # Restore wallet
    if [ -f "$BACKUP_DIR/wallet.json" ]; then
        mkdir -p ~/.config/linera
        cp $BACKUP_DIR/wallet.json ~/.config/linera/wallet.json
    fi
    
    # Start services
    start_services
    
    echo -e "${GREEN}✅ Restore completed${NC}"
}

# Function to renew SSL certificate
renew_ssl() {
    echo -e "${YELLOW}🔒 Renewing SSL certificate...${NC}"
    
    sudo certbot renew --force-renewal
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✅ SSL certificate renewed${NC}"
}



# Function to check system health
check_health() {
    echo -e "${BLUE}🏥 System Health Check${NC}"
    echo -e "${BLUE}======================${NC}"
    echo ""
    
    # Check disk space
    echo -e "${YELLOW}💾 Disk Usage:${NC}"
    df -h /
    echo ""
    
    # Check memory usage
    echo -e "${YELLOW}🧠 Memory Usage:${NC}"
    free -h
    echo ""
    
    # Check CPU load
    echo -e "${YELLOW}⚡ CPU Load:${NC}"
    uptime
    echo ""
    
    # Check service status
    echo -e "${YELLOW}🔧 Service Status:${NC}"
    systemctl is-active danny-game-linera && echo -e "${GREEN}✅ Linera service: Active${NC}" || echo -e "${RED}❌ Linera service: Inactive${NC}"
    systemctl is-active danny-game-frontend && echo -e "${GREEN}✅ Frontend service: Active${NC}" || echo -e "${RED}❌ Frontend service: Inactive${NC}"
    systemctl is-active nginx && echo -e "${GREEN}✅ Nginx: Active${NC}" || echo -e "${RED}❌ Nginx: Inactive${NC}"
    echo ""
    
    # Check SSL certificate expiry
    echo -e "${YELLOW}🔒 SSL Certificate:${NC}"
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
        echo "Expires: $EXPIRY"
    else
        echo -e "${RED}❌ SSL certificate not found${NC}"
    fi
    echo ""
    
    # Test endpoints
    test_endpoints
}

# Main function
main() {
    case "$1" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        logs-linera)
            show_linera_logs
            ;;
        logs-frontend)
            show_frontend_logs
            ;;
        logs-nginx)
            show_nginx_logs
            ;;
        update)
            update_application
            ;;
        test)
            test_endpoints
            ;;
        backup)
            backup_files
            ;;
        restore)
            restore_files
            ;;
        ssl-renew)
            renew_ssl
            ;;

        health)
            check_health
            ;;
        *)
            show_usage
            ;;
    esac
}

# Run main function
main "$@"