#!/bin/bash

# Скрипт для налаштування production конфігурації Danny Game
# Автоматично змінює URL та налаштування для production середовища

set -e

DOMAIN="dannyvshaters.xyz"
APP_DIR="/var/www/danny-game"
USER="danny-game"

echo "🔧 Налаштування production конфігурації для Danny Game"
echo "🌐 Домен: $DOMAIN"
echo "📁 Директорія: $APP_DIR"
echo "👤 Користувач: $USER"
echo "==========================================="

# Функція для логування
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Перевірка прав
if [ "$EUID" -ne 0 ]; then
    echo "❌ Цей скрипт потрібно запускати з правами root (sudo)"
    exit 1
fi

# Перевірка існування директорії
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Директорія $APP_DIR не існує. Спочатку запустіть deploy-server.sh"
    exit 1
fi

log "🔧 Налаштування frontend конфігурації"

# Backup оригінального файлу
cp "$APP_DIR/frontend/js/linera-sdk-integration.js" "$APP_DIR/frontend/js/linera-sdk-integration.js.backup"

# Зміна ORCHESTRATOR_URL для production
sed -i "s|const ORCHESTRATOR_URL = 'http://localhost:3001';|const ORCHESTRATOR_URL = 'https://$DOMAIN/api';|g" "$APP_DIR/frontend/js/linera-sdk-integration.js"

log "✅ Frontend конфігурація оновлена"

log "🔧 Налаштування orchestrator конфігурації"

# Backup оригінального файлу
cp "$APP_DIR/player-name-orchestrator.js" "$APP_DIR/player-name-orchestrator.js.backup"

# Додавання production налаштувань до orchestrator
cat >> "$APP_DIR/player-name-orchestrator.js" << 'EOF'

// Production налаштування
if (process.env.NODE_ENV === 'production') {
    // Додаткові security headers
    app.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
    
    // Rate limiting для production
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 хвилин
        max: 100, // максимум 100 запитів на IP
        message: 'Забагато запитів з цього IP, спробуйте пізніше.'
    });
    app.use(limiter);
}
EOF

log "✅ Orchestrator конфігурація оновлена"

log "🔧 Створення production змінних середовища"

# Створення .env файлу для production
cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
DOMAIN=$DOMAIN
FRONTEND_PORT=8082
ORCHESTRATOR_PORT=3001
DEBUG=false
LOG_LEVEL=info
EOF

# Створення .env файлу для frontend
cat > "$APP_DIR/frontend/.env" << EOF
NODE_ENV=production
PORT=8082
DEBUG=false
EOF

chown "$USER":"$USER" "$APP_DIR/.env"
chown "$USER":"$USER" "$APP_DIR/frontend/.env"

log "✅ Змінні середовища створені"

log "🔧 Оновлення package.json для production"

# Додавання production скриптів до package.json
cd "$APP_DIR"

# Backup package.json
cp package.json package.json.backup

# Оновлення scripts секції
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  'start:prod': 'NODE_ENV=production node player-name-orchestrator.js',
  'pm2:start': 'pm2 start ecosystem.config.js',
  'pm2:stop': 'pm2 stop all',
  'pm2:restart': 'pm2 restart all',
  'pm2:logs': 'pm2 logs',
  'pm2:status': 'pm2 status',
  'backup': './backup.sh',
  'monitor': './monitor.sh',
  'update': './update.sh'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

log "✅ package.json оновлено"

log "🔧 Налаштування логування"

# Створення директорії для логів
mkdir -p "$APP_DIR/logs"
chown "$USER":"$USER" "$APP_DIR/logs"

# Створення конфігурації для logrotate
cat > "/etc/logrotate.d/danny-game" << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        sudo -u $USER pm2 reloadLogs
    endscript
}
EOF

log "✅ Логування налаштовано"

log "🔧 Створення health check скрипту"

# Створення health check скрипту
cat > "$APP_DIR/health-check.sh" << 'EOF'
#!/bin/bash

# Health check скрипт для Danny Game

FRONTEND_URL="http://localhost:8082"
ORCHESTRATOR_URL="http://localhost:3001/status"
DOMAIN_URL="https://dannyvshaters.xyz"

echo "🏥 Health Check Danny Game - $(date)"
echo "====================================="

# Перевірка frontend
echo "🔍 Перевірка Frontend (port 8082)..."
if curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FAILED"
    exit 1
fi

# Перевірка orchestrator
echo "🔍 Перевірка Orchestrator (port 3001)..."
if curl -f -s "$ORCHESTRATOR_URL" > /dev/null; then
    echo "✅ Orchestrator: OK"
else
    echo "❌ Orchestrator: FAILED"
    exit 1
fi

# Перевірка домену
echo "🔍 Перевірка домену (HTTPS)..."
if curl -f -s "$DOMAIN_URL" > /dev/null; then
    echo "✅ Domain: OK"
else
    echo "❌ Domain: FAILED"
    exit 1
fi

# Перевірка SSL сертифіката
echo "🔍 Перевірка SSL сертифіката..."
SSL_EXPIRY=$(echo | openssl s_client -servername dannyvshaters.xyz -connect dannyvshaters.xyz:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -gt 7 ]; then
    echo "✅ SSL Certificate: OK ($DAYS_UNTIL_EXPIRY days until expiry)"
else
    echo "⚠️ SSL Certificate: WARNING ($DAYS_UNTIL_EXPIRY days until expiry)"
fi

# Перевірка PM2 процесів
echo "🔍 Перевірка PM2 процесів..."
PM2_STATUS=$(pm2 jlist 2>/dev/null)
if echo "$PM2_STATUS" | grep -q '"status":"online"'; then
    echo "✅ PM2 Processes: OK"
else
    echo "❌ PM2 Processes: FAILED"
    exit 1
fi

# Перевірка використання диску
echo "🔍 Перевірка використання диску..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 85 ]; then
    echo "✅ Disk Usage: OK ($DISK_USAGE%)"
else
    echo "⚠️ Disk Usage: WARNING ($DISK_USAGE%)"
fi

# Перевірка використання пам'яті
echo "🔍 Перевірка використання пам'яті..."
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -lt 90 ]; then
    echo "✅ Memory Usage: OK ($MEM_USAGE%)"
else
    echo "⚠️ Memory Usage: WARNING ($MEM_USAGE%)"
fi

echo "====================================="
echo "✅ Health Check завершено успішно!"
EOF

chmod +x "$APP_DIR/health-check.sh"
chown "$USER":"$USER" "$APP_DIR/health-check.sh"

log "✅ Health check скрипт створено"

log "🔧 Налаштування cron завдань"

# Додавання health check до cron (кожні 5 хвилин)
(crontab -u "$USER" -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/health-check.sh >> $APP_DIR/logs/health-check.log 2>&1") | crontab -u "$USER" -

log "✅ Cron завдання налаштовані"

log "🔧 Створення systemd сервісу для моніторингу"

# Створення systemd сервісу для health check
cat > "/etc/systemd/system/danny-game-monitor.service" << EOF
[Unit]
Description=Danny Game Health Monitor
After=network.target

[Service]
Type=oneshot
User=$USER
ExecStart=$APP_DIR/health-check.sh
StandardOutput=append:$APP_DIR/logs/health-check.log
StandardError=append:$APP_DIR/logs/health-check.log

[Install]
WantedBy=multi-user.target
EOF

# Створення timer для systemd сервісу
cat > "/etc/systemd/system/danny-game-monitor.timer" << EOF
[Unit]
Description=Run Danny Game Health Monitor every 5 minutes
Requires=danny-game-monitor.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Активація systemd сервісів
systemctl daemon-reload
systemctl enable danny-game-monitor.timer
systemctl start danny-game-monitor.timer

log "✅ Systemd моніторинг налаштовано"

log "🔧 Оновлення PM2 конфігурації"

# Оновлення ecosystem.config.js з production налаштуваннями
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
        PORT: 3001,
        DEBUG: false,
        LOG_LEVEL: 'info'
      },
      error_file: '$APP_DIR/logs/orchestrator-error.log',
      out_file: '$APP_DIR/logs/orchestrator-out.log',
      log_file: '$APP_DIR/logs/orchestrator.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s'
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
        PORT: 8082,
        DEBUG: false
      },
      error_file: '$APP_DIR/logs/frontend-error.log',
      out_file: '$APP_DIR/logs/frontend-out.log',
      log_file: '$APP_DIR/logs/frontend.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

chown "$USER":"$USER" "$APP_DIR/ecosystem.config.js"

log "✅ PM2 конфігурація оновлена"

log "🔄 Перезапуск додатків з новою конфігурацією"

# Перезапуск PM2 з новою конфігурацією
sudo -u "$USER" pm2 delete all 2>/dev/null || true
sudo -u "$USER" pm2 start "$APP_DIR/ecosystem.config.js"
sudo -u "$USER" pm2 save

log "✅ Додатки перезапущені"

log "🔧 Створення швидких команд"

# Створення alias для швидкого управління
cat >> "/home/$USER/.bashrc" << 'EOF'

# Danny Game aliases
alias dg-status='pm2 status'
alias dg-logs='pm2 logs'
alias dg-restart='pm2 restart all'
alias dg-stop='pm2 stop all'
alias dg-start='pm2 start ecosystem.config.js'
alias dg-monitor='./monitor.sh'
alias dg-backup='./backup.sh'
alias dg-health='./health-check.sh'
alias dg-update='./update.sh'
EOF

log "✅ Швидкі команди створені"

echo ""
echo "🎉 ==========================================="
echo "🎉 PRODUCTION КОНФІГУРАЦІЯ ЗАВЕРШЕНА!"
echo "🎉 ==========================================="
echo ""
echo "✅ Зміни, які були внесені:"
echo "   📝 Frontend URL змінено на: https://$DOMAIN/api"
echo "   🔧 Додано production налаштування до orchestrator"
echo "   📁 Створено .env файли"
echo "   📊 Налаштовано логування та ротацію"
echo "   🏥 Створено health check систему"
echo "   ⏰ Налаштовано cron та systemd моніторинг"
echo "   🚀 Оновлено PM2 конфігурацію"
echo "   ⚡ Додано швидкі команди (alias)"
echo ""
echo "📋 Корисні команди для користувача $USER:"
echo "   dg-status    - Статус додатків"
echo "   dg-logs      - Перегляд логів"
echo "   dg-restart   - Перезапуск додатків"
echo "   dg-monitor   - Моніторинг системи"
echo "   dg-health    - Health check"
echo "   dg-backup    - Створення backup"
echo "   dg-update    - Оновлення додатку"
echo ""
echo "🌐 Сайт готовий: https://$DOMAIN"
echo "📊 Моніторинг: Кожні 5 хвилин"
echo "💾 Backup: Щонеділі о 2:00"
echo "🔒 SSL: Автоматичне оновлення"
echo ""
echo "✅ Production налаштування завершено!"