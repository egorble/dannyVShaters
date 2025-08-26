#!/bin/bash

# Скрипт для налаштування systemd сервісів Danny Game
# Створює та налаштовує сервіси для orchestrator, frontend та Linera

set -e

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функція для логування
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Перевірка прав root
if [[ $EUID -ne 0 ]]; then
   error "Цей скрипт повинен запускатися з правами root (sudo)"
   exit 1
fi

# Отримання параметрів
APP_DIR="${1:-/var/www/danny-game}"
LINERA_DIR="${2:-/opt/linera}"
ORCHESTRATOR_PATH="${3:-/opt/linera-app/player-name-orchestrator.js}"

log "🔧 Налаштування systemd сервісів для Danny Game"
log "   📁 APP_DIR: $APP_DIR"
log "   ⛓️ LINERA_DIR: $LINERA_DIR"
log "   🔗 ORCHESTRATOR_PATH: $ORCHESTRATOR_PATH"

# Створення користувача linera (якщо не існує)
if ! id "linera" &>/dev/null; then
    log "👤 Створення користувача linera"
    useradd --system --home-dir $LINERA_DIR --shell /bin/bash linera
    mkdir -p $LINERA_DIR
    chown linera:linera $LINERA_DIR
else
    log "✅ Користувач linera вже існує"
fi

# Створення директорій
log "📁 Створення необхідних директорій"
mkdir -p $LINERA_DIR
mkdir -p /var/log/danny-game
mkdir -p /opt/linera-app

# Встановлення прав
chown -R linera:linera $LINERA_DIR
chown -R www-data:www-data $APP_DIR
chown -R www-data:www-data /var/log/danny-game

# Копіювання orchestrator файлу
if [ -f "./player-name-orchestrator.js" ]; then
    cp ./player-name-orchestrator.js /opt/linera-app/
    chown www-data:www-data /opt/linera-app/player-name-orchestrator.js
    log "✅ Orchestrator файл скопійовано"
else
    warn "Файл player-name-orchestrator.js не знайдено"
fi

# Створення сервісу для orchestrator
log "🔗 Створення сервісу danny-orchestrator"
cat > /etc/systemd/system/danny-orchestrator.service << EOF
[Unit]
Description=Danny Game Player Name Orchestrator
After=network.target
Wants=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/linera-app
ExecStart=/usr/bin/node player-name-orchestrator.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/danny-game/orchestrator.log
StandardError=append:/var/log/danny-game/orchestrator.error.log

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOST=127.0.0.1

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/danny-game

[Install]
WantedBy=multi-user.target
EOF

# Створення сервісу для frontend
log "🎮 Створення сервісу danny-frontend"
cat > /etc/systemd/system/danny-frontend.service << EOF
[Unit]
Description=Danny Game Frontend Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node start-server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/danny-game/frontend.log
StandardError=append:/var/log/danny-game/frontend.error.log

# Environment variables
Environment=NODE_ENV=production
Environment=PORT=8082
Environment=HOST=127.0.0.1

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/danny-game

[Install]
WantedBy=multi-user.target
EOF

# Створення сервісу для Linera service
log "⛓️ Створення сервісу linera-service"
cat > /etc/systemd/system/linera-service.service << EOF
[Unit]
Description=Linera GraphQL Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=linera
Group=linera
WorkingDirectory=$LINERA_DIR
ExecStart=/usr/local/bin/linera service --port 8080
Restart=always
RestartSec=10
StandardOutput=append:/var/log/danny-game/linera.log
StandardError=append:/var/log/danny-game/linera.error.log

# Environment variables
Environment=RUST_LOG=info
Environment=LINERA_WALLET_PATH=$LINERA_DIR/.config/linera/wallet.json
Environment=LINERA_STORAGE_PATH=$LINERA_DIR/.local/share/linera

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/danny-game $LINERA_DIR

[Install]
WantedBy=multi-user.target
EOF

# Створення скрипта моніторингу
log "📊 Створення скрипта моніторингу"
cat > /usr/local/bin/danny-status.sh << 'EOF'
#!/bin/bash

# Кольори
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Danny Game Status ===${NC}"
echo

echo -e "${GREEN}🌐 Nginx Status:${NC}"
systemctl status nginx --no-pager -l | head -10
echo

echo -e "${GREEN}🎮 Frontend Status:${NC}"
systemctl status danny-frontend --no-pager -l | head -10
echo

echo -e "${GREEN}🔗 Orchestrator Status:${NC}"
systemctl status danny-orchestrator --no-pager -l | head -10
echo

echo -e "${GREEN}⛓️ Linera Service Status:${NC}"
systemctl status linera-service --no-pager -l | head -10
echo

echo -e "${GREEN}🔒 SSL Certificate Status:${NC}"
if command -v certbot &> /dev/null; then
    certbot certificates 2>/dev/null | head -10
else
    echo "Certbot не встановлено"
fi
echo

echo -e "${GREEN}📊 Port Status:${NC}"
if command -v netstat &> /dev/null; then
    netstat -tlnp | grep -E ':(80|443|3001|8080|8082)\s' || echo "Порти не знайдено"
else
    ss -tlnp | grep -E ':(80|443|3001|8080|8082)\s' || echo "Порти не знайдено"
fi
echo

echo -e "${GREEN}📝 Recent Logs:${NC}"
echo -e "${YELLOW}Nginx Access:${NC}"
if [ -f "/var/log/nginx/danny-game.access.log" ]; then
    tail -n 5 /var/log/nginx/danny-game.access.log
else
    echo "Лог файл не знайдено"
fi
echo

echo -e "${YELLOW}Frontend Logs:${NC}"
if [ -f "/var/log/danny-game/frontend.log" ]; then
    tail -n 5 /var/log/danny-game/frontend.log
else
    echo "Лог файл не знайдено"
fi
echo

echo -e "${YELLOW}Orchestrator Logs:${NC}"
if [ -f "/var/log/danny-game/orchestrator.log" ]; then
    tail -n 5 /var/log/danny-game/orchestrator.log
else
    echo "Лог файл не знайдено"
fi
EOF

chmod +x /usr/local/bin/danny-status.sh

# Створення скрипта для керування сервісами
log "🎛️ Створення скрипта керування"
cat > /usr/local/bin/danny-control.sh << 'EOF'
#!/bin/bash

# Кольори
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICES=("nginx" "danny-frontend" "danny-orchestrator" "linera-service")

case "$1" in
    start)
        echo -e "${GREEN}🚀 Запуск всіх сервісів Danny Game${NC}"
        for service in "${SERVICES[@]}"; do
            echo -e "${BLUE}Запуск $service...${NC}"
            systemctl start "$service"
        done
        ;;
    stop)
        echo -e "${RED}🛑 Зупинка всіх сервісів Danny Game${NC}"
        for service in "${SERVICES[@]}"; do
            echo -e "${BLUE}Зупинка $service...${NC}"
            systemctl stop "$service"
        done
        ;;
    restart)
        echo -e "${YELLOW}🔄 Перезапуск всіх сервісів Danny Game${NC}"
        for service in "${SERVICES[@]}"; do
            echo -e "${BLUE}Перезапуск $service...${NC}"
            systemctl restart "$service"
        done
        ;;
    status)
        /usr/local/bin/danny-status.sh
        ;;
    logs)
        service="${2:-nginx}"
        echo -e "${GREEN}📝 Логи для $service:${NC}"
        journalctl -u "$service" -f
        ;;
    *)
        echo -e "${BLUE}Використання: $0 {start|stop|restart|status|logs [service]}${NC}"
        echo -e "${YELLOW}Доступні сервіси: ${SERVICES[*]}${NC}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/danny-control.sh

# Перезавантаження systemd
log "🔄 Перезавантаження systemd"
systemctl daemon-reload

# Увімкнення сервісів для автозапуску
log "⚡ Увімкнення сервісів для автозапуску"
for service in danny-orchestrator danny-frontend linera-service; do
    systemctl enable "$service"
    log "✅ $service увімкнено для автозапуску"
done

# Перевірка статусу сервісів
log "🎯 Перевірка статусу сервісів"
for service in nginx danny-orchestrator danny-frontend linera-service; do
    if systemctl is-enabled --quiet "$service" 2>/dev/null; then
        log "✅ $service увімкнено для автозапуску"
    else
        warn "❌ $service не увімкнено для автозапуску"
    fi
done

# Створення logrotate конфігурації
log "📋 Налаштування ротації логів"
cat > /etc/logrotate.d/danny-game << EOF
/var/log/danny-game/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload danny-frontend danny-orchestrator
    endscript
}
EOF

log "🎉 НАЛАШТУВАННЯ СЕРВІСІВ ЗАВЕРШЕНО!"
echo
log "📋 Створені сервіси:"
log "   🔗 danny-orchestrator (порт 3001)"
log "   🎮 danny-frontend (порт 8082)"
log "   ⛓️ linera-service (порт 8080)"
echo
log "🔧 Корисні команди:"
log "   sudo danny-control.sh start     # Запуск всіх сервісів"
log "   sudo danny-control.sh stop      # Зупинка всіх сервісів"
log "   sudo danny-control.sh restart   # Перезапуск всіх сервісів"
log "   sudo danny-control.sh status    # Статус всіх сервісів"
log "   sudo danny-control.sh logs nginx # Логи конкретного сервісу"
log "   sudo danny-status.sh            # Детальний статус"
echo
log "✅ Налаштування сервісів завершено!"