#!/bin/bash

# Скрипт для розгортання Danny Game на сервері з nginx та SSL
# Домен: dannyvshaters.xyz
# Email: egor4042007@gmail.com

set -e

echo "🚀 Початок розгортання Danny Game на сервері"
echo "📧 Email: egor4042007@gmail.com"
echo "🌐 Домен: dannyvshaters.xyz"
echo "==========================================="

# Змінні
DOMAIN="dannyvshaters.xyz"
EMAIL="egor4042007@gmail.com"
APP_DIR="/var/www/danny-game"
USER="danny-game"
FRONTEND_PORT=8082
ORCHESTRATOR_PORT=3001

# Функція для логування
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Перевірка прав root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Цей скрипт потрібно запускати з правами root (sudo)"
    exit 1
fi

log "📦 Оновлення системи та встановлення залежностей"
apt update && apt upgrade -y
apt install -y curl wget git nginx certbot python3-certbot-nginx nodejs npm build-essential

# Встановлення останньої версії Node.js (18.x)
log "📦 Встановлення Node.js 18.x"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Встановлення PM2 для управління процесами
log "📦 Встановлення PM2"
npm install -g pm2

# Створення користувача для додатку
log "👤 Створення користувача $USER"
if ! id "$USER" &>/dev/null; then
    useradd -m -s /bin/bash "$USER"
    usermod -aG www-data "$USER"
fi

# Створення директорії для додатку
log "📁 Створення директорії додатку"
mkdir -p "$APP_DIR"
chown "$USER":"$USER" "$APP_DIR"

# Клонування або копіювання проекту
log "📥 Копіювання файлів проекту"
# Якщо запускаємо з директорії проекту
if [ -f "./danny-game/frontend/package.json" ]; then
    cp -r ./danny-game/* "$APP_DIR/"
    cp ./package.json "$APP_DIR/"
    cp ./player-name-orchestrator.js "$APP_DIR/"
else
    echo "❌ Файли проекту не знайдені. Переконайтеся, що скрипт запускається з кореневої директорії проекту."
    exit 1
fi

chown -R "$USER":"$USER" "$APP_DIR"

log "📦 Встановлення залежностей Node.js"
# Встановлення залежностей для orchestrator
cd "$APP_DIR"
sudo -u "$USER" npm install

# Встановлення залежностей для frontend
cd "$APP_DIR/frontend"
sudo -u "$USER" npm install

# Встановлення Rust та Linera CLI (якщо потрібно)
log "🦀 Встановлення Rust та Linera CLI"
sudo -u "$USER" bash -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
sudo -u "$USER" bash -c 'source ~/.cargo/env && cargo install linera-cli@0.14.2'

# Створення конфігурації PM2
log "⚙️ Створення конфігурації PM2"
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'danny-game-orchestrator',
      script: 'player-name-orchestrator.js',
      cwd: '$APP_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: $ORCHESTRATOR_PORT
      },
      error_file: '/var/log/pm2/orchestrator-error.log',
      out_file: '/var/log/pm2/orchestrator-out.log',
      log_file: '/var/log/pm2/orchestrator.log'
    },
    {
      name: 'danny-game-frontend',
      script: 'start-server.js',
      cwd: '$APP_DIR/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: $FRONTEND_PORT
      },
      error_file: '/var/log/pm2/frontend-error.log',
      out_file: '/var/log/pm2/frontend-out.log',
      log_file: '/var/log/pm2/frontend.log'
    }
  ]
};
EOF

chown "$USER":"$USER" "$APP_DIR/ecosystem.config.js"

# Створення директорії для логів PM2
mkdir -p /var/log/pm2
chown "$USER":"$USER" /var/log/pm2

# Налаштування nginx
log "🌐 Налаштування nginx"
cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # CORS headers for SharedArrayBuffer support
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
    
    # Main application (frontend)
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints (orchestrator)
    location /api/ {
        rewrite ^/api/(.*) /\$1 break;
        proxy_pass http://localhost:$ORCHESTRATOR_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 200;
        }
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://localhost:$FRONTEND_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Cross-Origin-Opener-Policy same-origin;
        add_header Cross-Origin-Embedder-Policy require-corp;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Активація сайту
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"

# Видалення дефолтного сайту nginx
rm -f /etc/nginx/sites-enabled/default

# Перевірка конфігурації nginx
log "🔍 Перевірка конфігурації nginx"
nginx -t

# Перезапуск nginx
log "🔄 Перезапуск nginx"
systemctl restart nginx
systemctl enable nginx

# Налаштування firewall
log "🔥 Налаштування firewall"
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable

# Отримання SSL сертифіката
log "🔒 Отримання SSL сертифіката від Let's Encrypt"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect

# Запуск додатків через PM2
log "🚀 Запуск додатків через PM2"
cd "$APP_DIR"
sudo -u "$USER" bash -c 'source ~/.cargo/env && pm2 start ecosystem.config.js'
sudo -u "$USER" pm2 save
sudo -u "$USER" pm2 startup

# Створення systemd сервісу для PM2
log "⚙️ Створення systemd сервісу для PM2"
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u "$USER" --hp "/home/$USER"
systemctl enable pm2-"$USER"

# Створення скрипту для оновлення
log "📝 Створення скрипту для оновлення"
cat > "$APP_DIR/update.sh" << 'EOF'
#!/bin/bash
set -e

echo "🔄 Оновлення Danny Game"

# Зупинка додатків
pm2 stop all

# Оновлення коду (якщо використовується git)
# git pull origin main

# Встановлення залежностей
npm install
cd frontend && npm install && cd ..

# Перезапуск додатків
pm2 restart all

echo "✅ Оновлення завершено"
EOF

chmod +x "$APP_DIR/update.sh"
chown "$USER":"$USER" "$APP_DIR/update.sh"

# Створення скрипту для моніторингу
cat > "$APP_DIR/monitor.sh" << 'EOF'
#!/bin/bash

echo "📊 Статус Danny Game"
echo "==================="

echo "🔄 PM2 процеси:"
pm2 status

echo ""
echo "🌐 Nginx статус:"
systemctl status nginx --no-pager -l

echo ""
echo "🔒 SSL сертифікат:"
certbot certificates

echo ""
echo "💾 Використання диску:"
df -h

echo ""
echo "🧠 Використання пам'яті:"
free -h

echo ""
echo "📈 Навантаження системи:"
uptime
EOF

chmod +x "$APP_DIR/monitor.sh"
chown "$USER":"$USER" "$APP_DIR/monitor.sh"

# Налаштування автоматичного оновлення SSL сертифіката
log "🔄 Налаштування автоматичного оновлення SSL"
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Створення backup скрипту
cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/danny-game"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "💾 Створення backup Danny Game - $DATE"

# Backup додатку
tar -czf "$BACKUP_DIR/danny-game-$DATE.tar.gz" -C /var/www danny-game

# Backup nginx конфігурації
cp "/etc/nginx/sites-available/dannyvshaters.xyz" "$BACKUP_DIR/nginx-config-$DATE.conf"

# Видалення старих backup'ів (старше 30 днів)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.conf" -mtime +30 -delete

echo "✅ Backup завершено: $BACKUP_DIR/danny-game-$DATE.tar.gz"
EOF

chmod +x "$APP_DIR/backup.sh"
chown "$USER":"$USER" "$APP_DIR/backup.sh"

# Додавання backup до cron (щотижня)
(crontab -l 2>/dev/null; echo "0 2 * * 0 $APP_DIR/backup.sh") | crontab -

log "✅ Розгортання завершено успішно!"
echo ""
echo "🎉 ==========================================="
echo "🎉 РОЗГОРТАННЯ DANNY GAME ЗАВЕРШЕНО!"
echo "🎉 ==========================================="
echo ""
echo "🌐 Сайт доступний за адресою: https://$DOMAIN"
echo "📧 SSL сертифікат налаштовано для: $EMAIL"
echo ""
echo "📋 Корисні команди:"
echo "   Статус додатків:     sudo -u $USER pm2 status"
echo "   Логи додатків:       sudo -u $USER pm2 logs"
echo "   Перезапуск:          sudo -u $USER pm2 restart all"
echo "   Оновлення:           sudo -u $USER $APP_DIR/update.sh"
echo "   Моніторинг:          sudo -u $USER $APP_DIR/monitor.sh"
echo "   Backup:              sudo -u $USER $APP_DIR/backup.sh"
echo ""
echo "📁 Файли додатку:       $APP_DIR"
echo "📊 Логи PM2:            /var/log/pm2/"
echo "🌐 Конфігурація nginx:  /etc/nginx/sites-available/$DOMAIN"
echo ""
echo "🔧 Для налаштування додатку відредагуйте:"
echo "   Frontend конфіг:     $APP_DIR/frontend/js/linera-sdk-integration.js"
echo "   Orchestrator:        $APP_DIR/player-name-orchestrator.js"
echo ""
echo "✅ Готово до використання!"