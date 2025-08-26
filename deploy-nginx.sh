#!/bin/bash

# Скрипт для розгортання nginx конфігурації Danny Game
# Автоматично налаштовує nginx з SSL та інтеграцією Linera

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

log "🚀 Початок розгортання nginx для Danny Game"

# Змінні
DOMAIN="dannyvshaters.xyz"
APP_DIR="/var/www/danny-game"
NGINX_CONF_DIR="/etc/nginx"
SITES_AVAILABLE="$NGINX_CONF_DIR/sites-available"
SITES_ENABLED="$NGINX_CONF_DIR/sites-enabled"
SSL_DIR="/etc/letsencrypt/live/$DOMAIN"

# Функція перевірки сервісу
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        log "✅ $service запущено"
        return 0
    else
        warn "❌ $service не запущено"
        return 1
    fi
}

# Встановлення nginx
log "📦 Перевірка та встановлення nginx"
if ! command -v nginx &> /dev/null; then
    log "Встановлення nginx..."
    apt update
    apt install -y nginx
else
    log "✅ nginx вже встановлено"
fi

# Встановлення certbot для SSL
log "🔒 Перевірка та встановлення certbot"
if ! command -v certbot &> /dev/null; then
    log "Встановлення certbot..."
    apt install -y certbot python3-certbot-nginx
else
    log "✅ certbot вже встановлено"
fi

# Створення директорії для додатку
log "📁 Створення директорії додатку"
mkdir -p $APP_DIR
chown -R www-data:www-data $APP_DIR

# Копіювання файлів frontend
log "📋 Копіювання файлів frontend"
if [ -d "./danny-game/frontend" ]; then
    cp -r ./danny-game/frontend/* $APP_DIR/
    chown -R www-data:www-data $APP_DIR
    log "✅ Файли frontend скопійовано"
else
    warn "Директорія ./danny-game/frontend не знайдена"
fi

# Копіювання конфігурації nginx
log "⚙️ Налаштування nginx конфігурації"

# Резервна копія основної конфігурації
if [ -f "$NGINX_CONF_DIR/nginx.conf" ]; then
    cp "$NGINX_CONF_DIR/nginx.conf" "$NGINX_CONF_DIR/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Копіювання нової конфігурації
cp ./nginx/nginx.conf $NGINX_CONF_DIR/
cp ./nginx/sites-available/danny-game.conf $SITES_AVAILABLE/

# Створення символічного посилання
ln -sf $SITES_AVAILABLE/danny-game.conf $SITES_ENABLED/

# Видалення default конфігурації
if [ -f "$SITES_ENABLED/default" ]; then
    rm $SITES_ENABLED/default
    log "🗑️ Видалено default конфігурацію"
fi

# Перевірка конфігурації nginx
log "🔍 Перевірка конфігурації nginx"
if nginx -t; then
    log "✅ Конфігурація nginx валідна"
else
    error "❌ Помилка в конфігурації nginx"
    exit 1
fi

# Отримання SSL сертифіката
log "🔒 Налаштування SSL сертифіката"
if [ ! -d "$SSL_DIR" ]; then
    log "Отримання SSL сертифіката для $DOMAIN"
    certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    if [ $? -eq 0 ]; then
        log "✅ SSL сертифікат отримано"
    else
        warn "❌ Не вдалося отримати SSL сертифікат. Продовжуємо без SSL..."
        # Створюємо тимчасову HTTP конфігурацію
        sed 's/listen 443 ssl http2;/listen 80;/g' $SITES_AVAILABLE/danny-game.conf > $SITES_AVAILABLE/danny-game-http.conf
        sed -i '/ssl_/d' $SITES_AVAILABLE/danny-game-http.conf
        ln -sf $SITES_AVAILABLE/danny-game-http.conf $SITES_ENABLED/danny-game.conf
    fi
else
    log "✅ SSL сертифікат вже існує"
fi

# Налаштування автоматичного оновлення SSL
log "🔄 Налаштування автоматичного оновлення SSL"
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Запуск та увімкнення nginx
log "🚀 Запуск nginx"
systemctl enable nginx
systemctl restart nginx

if check_service nginx; then
    log "✅ nginx успішно запущено"
else
    error "❌ Не вдалося запустити nginx"
    exit 1
fi

# Налаштування firewall
log "🔥 Налаштування firewall"
if command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
    ufw allow ssh
    log "✅ Firewall налаштовано"
fi

# Запуск скрипта налаштування сервісів
log "⚙️ Налаштування systemd сервісів"
if [ -f "./setup-services.sh" ]; then
    chmod +x ./setup-services.sh
    ./setup-services.sh "$APP_DIR"
else
    warn "Файл setup-services.sh не знайдено. Створіть його окремо."
fi

log "🎉 РОЗГОРТАННЯ NGINX ЗАВЕРШЕНО!"
echo
log "📋 Інформація про розгортання:"
log "   🌐 Домен: https://$DOMAIN"
log "   📁 Директорія: $APP_DIR"
log "   ⚙️ Конфігурація nginx: $SITES_AVAILABLE/danny-game.conf"
log "   🔒 SSL: $SSL_DIR"
echo
log "🔧 Корисні команди:"
log "   sudo danny-status.sh          # Перевірка статусу"
log "   sudo systemctl restart nginx  # Перезапуск nginx"
log "   sudo nginx -t                 # Перевірка конфігурації"
log "   sudo certbot renew            # Оновлення SSL"
echo
log "📊 Запуск перевірки статусу..."
/usr/local/bin/danny-status.sh

log "✅ Розгортання завершено успішно!"