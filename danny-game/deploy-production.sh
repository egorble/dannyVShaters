#!/bin/bash

# Danny Game Production Deployment Script
# Includes Nginx configuration with SSL for dannyvshaters.xyz
# Email: egor4042007@gmail.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="dannyvshaters.xyz"
EMAIL="egor4042007@gmail.com"
LINERA_PORT=8080
FRONTEND_PORT=8082
APP_DIR="/opt/danny-game"
NGINX_CONF_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SSL_DIR="/etc/letsencrypt/live/$DOMAIN"

echo -e "${BLUE}🚀 Starting Danny Game Production Deployment${NC}"
echo -e "${BLUE}Domain: $DOMAIN${NC}"
echo -e "${BLUE}Email: $EMAIL${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
    
    # Update system
    sudo apt update
    sudo apt upgrade -y
    
    # Install required packages
    sudo apt install -y \
        curl \
        wget \
        git \
        build-essential \
        pkg-config \
        libssl-dev \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        htop \
        unzip
    
    echo -e "${GREEN}✅ System dependencies installed${NC}"
}

# Function to install Rust
install_rust() {
    if ! command_exists rustc; then
        echo -e "${YELLOW}🦀 Installing Rust...${NC}"
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source ~/.cargo/env
        rustup target add wasm32-unknown-unknown
        echo -e "${GREEN}✅ Rust installed${NC}"
    else
        echo -e "${GREEN}✅ Rust already installed${NC}"
        rustup target add wasm32-unknown-unknown
    fi
}

# Function to install Linera SDK
install_linera() {
    if ! command_exists linera; then
        echo -e "${YELLOW}⚡ Installing Linera SDK...${NC}"
        cargo install --git https://github.com/linera-io/linera-protocol.git --tag v0.14.2 linera-service
        cargo install --git https://github.com/linera-io/linera-protocol.git --tag v0.14.2 linera
        echo -e "${GREEN}✅ Linera SDK installed${NC}"
    else
        echo -e "${GREEN}✅ Linera SDK already installed${NC}"
    fi
}

# Function to setup application directory
setup_app_directory() {
    echo -e "${YELLOW}📁 Setting up application directory...${NC}"
    
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    # Copy project files
    cp -r . $APP_DIR/
    cd $APP_DIR
    
    echo -e "${GREEN}✅ Application directory setup complete${NC}"
}

# Function to build the project
build_project() {
    echo -e "${YELLOW}🔨 Building Danny Game project...${NC}"
    
    cd $APP_DIR
    
    # Build the Rust contract
    cargo build --release --target wasm32-unknown-unknown
    
    # Install frontend dependencies
    cd frontend
    if command_exists npm; then
        npm install
    else
        echo -e "${YELLOW}Installing Node.js and npm...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        npm install
    fi
    
    cd ..
    echo -e "${GREEN}✅ Project built successfully${NC}"
}



# Function to configure firewall
setup_firewall() {
    echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
    
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow $LINERA_PORT/tcp
    sudo ufw allow $FRONTEND_PORT/tcp
    sudo ufw --force enable
    
    echo -e "${GREEN}✅ Firewall configured${NC}"
}

# Function to setup SSL certificate
setup_ssl() {
    echo -e "${YELLOW}🔒 Setting up SSL certificate...${NC}"
    
    # Stop nginx temporarily
    sudo systemctl stop nginx
    
    # Get SSL certificate
    sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
        echo -e "${RED}❌ SSL certificate generation failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ SSL certificate obtained${NC}"
}

# Function to configure Nginx
setup_nginx() {
    echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
    
    # Create Nginx configuration
    sudo tee $NGINX_CONF_DIR/$DOMAIN > /dev/null <<EOF
# Danny Game Nginx Configuration
upstream linera_backend {
    server 127.0.0.1:$LINERA_PORT;
    keepalive 32;
}

upstream frontend_backend {
    server 127.0.0.1:$FRONTEND_PORT;
    keepalive 32;
}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=graphql:10m rate=5r/s;

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration
    ssl_certificate $SSL_DIR/fullchain.pem;
    ssl_certificate_key $SSL_DIR/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # CORS headers for Linera
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Main frontend
    location / {
        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS for frontend
        add_header Cross-Origin-Opener-Policy "same-origin";
        add_header Cross-Origin-Embedder-Policy "require-corp";
    }
    
    # GraphQL API endpoint
    location /graphql {
        limit_req zone=graphql burst=20 nodelay;
        
        proxy_pass http://linera_backend/graphql;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts for GraphQL
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://linera_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
    
    # Block access to sensitive files
    location ~ /\\. {
        deny all;
    }
    
    location ~ \\.(env|json|toml)\$ {
        deny all;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf $NGINX_CONF_DIR/$DOMAIN $NGINX_ENABLED_DIR/
    
    # Remove default site
    sudo rm -f $NGINX_ENABLED_DIR/default
    
    # Test nginx configuration
    sudo nginx -t
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Nginx configuration test failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Nginx configured${NC}"
}

# Function to create systemd services
setup_systemd_services() {
    echo -e "${YELLOW}⚙️ Setting up systemd services...${NC}"
    
    # Linera service
    sudo tee /etc/systemd/system/danny-game-linera.service > /dev/null <<EOF
[Unit]
Description=Danny Game Linera Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
Environment=PATH=/home/$USER/.cargo/bin:\$PATH
ExecStart=/home/$USER/.cargo/bin/linera service --port $LINERA_PORT
Restart=always
RestartSec=10
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=danny-game-linera

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR /home/$USER/.config

[Install]
WantedBy=multi-user.target
EOF
    
    # Frontend service
    sudo tee /etc/systemd/system/danny-game-frontend.service > /dev/null <<EOF
[Unit]
Description=Danny Game Frontend Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/frontend
Environment=NODE_ENV=production
Environment=PORT=$FRONTEND_PORT
ExecStart=/usr/bin/node start-server.js
Restart=always
RestartSec=10
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=danny-game-frontend

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Enable services
    sudo systemctl enable danny-game-linera
    sudo systemctl enable danny-game-frontend
    
    echo -e "${GREEN}✅ Systemd services created${NC}"
}

# Function to setup SSL auto-renewal
setup_ssl_renewal() {
    echo -e "${YELLOW}🔄 Setting up SSL auto-renewal...${NC}"
    
    # Create renewal hook
    sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh > /dev/null <<EOF
#!/bin/bash
sudo systemctl reload nginx
EOF
    
    sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
    
    # Test renewal
    sudo certbot renew --dry-run
    
    echo -e "${GREEN}✅ SSL auto-renewal configured${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    
    # Start Linera service
    sudo systemctl start danny-game-linera
    sleep 5
    
    # Start frontend service
    sudo systemctl start danny-game-frontend
    sleep 3
    
    # Start nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    echo -e "${GREEN}✅ All services started${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    # Check services status
    echo -e "${BLUE}Service Status:${NC}"
    sudo systemctl status danny-game-linera --no-pager -l
    sudo systemctl status danny-game-frontend --no-pager -l
    sudo systemctl status nginx --no-pager -l
    
    # Test local endpoints
    echo -e "${BLUE}Testing local endpoints:${NC}"
    
    # Test Linera GraphQL
    if curl -s -X POST http://localhost:$LINERA_PORT/graphql -H "Content-Type: application/json" -d '{"query": "{ __schema { types { name } } }"}' > /dev/null; then
        echo -e "${GREEN}✅ Linera GraphQL service responding${NC}"
    else
        echo -e "${RED}❌ Linera GraphQL service not responding${NC}"
    fi
    
    # Test frontend
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
        echo -e "${GREEN}✅ Frontend service responding${NC}"
    else
        echo -e "${RED}❌ Frontend service not responding${NC}"
    fi
    
    # Test HTTPS
    echo -e "${BLUE}Testing HTTPS endpoint:${NC}"
    if curl -s -k https://$DOMAIN/health > /dev/null; then
        echo -e "${GREEN}✅ HTTPS endpoint responding${NC}"
    else
        echo -e "${RED}❌ HTTPS endpoint not responding${NC}"
    fi
    
    echo -e "${GREEN}✅ Deployment verification complete${NC}"
}

# Function to display deployment info
show_deployment_info() {
    echo -e "${BLUE}🎉 Danny Game Deployment Complete!${NC}"
    echo ""
    echo -e "${GREEN}🌐 Website: https://$DOMAIN${NC}"
    echo -e "${GREEN}🎮 Game Interface: https://$DOMAIN${NC}"
    echo -e "${GREEN}📊 GraphQL API: https://$DOMAIN/graphql${NC}"
    echo ""
    echo -e "${BLUE}📋 Service Management:${NC}"
    echo "  • Restart Linera: sudo systemctl restart danny-game-linera"
    echo "  • Restart Frontend: sudo systemctl restart danny-game-frontend"
    echo "  • Restart Nginx: sudo systemctl restart nginx"
    echo "  • View logs: sudo journalctl -u danny-game-linera -f"
    echo ""
    echo -e "${BLUE}📁 Important Files:${NC}"
    echo "  • App Directory: $APP_DIR"
    echo "  • Nginx Config: $NGINX_CONF_DIR/$DOMAIN"
    echo "  • SSL Certificates: $SSL_DIR"
    echo "  • Deployment Info: $APP_DIR/deployment-info.env"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "  • Check wallet: linera wallet show"
    echo "  • Test GraphQL: curl -X POST https://$DOMAIN/graphql -H 'Content-Type: application/json' -d '{\"query\": \"{ __schema { types { name } } }\"}'"
    echo "  • Monitor services: sudo systemctl status danny-game-*"
    echo ""
    echo -e "${GREEN}🚀 Your Danny Game is now live at https://$DOMAIN${NC}"
}

# Main deployment function
main() {
    echo -e "${BLUE}🎮 Danny Game Production Deployment Script${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo ""
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        echo -e "${RED}❌ Please do not run this script as root${NC}"
        exit 1
    fi
    
    # Check if domain is accessible
    echo -e "${YELLOW}🌐 Checking domain accessibility...${NC}"
    if ! ping -c 1 $DOMAIN > /dev/null 2>&1; then
        echo -e "${RED}❌ Domain $DOMAIN is not accessible. Please check DNS settings.${NC}"
        exit 1
    fi
    
    # Run deployment steps
    install_dependencies
    install_rust
    install_linera
    setup_app_directory
    build_project

    setup_firewall
    setup_ssl
    setup_nginx
    setup_systemd_services
    setup_ssl_renewal
    start_services
    sleep 10
    verify_deployment
    show_deployment_info
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Run main function
main "$@"