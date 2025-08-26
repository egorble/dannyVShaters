# 🐳 Danny Game Docker Deployment

Quick deployment options for running Danny Game on VPS with Docker.

## 🚀 Quick Start

### Option 1: Simple Container (Fastest)

```bash
# Clone project
git clone <your-repo> danny-game
cd danny-game

# Build and run
docker build -f Dockerfile.simple -t danny-game .
docker run -d -p 80:8082 -p 3001:3001 -p 8080:8080 --name danny-game danny-game

# Access at: http://your-vps-ip
```

### Option 2: Production Setup

```bash
# Full production deployment with Nginx, SSL, monitoring
chmod +x deploy-vps.sh
./deploy-vps.sh

# With custom domain and SSL
DOMAIN=yourdomain.com ./deploy-vps.sh
```

## 📁 Docker Files Overview

- **`Dockerfile`** - Full production setup with Nginx
- **`Dockerfile.simple`** - Lightweight single container  
- **`docker-compose.yml`** - Multi-container orchestration
- **`deploy-vps.sh`** - Automated deployment script
- **`nginx.conf`** - Reverse proxy configuration

## 🔧 Environment Detection

The frontend automatically detects whether it's running on:
- **Localhost**: Uses `http://localhost:3001`
- **VPS**: Uses your domain with `/api` endpoints

## 📋 Management Commands

```bash
# View logs
docker logs -f danny-game
# or
docker-compose logs -f

# Restart services
docker restart danny-game
# or  
docker-compose restart

# Stop services
docker stop danny-game
# or
docker-compose down

# Update deployment
git pull
./deploy-vps.sh update
```

## 🌐 Access Points

After deployment, your game will be available at:

- **Game Frontend**: `http://your-vps-ip` (port 80)
- **Direct Frontend**: `http://your-vps-ip:8082`
- **Orchestrator API**: `http://your-vps-ip:3001`  
- **Linera GraphQL**: `http://your-vps-ip:8080`

## 🔍 Troubleshooting

1. **Check if services are running**:
   ```bash
   docker ps
   curl http://localhost:3001/status
   ```

2. **View detailed logs**:
   ```bash
   docker logs danny-game
   ```

3. **Restart if needed**:
   ```bash
   docker restart danny-game
   ```

For detailed deployment instructions, see [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md).