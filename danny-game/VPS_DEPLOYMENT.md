# 🚀 Danny Game VPS Deployment Guide

Complete guide for deploying Danny Game on a VPS using Docker.

## 📋 Quick Start (Recommended)

### Option 1: Simple Docker Deployment

```bash
# 1. Clone your project to VPS
git clone <your-repo> danny-game
cd danny-game

# 2. Build and run with simple Docker
docker build -f Dockerfile.simple -t danny-game-simple .
docker run -d -p 80:8082 -p 3001:3001 -p 8080:8080 --name danny-game danny-game-simple

# 3. Access your game
# http://your-vps-ip
```

### Option 2: Full Docker Compose Setup

```bash
# 1. Clone project
git clone <your-repo> danny-game
cd danny-game

# 2. Make deployment script executable
chmod +x deploy-vps.sh

# 3. Deploy with SSL (optional)
DOMAIN=your-domain.com ./deploy-vps.sh

# Or deploy without SSL
./deploy-vps.sh
```

## 🔧 Detailed Setup Instructions

### Prerequisites

1. **VPS Requirements:**
   - Ubuntu 20.04+ or similar Linux distribution
   - 2GB+ RAM (4GB recommended)
   - 20GB+ disk space
   - Public IP address

2. **Install Docker:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for group changes
```

### Method 1: Simple Single Container

This is the easiest approach for small deployments:

```bash
# Build the image
docker build -f Dockerfile.simple -t danny-game .

# Run the container
docker run -d \
  --name danny-game \
  -p 80:8082 \
  -p 3001:3001 \
  -p 8080:8080 \
  -v danny-wallet:/app/wallet \
  -v danny-data:/app/data \
  --restart unless-stopped \
  danny-game

# Check logs
docker logs -f danny-game
```

### Method 2: Production Docker Compose

For production deployments with Nginx, SSL, and monitoring:

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Method 3: Manual VPS Setup (Alternative)

If you prefer not to use Docker:

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustup target add wasm32-unknown-unknown

# 3. Install Linera
cargo install linera-service linera-client --git https://github.com/linera-io/linera-protocol.git --tag v0.14.2

# 4. Build project
cd danny-game
cargo build --release --target wasm32-unknown-unknown
npm install

# 5. Create systemd services (see systemd section below)
```

## 🌐 Domain and SSL Setup

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf to enable HTTPS
# Uncomment the SSL server block in nginx.conf

# Restart services
docker-compose restart nginx
```

### DNS Configuration

Point your domain to your VPS:
```
A record: your-domain.com -> YOUR_VPS_IP
A record: www.your-domain.com -> YOUR_VPS_IP
```

## ⚙️ Configuration Options

### Environment Variables

Create `.env` file for custom configuration:

```env
# Network Configuration
LINERA_FAUCET=https://faucet.testnet-babbage.linera.net
LINERA_STORAGE=memory
DOMAIN=your-domain.com

# Port Configuration
FRONTEND_PORT=8082
ORCHESTRATOR_PORT=3001
LINERA_SERVICE_PORT=8080
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# Security
RUST_LOG=info
NODE_ENV=production
```

### Frontend Configuration

The frontend automatically detects VPS vs localhost. For custom configuration, edit `frontend/js/env-config.js`:

```javascript
// Custom VPS configuration
const CUSTOM_CONFIG = {
    ORCHESTRATOR_URL: 'https://your-domain.com/api',
    LINERA_SERVICE_URL: 'https://your-domain.com/graphql',
    FRONTEND_URL: 'https://your-domain.com'
};
```

## 📊 Monitoring and Maintenance

### View Service Status

```bash
# Docker Compose
docker-compose ps
docker-compose logs -f

# Single Container
docker ps
docker logs -f danny-game

# System resources
docker stats
```

### Backup and Restore

```bash
# Create backup
./deploy-vps.sh backup

# Manual backup
docker run --rm -v danny-wallet:/source -v $(pwd)/backup:/backup alpine tar czf /backup/wallet-$(date +%Y%m%d).tar.gz -C /source .

# Restore backup
docker run --rm -v danny-wallet:/target -v $(pwd)/backup:/backup alpine tar xzf /backup/wallet-YYYYMMDD.tar.gz -C /target
```

### Updates

```bash
# Update application
git pull
./deploy-vps.sh update

# Update single container
docker stop danny-game
docker rm danny-game
docker build -f Dockerfile.simple -t danny-game .
docker run -d --name danny-game -p 80:8082 -p 3001:3001 -p 8080:8080 -v danny-wallet:/app/wallet --restart unless-stopped danny-game
```

## 🔥 Systemd Services (Alternative to Docker)

If you prefer systemd over Docker:

### Create Linera Service

```ini
# /etc/systemd/system/linera.service
[Unit]
Description=Linera Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/danny-game
ExecStart=/home/ubuntu/.cargo/bin/linera service --port 8080
Restart=always
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
```

### Create Orchestrator Service

```ini
# /etc/systemd/system/danny-orchestrator.service
[Unit]
Description=Danny Game Orchestrator
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/danny-game
ExecStart=/usr/bin/node player-name-orchestrator.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Create Frontend Service

```ini
# /etc/systemd/system/danny-frontend.service
[Unit]
Description=Danny Game Frontend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/danny-game/frontend
ExecStart=/usr/bin/node start-server.js
Restart=always
Environment=NODE_ENV=production
Environment=FRONTEND_PORT=8082

[Install]
WantedBy=multi-user.target
```

### Enable and Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable linera danny-orchestrator danny-frontend
sudo systemctl start linera danny-orchestrator danny-frontend
sudo systemctl status linera danny-orchestrator danny-frontend
```

## 🔧 Troubleshooting

### Common Issues

1. **Port 80 in use:**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo systemctl stop apache2  # or nginx
   ```

2. **Permission denied:**
   ```bash
   sudo chown -R $USER:$USER /path/to/danny-game
   chmod +x deploy-vps.sh
   ```

3. **Docker build fails:**
   ```bash
   docker system prune -f
   docker build --no-cache -f Dockerfile.simple -t danny-game .
   ```

4. **Services not accessible:**
   ```bash
   # Check firewall
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   
   # Check services
   curl http://localhost:3001/status
   curl http://localhost:8082
   ```

### Logs and Debugging

```bash
# Docker logs
docker-compose logs -f danny-game
docker logs -f danny-game

# System logs
journalctl -u linera -f
journalctl -u danny-orchestrator -f

# Check network connectivity
curl -I http://localhost:3001/status
telnet localhost 8080
```

## 🚀 Performance Optimization

### Resource Limits

Add to docker-compose.yml:

```yaml
services:
  danny-game:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

### Nginx Optimization

Add to nginx.conf:

```nginx
worker_processes auto;
worker_connections 1024;

# Enable compression
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📋 Security Checklist

- [ ] Enable firewall (ufw)
- [ ] Set up SSL certificates
- [ ] Regular backups
- [ ] Update system packages
- [ ] Monitor resource usage
- [ ] Set up fail2ban for SSH protection
- [ ] Use non-root user for services
- [ ] Enable log rotation

## 🎯 Next Steps

After successful deployment:

1. **Test the game** thoroughly
2. **Set up monitoring** (optional Grafana/Prometheus)
3. **Configure automated backups**
4. **Set up domain and SSL**
5. **Performance tuning** based on usage
6. **Set up CI/CD** for automatic updates

Your Danny Game should now be accessible at `http://your-vps-ip` or your domain!