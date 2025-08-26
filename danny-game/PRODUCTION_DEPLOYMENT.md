# Danny Game Production Deployment Guide

🎮 **Повний гайд по деплойменту Danny Game на продакшн сервер з Nginx та SSL**

## 📋 Огляд

Цей гайд описує повний процес деплойменту Danny Game на продакшн сервер з:
- ✅ Linera SDK v0.14.2
- ✅ Nginx reverse proxy
- ✅ SSL сертифікат (Let's Encrypt)
- ✅ Systemd сервіси
- ✅ Автоматичне оновлення SSL
- ✅ Моніторинг та логування
- ✅ Безпека та firewall

## 🚀 Що включає деплоймент:

### ⚙️ Linera сервіс:
- ✅ Linera SDK v0.14.2
- ✅ Systemd сервіс для автозапуску
- ✅ GraphQL API на порту 8080

## 🚀 Швидкий старт

### 1. Підготовка сервера

```bash
# Оновіть систему
sudo apt update && sudo apt upgrade -y

# Налаштуйте DNS для вашого домену
# Переконайтеся, що dannyvshaters.xyz вказує на IP вашого сервера
```

### 2. Запуск автоматичного деплойменту

```bash
# Завантажте проект
git clone <your-repo-url> /tmp/danny-game
cd /tmp/danny-game

# Зробіть скрипт виконуваним
chmod +x deploy-production.sh

# Запустіть деплоймент
./deploy-production.sh
```

### 3. Управління сервісами

```bash
# Зробіть скрипт управління виконуваним
chmod +x manage-services.sh

# Перевірте статус
./manage-services.sh status

# Перегляньте логи
./manage-services.sh logs
```

## 🔧 Детальна конфігурація

### Структура проекту після деплойменту

```
/opt/danny-game/
├── src/                    # Rust код контракту
├── frontend/               # Frontend файли
├── target/                 # Скомпільовані WASM файли
├── deployment-info.env     # Інформація про деплоймент
├── deploy-production.sh    # Скрипт деплойменту
└── manage-services.sh      # Скрипт управління
```

### Systemd сервіси

#### Danny Game Linera Service
```bash
# Статус
sudo systemctl status danny-game-linera

# Логи
sudo journalctl -u danny-game-linera -f

# Перезапуск
sudo systemctl restart danny-game-linera
```

#### Danny Game Frontend Service
```bash
# Статус
sudo systemctl status danny-game-frontend

# Логи
sudo journalctl -u danny-game-frontend -f

# Перезапуск
sudo systemctl restart danny-game-frontend
```

### Nginx конфігурація

**Файл:** `/etc/nginx/sites-available/dannyvshaters.xyz`

**Основні функції:**
- HTTP → HTTPS редирект
- SSL/TLS налаштування
- Reverse proxy для Linera GraphQL API
- Reverse proxy для Frontend
- Rate limiting
- Security headers
- CORS підтримка

**Ендпоінти:**
- `https://dannyvshaters.xyz/` - Frontend інтерфейс
- `https://dannyvshaters.xyz/graphql` - Linera GraphQL API
- `https://dannyvshaters.xyz/api/` - API ендпоінти
- `https://dannyvshaters.xyz/health` - Health check

### SSL сертифікат

**Автоматичне оновлення:**
```bash
# Перевірка статусу
sudo certbot certificates

# Тест оновлення
sudo certbot renew --dry-run

# Примусове оновлення
sudo certbot renew --force-renewal
```

## 🛠️ Команди управління

### Основні команди

```bash
# Запуск всіх сервісів
./manage-services.sh start

# Зупинка всіх сервісів
./manage-services.sh stop

# Перезапуск всіх сервісів
./manage-services.sh restart

# Статус сервісів
./manage-services.sh status

# Перегляд логів
./manage-services.sh logs
```

### Спеціалізовані команди

```bash
# Оновлення додатку
./manage-services.sh update

# Тестування ендпоінтів
./manage-services.sh test

# Перевірка здоров'я системи
./manage-services.sh health

# Інформація про гаманець
./manage-services.sh wallet

# Backup
./manage-services.sh backup

# Відновлення з backup
./manage-services.sh restore
```

### Логи

```bash
# Всі логи
./manage-services.sh logs

# Тільки Linera
./manage-services.sh logs-linera

# Тільки Frontend
./manage-services.sh logs-frontend

# Тільки Nginx
./manage-services.sh logs-nginx
```

## 🔍 Моніторинг та діагностика

### Перевірка статусу сервісів

```bash
# Швидка перевірка
curl -s https://dannyvshaters.xyz/health

# Перевірка GraphQL
curl -X POST https://dannyvshaters.xyz/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Перевірка Linera wallet
cd /opt/danny-game && linera wallet show
```

### Системні ресурси

```bash
# Використання диску
df -h

# Використання пам'яті
free -h

# Навантаження CPU
top

# Мережеві з'єднання
ss -tulpn | grep -E ':(80|443|8080|8082)'
```

### Логи помилок

```bash
# Nginx помилки
sudo tail -f /var/log/nginx/error.log

# Системні логи
sudo journalctl -f

# Логи конкретного сервісу
sudo journalctl -u danny-game-linera -f
```

## 🔐 Безпека

### Firewall (UFW)

```bash
# Статус
sudo ufw status

# Дозволені порти:
# - 22 (SSH)
# - 80 (HTTP)
# - 443 (HTTPS)
# - 8080 (Linera - локально)
# - 8082 (Frontend - локально)
```

### SSL/TLS

```bash
# Перевірка SSL сертифікату
openssl s_client -connect dannyvshaters.xyz:443 -servername dannyvshaters.xyz

# Перевірка експірації
openssl x509 -enddate -noout -in /etc/letsencrypt/live/dannyvshaters.xyz/fullchain.pem
```

### Файлові дозволи

```bash
# Важливі файли мають обмежені дозволи:
# ~/.config/linera/wallet.json (600)
# /opt/danny-game/deployment-info.env (600)
# /etc/letsencrypt/live/dannyvshaters.xyz/ (755)
```

## 🚨 Troubleshooting

### Проблема: Сервіс не запускається

```bash
# Перевірте статус
sudo systemctl status danny-game-linera

# Перевірте логи
sudo journalctl -u danny-game-linera -n 50

# Перезапустіть сервіс
sudo systemctl restart danny-game-linera
```

### Проблема: GraphQL не відповідає

```bash
# Перевірте чи запущений Linera сервіс
sudo systemctl status danny-game-linera

# Перевірте локальний порт
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Перевірте Nginx конфігурацію
sudo nginx -t
```

### Проблема: SSL сертифікат не працює

```bash
# Перевірте сертифікат
sudo certbot certificates

# Оновіть сертифікат
sudo certbot renew --force-renewal

# Перезапустіть Nginx
sudo systemctl restart nginx
```

### Проблема: Frontend не завантажується

```bash
# Перевірте frontend сервіс
sudo systemctl status danny-game-frontend

# Перевірте локальний порт
curl http://localhost:8082

# Перевірте логи
sudo journalctl -u danny-game-frontend -f
```

## 📊 Оновлення додатку

### Автоматичне оновлення

```bash
# Використайте скрипт управління
./manage-services.sh update
```

### Ручне оновлення

```bash
cd /opt/danny-game

# Зупиніть сервіси
./manage-services.sh stop

# Оновіть код (якщо використовуєте git)
git pull origin main

# Перебудуйте проект
cargo build --release --target wasm32-unknown-unknown

# Оновіть frontend залежності
cd frontend && npm install && cd ..

# Запустіть сервіси
./manage-services.sh start
```

## 💾 Backup та відновлення

### Створення backup

```bash
# Автоматичний backup
./manage-services.sh backup

# Ручний backup
sudo cp -r /opt/danny-game /opt/danny-game-backup-$(date +%Y%m%d)
sudo cp ~/.config/linera/wallet.json ~/wallet-backup-$(date +%Y%m%d).json
```

### Відновлення з backup

```bash
# Використайте скрипт
./manage-services.sh restore

# Або ручне відновлення
sudo systemctl stop danny-game-*
sudo rm -rf /opt/danny-game
sudo cp -r /opt/danny-game-backup-YYYYMMDD /opt/danny-game
sudo systemctl start danny-game-*
```

## 🎯 Оптимізація продуктивності

### Nginx оптимізація

```nginx
# В /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 1024;

# Gzip стиснення
gzip on;
gzip_vary on;
gzip_min_length 1024;

# Кешування
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Systemd оптимізація

```ini
# В systemd сервісах
[Service]
# Обмеження пам'яті
MemoryLimit=512M

# Обмеження CPU
CPUQuota=50%

# Restart політика
Restart=always
RestartSec=10
```

## 📈 Масштабування

### Горизонтальне масштабування

```bash
# Запуск додаткових інстансів Linera
linera service --port 8081 &
linera service --port 8082 &

# Налаштування load balancer в Nginx
upstream linera_backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}
```

### Моніторинг ресурсів

```bash
# Встановіть htop для моніторингу
sudo apt install htop

# Використовуйте для перегляду ресурсів
htop

# Або використовуйте вбудовану команду
./manage-services.sh health
```

## 🔗 Корисні посилання

- **Сайт:** https://dannyvshaters.xyz
- **GraphQL API:** https://dannyvshaters.xyz/graphql
- **Health Check:** https://dannyvshaters.xyz/health
- **Linera Documentation:** https://docs.linera.io
- **Let's Encrypt:** https://letsencrypt.org

## 📞 Підтримка

Якщо виникли проблеми:

1. **Перевірте логи:** `./manage-services.sh logs`
2. **Перевірте статус:** `./manage-services.sh status`
3. **Перевірте здоров'я:** `./manage-services.sh health`
4. **Тестуйте ендпоінти:** `./manage-services.sh test`

---

**🎮 Успішного деплойменту Danny Game! 🚀**

Ваш Danny Game тепер доступний за адресою: **https://dannyvshaters.xyz**