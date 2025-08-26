#!/bin/bash

# Скрипт для переключення між development та production режимами nginx
# Автоматично змінює конфігурацію та перезапускає сервіси

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

# Змінні
SITES_AVAILABLE="/etc/nginx/sites-available"
SITES_ENABLED="/etc/nginx/sites-enabled"
PROD_CONF="$SITES_AVAILABLE/danny-game.conf"
DEV_CONF="$SITES_AVAILABLE/danny-game-dev.conf"
ACTIVE_CONF="$SITES_ENABLED/danny-game.conf"

# Функція показу поточного режиму
show_current_mode() {
    if [ -L "$ACTIVE_CONF" ]; then
        local target=$(readlink "$ACTIVE_CONF")
        if [[ "$target" == *"danny-game-dev.conf" ]]; then
            echo -e "${BLUE}Поточний режим: ${YELLOW}DEVELOPMENT${NC}"
        elif [[ "$target" == *"danny-game.conf" ]]; then
            echo -e "${BLUE}Поточний режим: ${GREEN}PRODUCTION${NC}"
        else
            echo -e "${BLUE}Поточний режим: ${RED}НЕВІДОМИЙ${NC}"
        fi
    else
        echo -e "${BLUE}Поточний режим: ${RED}НЕ НАЛАШТОВАНО${NC}"
    fi
}

# Функція переключення на development
switch_to_dev() {
    log "🔧 Переключення на DEVELOPMENT режим"
    
    # Перевірка наявності dev конфігурації
    if [ ! -f "$DEV_CONF" ]; then
        error "Файл $DEV_CONF не знайдено"
        exit 1
    fi
    
    # Створення символічного посилання
    ln -sf "$DEV_CONF" "$ACTIVE_CONF"
    
    # Перевірка конфігурації
    if nginx -t; then
        log "✅ Конфігурація валідна"
    else
        error "❌ Помилка в конфігурації nginx"
        exit 1
    fi
    
    # Перезапуск nginx
    systemctl reload nginx
    
    log "✅ Переключено на DEVELOPMENT режим"
    log "   🌐 Доступ: http://localhost"
    log "   🔒 SSL: Вимкнено"
    log "   📝 Логи: /var/log/nginx/danny-game-dev.*.log"
}

# Функція переключення на production
switch_to_prod() {
    log "🚀 Переключення на PRODUCTION режим"
    
    # Перевірка наявності prod конфігурації
    if [ ! -f "$PROD_CONF" ]; then
        error "Файл $PROD_CONF не знайдено"
        exit 1
    fi
    
    # Перевірка SSL сертифіката
    local ssl_dir="/etc/letsencrypt/live/dannyvshaters.xyz"
    if [ ! -d "$ssl_dir" ]; then
        warn "SSL сертифікат не знайдено в $ssl_dir"
        warn "Запустіть 'sudo certbot certonly --nginx -d dannyvshaters.xyz' для отримання SSL"
        
        read -p "Продовжити без SSL? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Операція скасована"
            exit 0
        fi
    fi
    
    # Створення символічного посилання
    ln -sf "$PROD_CONF" "$ACTIVE_CONF"
    
    # Перевірка конфігурації
    if nginx -t; then
        log "✅ Конфігурація валідна"
    else
        error "❌ Помилка в конфігурації nginx"
        exit 1
    fi
    
    # Перезапуск nginx
    systemctl reload nginx
    
    log "✅ Переключено на PRODUCTION режим"
    log "   🌐 Доступ: https://dannyvshaters.xyz"
    log "   🔒 SSL: Увімкнено"
    log "   📝 Логи: /var/log/nginx/danny-game.*.log"
}

# Функція показу статусу
show_status() {
    echo -e "${BLUE}=== Статус nginx конфігурації ===${NC}"
    echo
    
    show_current_mode
    echo
    
    echo -e "${BLUE}📁 Доступні конфігурації:${NC}"
    if [ -f "$PROD_CONF" ]; then
        echo -e "   ✅ Production: $PROD_CONF"
    else
        echo -e "   ❌ Production: $PROD_CONF (не знайдено)"
    fi
    
    if [ -f "$DEV_CONF" ]; then
        echo -e "   ✅ Development: $DEV_CONF"
    else
        echo -e "   ❌ Development: $DEV_CONF (не знайдено)"
    fi
    
    echo
    echo -e "${BLUE}🔗 Активне посилання:${NC}"
    if [ -L "$ACTIVE_CONF" ]; then
        echo -e "   $ACTIVE_CONF -> $(readlink "$ACTIVE_CONF")"
    else
        echo -e "   ❌ Активна конфігурація не знайдена"
    fi
    
    echo
    echo -e "${BLUE}🌐 Статус nginx:${NC}"
    if systemctl is-active --quiet nginx; then
        echo -e "   ✅ nginx запущено"
    else
        echo -e "   ❌ nginx не запущено"
    fi
    
    echo
    echo -e "${BLUE}🔒 SSL сертифікат:${NC}"
    local ssl_dir="/etc/letsencrypt/live/dannyvshaters.xyz"
    if [ -d "$ssl_dir" ]; then
        echo -e "   ✅ SSL сертифікат знайдено"
        if command -v certbot &> /dev/null; then
            local expiry=$(certbot certificates 2>/dev/null | grep "Expiry Date" | head -1 | cut -d: -f2- | xargs)
            if [ -n "$expiry" ]; then
                echo -e "   📅 Термін дії: $expiry"
            fi
        fi
    else
        echo -e "   ❌ SSL сертифікат не знайдено"
    fi
    
    echo
    echo -e "${BLUE}📊 Порти:${NC}"
    if command -v netstat &> /dev/null; then
        netstat -tlnp | grep -E ':(80|443)\s' | while read line; do
            echo -e "   $line"
        done
    else
        ss -tlnp | grep -E ':(80|443)\s' | while read line; do
            echo -e "   $line"
        done
    fi
}

# Функція тестування конфігурації
test_config() {
    log "🧪 Тестування nginx конфігурації"
    
    # Тест синтаксису
    if nginx -t; then
        log "✅ Синтаксис конфігурації валідний"
    else
        error "❌ Помилка в синтаксисі конфігурації"
        return 1
    fi
    
    # Тест доступності портів
    local ports=(80 443)
    for port in "${ports[@]}"; do
        if lsof -i :$port &>/dev/null; then
            log "✅ Порт $port доступний"
        else
            warn "⚠️ Порт $port не використовується"
        fi
    done
    
    # Тест HTTP відповіді
    if systemctl is-active --quiet nginx; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
        if [ "$response" = "200" ]; then
            log "✅ HTTP відповідь: $response (OK)"
        else
            warn "⚠️ HTTP відповідь: $response (Проблема)"
        fi
    else
        warn "⚠️ nginx не запущено, неможливо протестувати HTTP"
    fi
    
    log "🧪 Тестування завершено"
}

# Головна функція
main() {
    case "$1" in
        dev|development)
            switch_to_dev
            ;;
        prod|production)
            switch_to_prod
            ;;
        status)
            show_status
            ;;
        test)
            test_config
            ;;
        *)
            echo -e "${BLUE}🔧 Переключення режимів nginx для Danny Game${NC}"
            echo
            show_current_mode
            echo
            echo -e "${YELLOW}Використання:${NC}"
            echo -e "  $0 dev        # Переключити на development режим"
            echo -e "  $0 prod       # Переключити на production режим"
            echo -e "  $0 status     # Показати поточний статус"
            echo -e "  $0 test       # Протестувати конфігурацію"
            echo
            echo -e "${YELLOW}Режими:${NC}"
            echo -e "  ${GREEN}Production${NC}  - HTTPS, SSL, домен dannyvshaters.xyz"
            echo -e "  ${BLUE}Development${NC} - HTTP, localhost, без SSL"
            echo
            exit 1
            ;;
    esac
}

# Запуск головної функції
main "$@"