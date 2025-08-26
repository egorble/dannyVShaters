#!/bin/bash

# Швидке розгортання Danny Game - все в одному скрипті
# Домен: dannyvshaters.xyz
# Email: egor4042007@gmail.com

set -e

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функція для кольорового виводу
print_color() {
    printf "${1}${2}${NC}\n"
}

print_header() {
    echo ""
    print_color $CYAN "==========================================="
    print_color $CYAN "$1"
    print_color $CYAN "==========================================="
    echo ""
}

print_step() {
    print_color $BLUE "🔄 $1"
}

print_success() {
    print_color $GREEN "✅ $1"
}

print_warning() {
    print_color $YELLOW "⚠️ $1"
}

print_error() {
    print_color $RED "❌ $1"
}

# Змінні
DOMAIN="dannyvshaters.xyz"
EMAIL="egor4042007@gmail.com"
APP_DIR="/var/www/danny-game"
USER="danny-game"
FRONTEND_PORT=8082
ORCHESTRATOR_PORT=3001

print_header "🚀 ШВИДКЕ РОЗГОРТАННЯ DANNY GAME"
print_color $PURPLE "📧 Email: $EMAIL"
print_color $PURPLE "🌐 Домен: $DOMAIN"
print_color $PURPLE "📁 Директорія: $APP_DIR"
print_color $PURPLE "👤 Користувач: $USER"

# Перевірка прав root
if [ "$EUID" -ne 0 ]; then
    print_error "Цей скрипт потрібно запускати з правами root (sudo)"
    exit 1
fi

# Перевірка наявності файлів проекту
if [ ! -f "./danny-game/frontend/package.json" ] || [ ! -f "./player-name-orchestrator.js" ]; then
    print_error "Файли проекту не знайдені. Переконайтеся, що скрипт запускається з кореневої директорії проекту."
    exit 1
fi

print_success "Файли проекту знайдені"

# Функція для перевірки успішності команди
check_command() {
    if [ $? -eq 0 ]; then
        print_success "$1"
    else
        print_error "$1 - ПОМИЛКА!"
        exit 1
    fi
}

# Крок 1: Оновлення системи
print_step "Оновлення системи та встановлення базових пакетів"
apt update && apt upgrade -y
check_command "Система оновлена"

apt install -y curl wget git nginx certbot python3-certbot-nginx build-essential ufw htop iftop
check_command "Базові пакети встановлені"

# Крок 2: Встановлення Node.js
print_step "Встановлення Node.js 18.x"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
check_command "Node.js встановлено"

# Перевірка версії Node.js
NODE_VERSION=$(node --version)
print_success "Node.js версія: $NODE_VERSION"

# Крок 3: Встановлення PM2
print_step "Встановлення PM2"
npm install -g pm2
check_command "PM2 встановлено"

# Крок 4: Створення користувача
print_step "Створення користувача $USER"
if ! id "$USER" &>/dev/null; then
    useradd -m -s /bin/bash "$USER"
    usermod -aG www-data "$USER"
    check_command "Користувач $USER створений"
else
    print_success "Користувач $USER вже існує"
fi

# Крок 5: Створення директорії та копіювання файлів
print_step "Створення директорії та копіювання файлів"
mkdir -p "$APP_DIR"
cp -r ./danny-game/* "$APP_DIR/"
cp ./package.json "$APP_DIR/"
cp ./player-name-orchestrator.js "$APP_DIR/"
cp ./production-config.js "$APP_DIR/"
chown -R "$USER":"$USER" "$APP_DIR"
check_command "Файли скопійовані"

# Крок 6: Встановлення залежностей
print_step "Встановлення залежностей Node.js"
cd "$APP_DIR"
sudo -u "$USER" npm install
check_command "Залежності orchestrator встановлені"

cd "$APP_DIR/frontend"
sudo -u "$USER" npm install
check_command "Залежності frontend встановлені"

# Крок 7: Встановлення Rust та Linera CLI
print_step "Встановлення Rust та Linera CLI"
sudo -u "$USER" bash -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'
sudo -u "$USER" bash -c 'source ~/.cargo/env && cargo install linera-cli@0.14.2'
check_command "Rust та Linera CLI встановлені"

# Крок 8: Налаштування конфігурації для production
print_step "Налаштування production конфігурації"

# Зміна ORCHESTRATOR_URL у frontend
sed -i "s|const ORCHESTRATOR_URL = 'http://localhost:3001';|const ORCHESTRATOR_URL = 'https://$DOMAIN/api';|g" "$APP_DIR/frontend/js/linera-sdk-integration.js"
check_command "Frontend конфігурація оновлена"

# Створення .env файлів
cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
DOMAIN=$DOMAIN
FRONTEND_PORT=$FRONTEND_PORT
ORCHESTRATOR_PORT=$ORCHESTRATOR_PORT
DEBUG=false
LOG_LEVEL=info
EOF

cat > "$APP_DIR/frontend/.env" << EOF
NODE_ENV=production
PORT=$FRONTEND_PORT
DEBUG=false
EOF

chown "$USER":"$USER" "$APP_DIR/.env"
chown "$USER":"$USER" "$APP_DIR/frontend/.env"
check_command "Змінні середовища створені"

# Крок 9: Створення PM2 конфігурації
print_step "Створення PM2 конфігурації"
mkdir -p "$APP_DIR/logs"
chown "$USER":"$USER" "$APP_DIR/logs"

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
        PORT: $ORCHESTRATOR_PORT,
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
        PORT: $FRONTEND_PORT,
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
check_command "PM2 конфігурація створена"

# Крок 10: Налаштування nginx
print_step "Налаштування nginx"
cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
    
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
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
        
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 200;
        }
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://localhost:$FRONTEND_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Cross-Origin-Opener-Policy same-origin;
        add_header Cross-Origin-Embedder-Policy require-corp;
    }
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"
rm -f /etc/nginx/sites-enabled/default
nginx -t
check_command "nginx налаштовано"

# Крок 11: Налаштування firewall
print_step "Налаштування firewall"
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable
check_command "Firewall налаштовано"

# Крок 12: Запуск nginx
print_step "Запуск nginx"
systemctl restart nginx
systemctl enable nginx
check_command "nginx запущено"

# Крок 13: Отримання SSL сертифіката
print_step "Отримання SSL сертифіката від Let's Encrypt"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect
check_command "SSL сертифікат отримано"

# Крок 14: Запуск додатків через PM2
print_step "Запуск додатків через PM2"
cd "$APP_DIR"
sudo -u "$USER" bash -c 'source ~/.cargo/env && pm2 start ecosystem.config.js'
sudo -u "$USER" pm2 save
sudo -u "$USER" pm2 startup
check_command "Додатки запущені через PM2"

# Крок 15: Створення systemd сервісу для PM2
print_step "Створення systemd сервісу для PM2"
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u "$USER" --hp "/home/$USER"
systemctl enable pm2-"$USER"
check_command "Systemd сервіс створено"

# Крок 16: Створення корисних скриптів
print_step "Створення корисних скриптів"

# Скрипт оновлення
cat > "$APP_DIR/update.sh" << 'EOF'
#!/bin/bash
set -e
echo "🔄 Оновлення Danny Game"
pm2 stop all
npm install
cd frontend && npm install && cd ..
pm2 restart all
echo "✅ Оновлення завершено"
EOF

# Скрипт моніторингу
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

# Скрипт backup
cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash
set -e
BACKUP_DIR="/var/backups/danny-game"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
echo "💾 Створення backup Danny Game - $DATE"
tar -czf "$BACKUP_DIR/danny-game-$DATE.tar.gz" -C /var/www danny-game
cp "/etc/nginx/sites-available/dannyvshaters.xyz" "$BACKUP_DIR/nginx-config-$DATE.conf"
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.conf" -mtime +30 -delete
echo "✅ Backup завершено: $BACKUP_DIR/danny-game-$DATE.tar.gz"
EOF

# Health check скрипт
cat > "$APP_DIR/health-check.sh" << 'EOF'
#!/bin/bash
FRONTEND_URL="http://localhost:8082"
ORCHESTRATOR_URL="http://localhost:3001/status"
DOMAIN_URL="https://dannyvshaters.xyz"

echo "🏥 Health Check Danny Game - $(date)"
echo "====================================="

echo "🔍 Перевірка Frontend..."
if curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FAILED"
    exit 1
fi

echo "🔍 Перевірка Orchestrator..."
if curl -f -s "$ORCHESTRATOR_URL" > /dev/null; then
    echo "✅ Orchestrator: OK"
else
    echo "❌ Orchestrator: FAILED"
    exit 1
fi

echo "🔍 Перевірка домену..."
if curl -f -s "$DOMAIN_URL" > /dev/null; then
    echo "✅ Domain: OK"
else
    echo "❌ Domain: FAILED"
    exit 1
fi

echo "✅ Health Check завершено успішно!"
EOF

# Надання прав на виконання
chmod +x "$APP_DIR/update.sh"
chmod +x "$APP_DIR/monitor.sh"
chmod +x "$APP_DIR/backup.sh"
chmod +x "$APP_DIR/health-check.sh"
chown "$USER":"$USER" "$APP_DIR/"*.sh
check_command "Корисні скрипти створені"

# Крок 17: Налаштування автоматизації
print_step "Налаштування автоматизації"

# SSL автооновлення
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Щотижневий backup
(crontab -l 2>/dev/null; echo "0 2 * * 0 $APP_DIR/backup.sh") | crontab -

# Health check кожні 5 хвилин
(crontab -u "$USER" -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/health-check.sh >> $APP_DIR/logs/health-check.log 2>&1") | crontab -u "$USER" -

check_command "Автоматизація налаштована"

# Крок 18: Додавання швидких команд
print_step "Додавання швидких команд"
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
check_command "Швидкі команди додані"

# Крок 19: Фінальна перевірка
print_step "Фінальна перевірка системи"
sleep 10

# Перевірка PM2
PM2_STATUS=$(sudo -u "$USER" pm2 jlist 2>/dev/null)
if echo "$PM2_STATUS" | grep -q '"status":"online"'; then
    print_success "PM2 процеси працюють"
else
    print_warning "PM2 процеси можуть не працювати правильно"
fi

# Перевірка nginx
if systemctl is-active --quiet nginx; then
    print_success "nginx працює"
else
    print_warning "nginx може не працювати правильно"
fi

# Перевірка портів
if netstat -tlnp | grep -q ":$FRONTEND_PORT"; then
    print_success "Frontend порт $FRONTEND_PORT відкритий"
else
    print_warning "Frontend порт $FRONTEND_PORT може бути недоступний"
fi

if netstat -tlnp | grep -q ":$ORCHESTRATOR_PORT"; then
    print_success "Orchestrator порт $ORCHESTRATOR_PORT відкритий"
else
    print_warning "Orchestrator порт $ORCHESTRATOR_PORT може бути недоступний"
fi

print_header "🎉 РОЗГОРТАННЯ ЗАВЕРШЕНО УСПІШНО!"

print_color $GREEN "✅ Danny Game успішно розгорнуто на сервері!"
echo ""
print_color $CYAN "🌐 Сайт доступний за адресою: https://$DOMAIN"
print_color $CYAN "📧 SSL сертифікат налаштовано для: $EMAIL"
echo ""
print_color $YELLOW "📋 Корисні команди для користувача $USER:"
echo "   sudo su - $USER          - Перемикання на користувача"
echo "   dg-status               - Статус додатків"
echo "   dg-logs                 - Перегляд логів"
echo "   dg-restart              - Перезапуск додатків"
echo "   dg-monitor              - Моніторинг системи"
echo "   dg-health               - Health check"
echo "   dg-backup               - Створення backup"
echo "   dg-update               - Оновлення додатку"
echo ""
print_color $PURPLE "📁 Важливі шляхи:"
echo "   Додаток:               $APP_DIR"
echo "   Логи:                  $APP_DIR/logs"
echo "   nginx конфіг:          /etc/nginx/sites-available/$DOMAIN"
echo "   SSL сертифікати:       /etc/letsencrypt/live/$DOMAIN"
echo ""
print_color $BLUE "🔧 Автоматизація:"
echo "   SSL оновлення:         Щодня о 12:00"
echo "   Backup:                Щонеділі о 2:00"
echo "   Health check:          Кожні 5 хвилин"
echo ""
print_color $GREEN "🚀 Готово до використання!"
echo ""
print_color $CYAN "Для перевірки роботи виконайте:"
echo "   sudo -u $USER $APP_DIR/health-check.sh"
echo ""