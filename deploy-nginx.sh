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
EMAIL="admin@$DOMAIN"

# Функція перевірки DNS
check_dns() {
    local domain=$1
    log "🔍 Перевірка DNS для $domain"
    
    # Отримуємо IP сервера
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "unknown")
    
    # Перевіряємо DNS запис
    local dns_ip=$(dig +short $domain 2>/dev/null | tail -n1)
    
    if [ -n "$dns_ip" ] && [ "$dns_ip" != "" ]; then
        if [ "$server_ip" = "$dns_ip" ]; then
            log "✅ DNS налаштовано правильно ($domain -> $dns_ip)"
            return 0
        else
            warn "⚠️ DNS не співпадає: сервер $server_ip, DNS $dns_ip"
            warn "Переконайтеся, що A-запис для $domain вказує на $server_ip"
            return 1
        fi
    else
        warn "❌ DNS запис для $domain не знайдено"
        warn "Створіть A-запис: $domain -> $server_ip"
        return 1
    fi
}

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

# Функція для налаштування SSL
setup_ssl() {
    log "🔒 Налаштування SSL сертифіката"
    
    # Перевірка DNS перед отриманням SSL
    if ! check_dns $DOMAIN; then
        warn "❌ DNS не налаштовано. SSL сертифікат не може бути отриманий."
        warn "Налаштуйте DNS та запустіть скрипт знову."
        return 1
    fi
    
    # Перевірка наявності сертифіката
    if [ ! -d "$SSL_DIR" ]; then
        log "Отримання SSL сертифіката для $DOMAIN"
        
        # Встановлення необхідних пакетів для DNS перевірки
        if ! command -v dig &> /dev/null; then
            log "Встановлення dnsutils..."
            apt install -y dnsutils
        fi
        
        # Спочатку налаштовуємо HTTP конфігурацію для верифікації домену
        log "Створення тимчасової HTTP конфігурації для верифікації"
        cp ./nginx/sites-available/danny-game-dev.conf $SITES_AVAILABLE/danny-game-temp.conf
        
        # Оновлюємо server_name в тимчасовій конфігурації
        sed -i "s/localhost/$DOMAIN www.$DOMAIN/g" $SITES_AVAILABLE/danny-game-temp.conf
        
        # Додаємо location для acme-challenge
        sed -i '/location \/ {/i\    # ACME challenge для Let\'s Encrypt\n    location /.well-known/acme-challenge/ {\n        root /var/www/danny-game;\n        try_files $uri =404;\n    }\n' $SITES_AVAILABLE/danny-game-temp.conf
        
        # Активуємо тимчасову конфігурацію
        ln -sf $SITES_AVAILABLE/danny-game-temp.conf $SITES_ENABLED/danny-game.conf
        
        # Перевіряємо та перезапускаємо nginx
        if nginx -t; then
            systemctl reload nginx
            log "✅ HTTP конфігурація активована для верифікації"
        else
            error "❌ Помилка в HTTP конфігурації"
            return 1
        fi
        
        # Створюємо директорію для ACME challenge
        mkdir -p $APP_DIR/.well-known/acme-challenge
        chown -R www-data:www-data $APP_DIR/.well-known
        
        # Отримуємо SSL сертифікат
        log "Запит SSL сертифіката через Let's Encrypt..."
        if certbot certonly --webroot -w $APP_DIR -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --no-eff-email; then
            log "✅ SSL сертифікат успішно отримано"
            
            # Переключаємося на HTTPS конфігурацію
            ln -sf $SITES_AVAILABLE/danny-game.conf $SITES_ENABLED/danny-game.conf
            
            # Перевіряємо конфігурацію з SSL
            if nginx -t; then
                systemctl reload nginx
                log "✅ HTTPS конфігурація активована"
                
                # Перевіряємо доступність HTTPS
                sleep 2
                if curl -s -k https://$DOMAIN >/dev/null 2>&1; then
                    log "✅ HTTPS сайт доступний"
                    return 0
                else
                    warn "⚠️ HTTPS сайт може бути недоступний"
                    return 0
                fi
            else
                warn "❌ Помилка в HTTPS конфігурації, повертаємося до HTTP"
                ln -sf $SITES_AVAILABLE/danny-game-temp.conf $SITES_ENABLED/danny-game.conf
                systemctl reload nginx
                return 1
            fi
        else
            warn "❌ Не вдалося отримати SSL сертифікат"
            log "Використовуємо HTTP конфігурацію"
            return 1
        fi
    else
        log "✅ SSL сертифікат вже існує"
        
        # Перевіряємо валідність існуючого сертифіката
        if openssl x509 -checkend 86400 -noout -in "$SSL_DIR/cert.pem" >/dev/null 2>&1; then
            log "✅ SSL сертифікат валідний"
            return 0
        else
            warn "⚠️ SSL сертифікат скоро закінчиться або недійсний"
            log "Спроба оновлення сертифіката..."
            if certbot renew --quiet; then
                log "✅ SSL сертифікат оновлено"
                systemctl reload nginx
                return 0
            else
                warn "❌ Не вдалося оновити SSL сертифікат"
                return 1
            fi
        fi
    fi
}

# Налаштування SSL з fallback на HTTP
if setup_ssl; then
    SSL_ENABLED=true
    log "🔒 SSL успішно налаштовано"
else
    SSL_ENABLED=false
    warn "⚠️ Працюємо в HTTP режимі без SSL"
    # Використовуємо development конфігурацію як fallback
    cp ./nginx/sites-available/danny-game-dev.conf $SITES_AVAILABLE/danny-game-http.conf
    sed -i "s/localhost/$DOMAIN www.$DOMAIN/g" $SITES_AVAILABLE/danny-game-http.conf
    ln -sf $SITES_AVAILABLE/danny-game-http.conf $SITES_ENABLED/danny-game.conf
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
if [ "$SSL_ENABLED" = true ]; then
    log "   🌐 Домен: https://$DOMAIN"
    log "   🔒 SSL: Увімкнено ($SSL_DIR)"
    log "   ⚙️ Конфігурація: $SITES_AVAILABLE/danny-game.conf (HTTPS)"
else
    log "   🌐 Домен: http://$DOMAIN"
    log "   🔒 SSL: Вимкнено (HTTP режим)"
    log "   ⚙️ Конфігурація: $SITES_AVAILABLE/danny-game-http.conf (HTTP)"
fi
log "   📁 Директорія: $APP_DIR"
echo
log "🔧 Корисні команди:"
log "   sudo danny-status.sh          # Перевірка статусу"
log "   sudo systemctl restart nginx  # Перезапуск nginx"
log "   sudo nginx -t                 # Перевірка конфігурації"
if [ "$SSL_ENABLED" = true ]; then
    log "   sudo certbot renew            # Оновлення SSL"
    log "   sudo ./switch-nginx-mode.sh   # Переключення режимів"
else
    log "   sudo certbot certonly --webroot -w $APP_DIR -d $DOMAIN -d www.$DOMAIN  # Отримання SSL"
    log "   sudo ./switch-nginx-mode.sh production  # Переключення на HTTPS"
fi
echo
log "📊 Запуск перевірки статусу..."
if [ -f "/usr/local/bin/danny-status.sh" ]; then
    /usr/local/bin/danny-status.sh
else
    warn "Скрипт danny-status.sh ще не створено. Буде доступний після налаштування сервісів."
fi

if [ "$SSL_ENABLED" = true ]; then
    log "✅ Розгортання завершено успішно з SSL!"
else
    warn "⚠️ Розгортання завершено в HTTP режимі. Для SSL виконайте команди вище."
fi