# 🌐 Nginx конфігурація для Danny Game

Повна інтеграція nginx з Linera сервісом та Danny Game frontend.

## 📁 Структура файлів

```
nginx/
├── nginx.conf                    # Основна конфігурація nginx
├── sites-available/
│   ├── danny-game.conf          # Production конфігурація з SSL
│   └── danny-game-dev.conf      # Development конфігурація без SSL
└── README.md                    # Цей файл

deploy-nginx.sh                  # Скрипт автоматичного розгортання
setup-services.sh                # Скрипт налаштування systemd сервісів
```

## 🚀 Швидкий старт

### Автоматичне розгортання (Рекомендовано)

```bash
# Зробіть скрипт виконуваним
chmod +x deploy-nginx.sh setup-services.sh

# Запустіть розгортання
sudo ./deploy-nginx.sh
```

### Ручне налаштування

#### 1. Встановлення nginx

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 2. Копіювання конфігурації

```bash
# Резервна копія
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Копіювання нової конфігурації
sudo cp nginx/nginx.conf /etc/nginx/
sudo cp nginx/sites-available/danny-game.conf /etc/nginx/sites-available/

# Активація сайту
sudo ln -sf /etc/nginx/sites-available/danny-game.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

#### 3. Перевірка та запуск

```bash
# Перевірка конфігурації
sudo nginx -t

# Перезапуск nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## ⚙️ Конфігурації

### Production (danny-game.conf)

- **SSL/HTTPS**: Автоматичний SSL через Let's Encrypt
- **Домен**: `dannyvshaters.xyz`
- **Безпека**: HSTS, безпекові заголовки
- **Кешування**: Оптимізоване для продакшену

### Development (danny-game-dev.conf)

- **HTTP**: Без SSL для локальної розробки
- **Домен**: `localhost`, `127.0.0.1`
- **Логування**: Детальне для відлагодження
- **Кешування**: Мінімальне для швидкої розробки

## 🔗 Маршрутизація

### Основні маршрути

| Маршрут | Призначення | Upstream |
|---------|-------------|----------|
| `/` | Frontend статичні файли | `danny_frontend:8082` |
| `/graphql` | Linera GraphQL API | `linera_service:8080` |
| `/graphql/ws` | GraphQL WebSocket | `linera_service:8080` |
| `/api/` | Orchestrator API | `orchestrator:3001` |
| `/health` | Перевірка здоров'я | Nginx |

### Статичні ресурси

- **JS/CSS/Images**: Кешування 1 рік (production) / 1 година (dev)
- **WASM файли**: Спеціальні MIME типи та CORS заголовки
- **Fonts**: Підтримка веб-шрифтів

## 🔒 SSL та безпека

### Автоматичне отримання SSL

```bash
# Через certbot (автоматично в deploy-nginx.sh)
sudo certbot certonly --nginx -d dannyvshaters.xyz -d www.dannyvshaters.xyz
```

### Ручне оновлення SSL

```bash
# Оновлення сертифіката
sudo certbot renew

# Перезапуск nginx
sudo systemctl reload nginx
```

### Безпекові заголовки

- **HSTS**: Примусове HTTPS
- **X-Frame-Options**: Захист від clickjacking
- **X-Content-Type-Options**: Захист від MIME sniffing
- **Cross-Origin headers**: Підтримка SharedArrayBuffer

## 🎛️ Керування сервісами

### Створені systemd сервіси

```bash
# Статус всіх сервісів
sudo danny-status.sh

# Керування сервісами
sudo danny-control.sh start     # Запуск всіх
sudo danny-control.sh stop      # Зупинка всіх
sudo danny-control.sh restart   # Перезапуск всіх
sudo danny-control.sh status    # Статус
sudo danny-control.sh logs nginx # Логи конкретного сервісу
```

### Індивідуальне керування

```bash
# Nginx
sudo systemctl start/stop/restart nginx

# Frontend
sudo systemctl start/stop/restart danny-frontend

# Orchestrator
sudo systemctl start/stop/restart danny-orchestrator

# Linera Service
sudo systemctl start/stop/restart linera-service
```

## 📊 Моніторинг та логи

### Лог файли

```bash
# Nginx логи
sudo tail -f /var/log/nginx/danny-game.access.log
sudo tail -f /var/log/nginx/danny-game.error.log

# Сервіси логи
sudo tail -f /var/log/danny-game/frontend.log
sudo tail -f /var/log/danny-game/orchestrator.log
sudo tail -f /var/log/danny-game/linera.log

# Systemd логи
sudo journalctl -u nginx -f
sudo journalctl -u danny-frontend -f
```

### Перевірка портів

```bash
# Активні порти
sudo netstat -tlnp | grep -E ':(80|443|3001|8080|8082)'

# Або з ss
sudo ss -tlnp | grep -E ':(80|443|3001|8080|8082)'
```

## 🔧 Налагодження проблем

### Nginx не запускається

```bash
# Перевірка конфігурації
sudo nginx -t

# Перевірка логів
sudo journalctl -u nginx -n 50

# Перевірка портів
sudo lsof -i :80
sudo lsof -i :443
```

### SSL проблеми

```bash
# Перевірка сертифіката
sudo certbot certificates

# Тест SSL
echo | openssl s_client -servername dannyvshaters.xyz -connect dannyvshaters.xyz:443

# Оновлення сертифіката
sudo certbot renew --dry-run
```

### Сервіси не відповідають

```bash
# Перевірка статусу
sudo danny-status.sh

# Перевірка підключень
curl -I http://localhost:8082  # Frontend
curl -I http://localhost:3001  # Orchestrator
curl -I http://localhost:8080  # Linera

# Перезапуск проблемного сервісу
sudo systemctl restart danny-frontend
```

### CORS проблеми

```bash
# Перевірка заголовків
curl -H "Origin: https://dannyvshaters.xyz" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://dannyvshaters.xyz/graphql
```

## 🔄 Оновлення конфігурації

### Зміна конфігурації nginx

```bash
# Редагування конфігурації
sudo nano /etc/nginx/sites-available/danny-game.conf

# Перевірка
sudo nginx -t

# Застосування змін
sudo systemctl reload nginx
```

### Зміна upstream серверів

```bash
# Редагування основної конфігурації
sudo nano /etc/nginx/nginx.conf

# Перезапуск nginx
sudo systemctl restart nginx
```

## 📈 Оптимізація продуктивності

### Кешування

- **Статичні файли**: 1 рік для production
- **API відповіді**: Без кешування (динамічний контент)
- **GraphQL**: Без кешування (реальний час)

### Стиснення

- **Gzip**: Увімкнено для текстових файлів
- **Рівень стиснення**: 6 (баланс швидкості/розміру)
- **Мінімальний розмір**: 1024 байти

### Підключення

- **Keepalive**: Увімкнено для upstream
- **HTTP/2**: Підтримується для HTTPS
- **WebSocket**: Повна підтримка

## 🌍 Розгортання на різних середовищах

### Локальна розробка

```bash
# Використання dev конфігурації
sudo ln -sf /etc/nginx/sites-available/danny-game-dev.conf /etc/nginx/sites-enabled/danny-game.conf
sudo systemctl reload nginx
```

### Staging сервер

```bash
# Копіювання production конфігурації з іншим доменом
sudo cp /etc/nginx/sites-available/danny-game.conf /etc/nginx/sites-available/danny-game-staging.conf
sudo sed -i 's/dannyvshaters.xyz/staging.dannyvshaters.xyz/g' /etc/nginx/sites-available/danny-game-staging.conf
```

### Production сервер

```bash
# Повне розгортання з SSL
sudo ./deploy-nginx.sh
```

## 📚 Додаткові ресурси

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Linera Protocol](https://github.com/linera-io/linera-protocol)
- [Danny Game Repository](https://github.com/your-repo/danny-game)

---

**Успішного розгортання!** 🚀

Якщо виникли проблеми, перевірте логи або створіть Issue в репозиторії.