# 🎮 Danny Game - Повний гайд по продакшн деплойменту

**Автоматизований деплоймент Danny Game на сервер з Nginx, SSL та повним моніторингом**

## 🚀 Швидкий старт

### 1️⃣ Перевірка готовності системи

```bash
# Зробіть скрипт виконуваним
chmod +x check-prerequisites.sh

# Запустіть перевірку
./check-prerequisites.sh
```

### 2️⃣ Автоматичний деплоймент

```bash
# Зробіть скрипт виконуваним
chmod +x deploy-production.sh

# Запустіть повний деплоймент
./deploy-production.sh
```

### 3️⃣ Управління сервісами

```bash
# Зробіть скрипт виконуваним
chmod +x manage-services.sh

# Перевірте статус
./manage-services.sh status
```

## 📁 Структура файлів деплойменту

```
danny-game/
├── 🚀 deploy-production.sh      # Головний скрипт деплойменту
├── 🛠️ manage-services.sh        # Управління сервісами
├── 🔍 check-prerequisites.sh    # Перевірка готовності
├── 📖 PRODUCTION_DEPLOYMENT.md  # Детальна документація
├── 📋 README_DEPLOYMENT.md      # Цей файл
└── 📊 DEPLOYMENT_GUIDE.md       # Оригінальний гайд
```

## 🎯 Що робить кожен скрипт

### 🔍 `check-prerequisites.sh`
**Перевіряє готовність системи до деплойменту**

✅ **Перевіряє:**
- Операційну систему (Ubuntu/Debian)
- Системні ресурси (диск, пам'ять)
- Мережеве підключення
- DNS налаштування для домену
- Доступність портів (80, 443, 8080, 8082)
- Наявність необхідних команд
- Права користувача та sudo
- Статус firewall

**Використання:**
```bash
./check-prerequisites.sh
```

### 🚀 `deploy-production.sh`
**Повний автоматизований деплоймент**

🔧 **Встановлює та налаштовує:**
- Системні залежності (nginx, certbot, ufw)
- Rust та Linera SDK v0.14.2
- Node.js та npm
- Збирає Danny Game проект
- Налаштовує SSL сертифікат (Let's Encrypt)
- Конфігурує Nginx reverse proxy
- Створює systemd сервіси
- Налаштовує firewall
- Запускає всі сервіси

**Використання:**
```bash
./deploy-production.sh
```

### 🛠️ `manage-services.sh`
**Управління та моніторинг сервісів**

📋 **Доступні команди:**
```bash
./manage-services.sh start       # Запустити всі сервіси
./manage-services.sh stop        # Зупинити всі сервіси
./manage-services.sh restart     # Перезапустити всі сервіси
./manage-services.sh status      # Статус сервісів
./manage-services.sh logs        # Логи всіх сервісів
./manage-services.sh logs-linera # Логи Linera сервісу
./manage-services.sh logs-frontend # Логи Frontend
./manage-services.sh logs-nginx  # Логи Nginx
./manage-services.sh update      # Оновити додаток
./manage-services.sh test        # Тестувати ендпоінти
./manage-services.sh backup      # Створити backup
./manage-services.sh restore     # Відновити з backup
./manage-services.sh ssl-renew   # Оновити SSL сертифікат
./manage-services.sh wallet      # Інформація про wallet
./manage-services.sh health      # Перевірка здоров'я системи
```

## 🌐 Результат деплойменту

Після успішного деплойменту ваш Danny Game буде доступний за адресами:

- **🎮 Головна сторінка:** https://dannyvshaters.xyz
- **📊 GraphQL API:** https://dannyvshaters.xyz/graphql
- **🏥 Health Check:** https://dannyvshaters.xyz/health

## 🔧 Конфігурація

### 📍 Домен та Email
```bash
DOMAIN="dannyvshaters.xyz"
EMAIL="egor4042007@gmail.com"
```

### 🔌 Порти
```bash
LINERA_PORT=8080      # Linera GraphQL сервіс
FRONTEND_PORT=8082    # Frontend сервер
```

### 📁 Директорії
```bash
APP_DIR="/opt/danny-game"                    # Головна директорія
NGINX_CONF_DIR="/etc/nginx/sites-available" # Nginx конфігурація
SSL_DIR="/etc/letsencrypt/live/dannyvshaters.xyz" # SSL сертифікати
```

## 🔐 Безпека

### 🔥 Firewall (UFW)
**Дозволені порти:**
- 22 (SSH)
- 80 (HTTP - редирект на HTTPS)
- 443 (HTTPS)
- 8080 (Linera - тільки локально)
- 8082 (Frontend - тільки локально)

### 🔒 SSL/TLS
- **Сертифікат:** Let's Encrypt
- **Автооновлення:** Так
- **Протоколи:** TLSv1.2, TLSv1.3
- **HSTS:** Увімкнено

### 🛡️ Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## 📊 Моніторинг

### 🔍 Швидка перевірка
```bash
# Статус всіх сервісів
./manage-services.sh status

# Тест всіх ендпоінтів
./manage-services.sh test

# Здоров'я системи
./manage-services.sh health
```

### 📋 Логи
```bash
# Всі логи в реальному часі
./manage-services.sh logs

# Тільки Linera
./manage-services.sh logs-linera

# Тільки Frontend
./manage-services.sh logs-frontend

# Тільки Nginx
./manage-services.sh logs-nginx
```

### 🏥 Health Check
```bash
# Автоматична перевірка
curl https://dannyvshaters.xyz/health

# GraphQL перевірка
curl -X POST https://dannyvshaters.xyz/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

## 🔄 Оновлення

### 🚀 Автоматичне оновлення
```bash
./manage-services.sh update
```

### 🛠️ Ручне оновлення
```bash
# Зупинити сервіси
./manage-services.sh stop

# Перейти в директорію
cd /opt/danny-game

# Оновити код (якщо git)
git pull origin main

# Перебудувати
cargo build --release --target wasm32-unknown-unknown

# Оновити frontend
cd frontend && npm install && cd ..

# Запустити сервіси
./manage-services.sh start
```

## 💾 Backup та відновлення

### 📦 Створення backup
```bash
./manage-services.sh backup
```

### 📥 Відновлення
```bash
./manage-services.sh restore
```

## 🚨 Troubleshooting

### ❌ Проблема: Сервіс не запускається
```bash
# Перевірити статус
sudo systemctl status danny-game-linera

# Переглянути логи
sudo journalctl -u danny-game-linera -n 50

# Перезапустити
sudo systemctl restart danny-game-linera
```

### ❌ Проблема: GraphQL не відповідає
```bash
# Перевірити локальний порт
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Перевірити Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### ❌ Проблема: SSL не працює
```bash
# Перевірити сертифікат
sudo certbot certificates

# Оновити примусово
sudo certbot renew --force-renewal

# Перезапустити Nginx
sudo systemctl restart nginx
```

### ❌ Проблема: Frontend не завантажується
```bash
# Перевірити frontend сервіс
sudo systemctl status danny-game-frontend

# Перевірити локальний порт
curl http://localhost:8082

# Переглянути логи
sudo journalctl -u danny-game-frontend -f
```

## 📈 Оптимізація продуктивності

### ⚡ Nginx
- Gzip стиснення
- Кешування статичних файлів
- Keep-alive з'єднання
- Rate limiting

### 🔧 Systemd
- Обмеження пам'яті
- Обмеження CPU
- Автоматичний перезапуск
- Security restrictions

## 🎯 Масштабування

### 📊 Горизонтальне масштабування
```bash
# Запуск додаткових інстансів
linera service --port 8081 &
linera service --port 8082 &

# Налаштування load balancer в Nginx
```

### 📈 Вертикальне масштабування
- Збільшення RAM
- Збільшення CPU
- SSD диски
- Мережева оптимізація

## 🔗 Корисні команди

### 🎮 Linera
```bash
# Інформація про wallet
linera wallet show

# Статус додатку
linera project list

# GraphQL схема
curl -X POST https://dannyvshaters.xyz/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

### 🌐 Nginx
```bash
# Тест конфігурації
sudo nginx -t

# Перезавантаження конфігурації
sudo nginx -s reload

# Статус
sudo systemctl status nginx
```

### 🔒 SSL
```bash
# Перевірка сертифікату
openssl x509 -enddate -noout -in /etc/letsencrypt/live/dannyvshaters.xyz/fullchain.pem

# Тест SSL
openssl s_client -connect dannyvshaters.xyz:443 -servername dannyvshaters.xyz
```

## 📞 Підтримка

### 🆘 Якщо щось не працює:

1. **Запустіть діагностику:**
   ```bash
   ./manage-services.sh health
   ```

2. **Перевірте логи:**
   ```bash
   ./manage-services.sh logs
   ```

3. **Протестуйте ендпоінти:**
   ```bash
   ./manage-services.sh test
   ```

4. **Перезапустіть сервіси:**
   ```bash
   ./manage-services.sh restart
   ```

### 📧 Контакти
- **Email:** egor4042007@gmail.com
- **Domain:** dannyvshaters.xyz

---

## 🎉 Готово!

**Ваш Danny Game тепер працює на продакшн сервері!**

🌐 **Сайт:** https://dannyvshaters.xyz  
🎮 **Грайте та насолоджуйтесь!**

---

*Створено з ❤️ для Danny Game Community*