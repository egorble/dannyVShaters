# Nginx Integration для Danny Game

Повна інтеграція nginx з Linera blockchain та Danny Game frontend.

## 📁 Структура файлів

```
c:\linera-app\
├── nginx/
│   ├── nginx.conf                    # Основна конфігурація nginx
│   ├── sites-available/
│   │   ├── danny-game.conf          # Production конфігурація (HTTPS)
│   │   └── danny-game-dev.conf      # Development конфігурація (HTTP)
│   └── README.md                    # Детальна документація nginx
├── deploy-nginx.sh                  # Автоматичне розгортання nginx
├── setup-services.sh               # Налаштування systemd сервісів
├── switch-nginx-mode.sh             # Переключення dev/prod режимів
└── danny-game/
    └── frontend/
        └── start-server.js          # Frontend сервер (порт 8082)
```

## 🚀 Швидкий старт

### Автоматичне розгортання

```bash
# Повне розгортання з nginx, SSL та сервісами
sudo ./deploy-nginx.sh

# Переключення на development режим
sudo ./switch-nginx-mode.sh dev

# Переключення на production режим
sudo ./switch-nginx-mode.sh prod
```

### Ручне налаштування

```bash
# 1. Встановлення nginx
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# 2. Копіювання конфігурацій
sudo cp nginx/nginx.conf /etc/nginx/
sudo cp nginx/sites-available/* /etc/nginx/sites-available/

# 3. Активація development режиму
sudo ln -sf /etc/nginx/sites-available/danny-game-dev.conf /etc/nginx/sites-enabled/danny-game.conf
sudo nginx -t && sudo systemctl reload nginx

# 4. Налаштування сервісів
sudo ./setup-services.sh
```

## 🔧 Конфігурації

### Production (HTTPS)
- **Домен**: dannyvshaters.xyz
- **SSL**: Let's Encrypt сертифікат
- **Порти**: 80 (redirect) → 443 (HTTPS)
- **Безпека**: HSTS, CSP, CORS headers
- **Логи**: `/var/log/nginx/danny-game.*.log`

### Development (HTTP)
- **Домен**: localhost
- **SSL**: Вимкнено
- **Порт**: 80 (HTTP)
- **CORS**: Налаштовано для розробки
- **Логи**: `/var/log/nginx/danny-game-dev.*.log`

## 🌐 Маршрутизація

| Шлях | Призначення | Порт |
|------|-------------|------|
| `/` | Danny Game Frontend | 8082 |
| `/api/graphql` | Linera GraphQL API | 8080 |
| `/ws` | WebSocket (GraphQL) | 8080 |
| `/orchestrator/` | Player Name API | 3001 |
| `/health` | Health check | - |
| `/static/` | Статичні файли | 8082 |

## 🔒 Безпека

### SSL/TLS
```bash
# Отримання SSL сертифіката
sudo certbot certonly --nginx -d dannyvshaters.xyz

# Автоматичне оновлення
sudo crontab -e
# Додати: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers
- **HSTS**: Примусове HTTPS
- **CSP**: Content Security Policy
- **X-Frame-Options**: Захист від clickjacking
- **X-Content-Type-Options**: MIME type sniffing
- **Referrer-Policy**: Контроль referrer

### CORS для SharedArrayBuffer
```nginx
add_header Cross-Origin-Embedder-Policy require-corp;
add_header Cross-Origin-Opener-Policy same-origin;
```

## 📊 Моніторинг

### Статус сервісів
```bash
# Перевірка всіх сервісів
sudo ./danny-control.sh status

# Детальний статус nginx
sudo ./switch-nginx-mode.sh status

# Логи nginx
sudo tail -f /var/log/nginx/danny-game.access.log
sudo tail -f /var/log/nginx/danny-game.error.log
```

### Health Checks
```bash
# Перевірка доступності
curl -I http://localhost/health
curl -I https://dannyvshaters.xyz/health

# Перевірка API
curl http://localhost/api/graphql -d '{"query":"{__typename}"}'
```

## 🛠️ Управління сервісами

### Systemd сервіси
```bash
# Danny Game Frontend
sudo systemctl start danny-frontend
sudo systemctl enable danny-frontend

# Player Name Orchestrator
sudo systemctl start danny-orchestrator
sudo systemctl enable danny-orchestrator

# Linera Service
sudo systemctl start danny-linera
sudo systemctl enable danny-linera
```

### Контрольний скрипт
```bash
# Запуск всіх сервісів
sudo ./danny-control.sh start

# Зупинка всіх сервісів
sudo ./danny-control.sh stop

# Перезапуск всіх сервісів
sudo ./danny-control.sh restart

# Статус всіх сервісів
sudo ./danny-control.sh status
```

## 🔄 Переключення режимів

### Development режим
```bash
sudo ./switch-nginx-mode.sh dev
```
- HTTP на порту 80
- Без SSL
- Доступ через localhost
- Розширені CORS headers

### Production режим
```bash
sudo ./switch-nginx-mode.sh prod
```
- HTTPS на порту 443
- SSL сертифікат
- Домен dannyvshaters.xyz
- Безпечні headers

## 🐛 Troubleshooting

### Nginx не запускається
```bash
# Перевірка конфігурації
sudo nginx -t

# Перевірка портів
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Перевірка логів
sudo journalctl -u nginx -f
```

### SSL проблеми
```bash
# Перевірка сертифіката
sudo certbot certificates

# Оновлення сертифіката
sudo certbot renew --dry-run

# Перевірка SSL конфігурації
openssl s_client -connect dannyvshaters.xyz:443
```

### API недоступний
```bash
# Перевірка backend сервісів
sudo systemctl status danny-frontend
sudo systemctl status danny-orchestrator
sudo systemctl status danny-linera

# Перевірка портів
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :8082
sudo netstat -tlnp | grep :3001
```

### CORS помилки
```bash
# Перевірка CORS headers
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost/api/graphql
```

## 📈 Оптимізація

### Кешування
```nginx
# Статичні файли (1 рік)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML файли (1 година)
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public";
}
```

### Gzip стиснення
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

### Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

## 🔧 Налаштування для різних середовищ

### Локальна розробка
```bash
# Запуск без nginx
cd danny-game/frontend
npm start  # Порт 8082

# Запуск orchestrator
node ../player-name-orchestrator.js  # Порт 3001
```

### Staging
```bash
# Використання development конфігурації з SSL
sudo ./switch-nginx-mode.sh dev
# Додати SSL вручну якщо потрібно
```

### Production
```bash
# Повне production розгортання
sudo ./deploy-nginx.sh
sudo ./switch-nginx-mode.sh prod
```

## 📝 Логування

### Формат логів
```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for" '
                'rt=$request_time uct="$upstream_connect_time" '
                'uht="$upstream_header_time" urt="$upstream_response_time"';
```

### Аналіз логів
```bash
# Топ IP адреси
sudo awk '{print $1}' /var/log/nginx/danny-game.access.log | sort | uniq -c | sort -nr | head -10

# Помилки 4xx/5xx
sudo awk '$9 ~ /^[45]/ {print $9, $7}' /var/log/nginx/danny-game.access.log | sort | uniq -c

# Час відповіді
sudo awk '{print $NF}' /var/log/nginx/danny-game.access.log | sort -n | tail -10
```

## 🔄 Backup та відновлення

### Backup конфігурації
```bash
# Створення backup
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz \
    /etc/nginx/nginx.conf \
    /etc/nginx/sites-available/danny-game* \
    /etc/letsencrypt/

# Відновлення
sudo tar -xzf nginx-backup-YYYYMMDD.tar.gz -C /
sudo nginx -t && sudo systemctl reload nginx
```

## 📞 Підтримка

Для отримання допомоги:
1. Перевірте логи: `sudo journalctl -u nginx -f`
2. Протестуйте конфігурацію: `sudo nginx -t`
3. Перевірте статус: `sudo ./switch-nginx-mode.sh status`
4. Перегляньте документацію: `nginx/README.md`

---

**Версія**: 1.0  
**Останнє оновлення**: $(date +%Y-%m-%d)  
**Сумісність**: Nginx 1.18+, Ubuntu 20.04+, Linera SDK v0.14.2+