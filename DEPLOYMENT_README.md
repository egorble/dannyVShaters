# 🚀 Розгортання Danny Game на сервері

Цей документ містить повні інструкції для розгортання Danny Game на production сервері з nginx, SSL сертифікатом та автоматизацією.

## 📋 Передумови

### Системні вимоги
- **ОС**: Ubuntu 20.04+ або Debian 11+
- **RAM**: Мінімум 2GB, рекомендовано 4GB+
- **Диск**: Мінімум 20GB вільного місця
- **CPU**: 2+ ядра
- **Мережа**: Статична IP адреса

### Доменні налаштування
- Домен: `dannyvshaters.xyz`
- DNS записи повинні вказувати на IP сервера:
  - A запис: `dannyvshaters.xyz` → IP сервера
  - A запис: `www.dannyvshaters.xyz` → IP сервера

## 🛠️ Автоматичне розгортання

### Крок 1: Підготовка файлів

1. Завантажте всі файли проекту на сервер:
```bash
# Клонування репозиторію або завантаження файлів
scp -r ./linera-app/ user@your-server:/tmp/
```

2. Підключіться до сервера:
```bash
ssh user@your-server
```

3. Перейдіть до директорії з проектом:
```bash
cd /tmp/linera-app
```

### Крок 2: Запуск скрипту розгортання

```bash
# Надання прав на виконання
chmod +x deploy-server.sh

# Запуск розгортання (потрібні права root)
sudo ./deploy-server.sh
```

### Що робить скрипт:

1. **Оновлення системи** та встановлення залежностей
2. **Встановлення Node.js 18.x** та PM2
3. **Створення користувача** `danny-game`
4. **Копіювання файлів** проекту до `/var/www/danny-game`
5. **Встановлення залежностей** Node.js
6. **Встановлення Rust** та Linera CLI
7. **Налаштування PM2** для управління процесами
8. **Конфігурація nginx** з SSL підтримкою
9. **Отримання SSL сертифіката** від Let's Encrypt
10. **Запуск додатків** через PM2
11. **Налаштування автоматизації** (backup, моніторинг)

## 🏗️ Архітектура розгортання

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Користувач    │───▶│      nginx       │───▶│   Frontend      │
│  (браузер)      │    │   (SSL/HTTPS)    │    │  (Port 8082)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Orchestrator   │
                       │  (Port 3001)    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Linera Network  │
                       │  (Blockchain)   │
                       └─────────────────┘
```

## 📁 Структура файлів на сервері

```
/var/www/danny-game/
├── frontend/                    # Frontend додатку
│   ├── index.html
│   ├── js/
│   ├── css/
│   ├── assets/
│   ├── package.json
│   └── start-server.js         # HTTP сервер для frontend
├── src/                        # Rust код контракту
├── player-name-orchestrator.js # Backend API сервер
├── package.json               # Залежності orchestrator
├── ecosystem.config.js        # Конфігурація PM2
├── update.sh                  # Скрипт оновлення
├── monitor.sh                 # Скрипт моніторингу
└── backup.sh                  # Скрипт backup
```

## 🔧 Управління додатком

### PM2 команди

```bash
# Перемикання на користувача danny-game
sudo su - danny-game

# Статус процесів
pm2 status

# Перегляд логів
pm2 logs
pm2 logs danny-game-frontend
pm2 logs danny-game-orchestrator

# Перезапуск
pm2 restart all
pm2 restart danny-game-frontend
pm2 restart danny-game-orchestrator

# Зупинка
pm2 stop all

# Запуск
pm2 start ecosystem.config.js
```

### Корисні скрипти

```bash
# Оновлення додатку
sudo -u danny-game /var/www/danny-game/update.sh

# Моніторинг системи
sudo -u danny-game /var/www/danny-game/monitor.sh

# Створення backup
sudo -u danny-game /var/www/danny-game/backup.sh
```

## 🌐 Налаштування nginx

### Основна конфігурація
- **Файл**: `/etc/nginx/sites-available/dannyvshaters.xyz`
- **SSL**: Автоматично налаштовується через Let's Encrypt
- **HTTPS**: Примусове перенаправлення з HTTP

### Маршрутизація
- `/` → Frontend (port 8082)
- `/api/*` → Orchestrator API (port 3001)

### Перезапуск nginx
```bash
# Перевірка конфігурації
sudo nginx -t

# Перезапуск
sudo systemctl restart nginx

# Статус
sudo systemctl status nginx
```

## 🔒 SSL сертифікат

### Автоматичне оновлення
Сертифікат автоматично оновлюється через cron:
```bash
# Перевірка cron завдань
crontab -l

# Ручне оновлення
sudo certbot renew

# Статус сертифікатів
sudo certbot certificates
```

## 📊 Моніторинг та логи

### Логи PM2
```bash
# Всі логи
tail -f /var/log/pm2/*.log

# Frontend логи
tail -f /var/log/pm2/frontend-*.log

# Orchestrator логи
tail -f /var/log/pm2/orchestrator-*.log
```

### Системні логи
```bash
# nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Системні логи
sudo journalctl -u nginx -f
sudo journalctl -u pm2-danny-game -f
```

### Моніторинг ресурсів
```bash
# Використання CPU та пам'яті
htop

# Використання диску
df -h

# Мережевий трафік
iftop

# Процеси Node.js
ps aux | grep node
```

## 💾 Backup та відновлення

### Автоматичний backup
- **Розклад**: Щонеділі о 2:00 ранку
- **Зберігання**: 30 днів
- **Локація**: `/var/backups/danny-game/`

### Ручний backup
```bash
sudo -u danny-game /var/www/danny-game/backup.sh
```

### Відновлення з backup
```bash
# Зупинка додатків
sudo -u danny-game pm2 stop all

# Відновлення файлів
sudo tar -xzf /var/backups/danny-game/danny-game-YYYYMMDD_HHMMSS.tar.gz -C /var/www/

# Встановлення залежностей
cd /var/www/danny-game
sudo -u danny-game npm install
cd frontend
sudo -u danny-game npm install

# Запуск додатків
sudo -u danny-game pm2 start ecosystem.config.js
```

## 🔧 Налаштування конфігурації

### Frontend конфігурація
**Файл**: `/var/www/danny-game/frontend/js/linera-sdk-integration.js`

```javascript
// Зміна URL orchestrator для production
const ORCHESTRATOR_URL = 'https://dannyvshaters.xyz/api';
```

### Orchestrator конфігурація
**Файл**: `/var/www/danny-game/player-name-orchestrator.js`

```javascript
// Налаштування портів та URL
const port = 3001;
const FAUCET_URL = "https://faucet.testnet-babbage.linera.net";
const NODE_SERVICE_URL = "http://localhost:8080";
```

## 🚨 Усунення проблем

### Проблема: Сайт недоступний

1. Перевірте статус nginx:
```bash
sudo systemctl status nginx
```

2. Перевірте статус PM2:
```bash
sudo -u danny-game pm2 status
```

3. Перевірте логи:
```bash
sudo tail -f /var/log/nginx/error.log
sudo -u danny-game pm2 logs
```

### Проблема: SSL сертифікат не працює

1. Перевірте сертифікат:
```bash
sudo certbot certificates
```

2. Оновіть сертифікат:
```bash
sudo certbot renew
```

3. Перезапустіть nginx:
```bash
sudo systemctl restart nginx
```

### Проблема: Високе навантаження

1. Перевірте ресурси:
```bash
htop
df -h
free -h
```

2. Перезапустіть додатки:
```bash
sudo -u danny-game pm2 restart all
```

### Проблема: Orchestrator не відповідає

1. Перевірте порт:
```bash
netstat -tlnp | grep 3001
```

2. Перезапустіть orchestrator:
```bash
sudo -u danny-game pm2 restart danny-game-orchestrator
```

## 🔄 Оновлення додатку

### Автоматичне оновлення
```bash
sudo -u danny-game /var/www/danny-game/update.sh
```

### Ручне оновлення
```bash
# 1. Зупинка додатків
sudo -u danny-game pm2 stop all

# 2. Backup поточної версії
sudo -u danny-game /var/www/danny-game/backup.sh

# 3. Оновлення коду (якщо використовується git)
cd /var/www/danny-game
sudo -u danny-game git pull origin main

# 4. Встановлення залежностей
sudo -u danny-game npm install
cd frontend
sudo -u danny-game npm install
cd ..

# 5. Запуск додатків
sudo -u danny-game pm2 start ecosystem.config.js
```

## 📞 Підтримка

### Контакти
- **Email**: egor4042007@gmail.com
- **Домен**: dannyvshaters.xyz

### Корисні посилання
- [Linera Documentation](https://docs.linera.io/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**✅ Після успішного розгортання ваш Danny Game буде доступний за адресою: https://dannyvshaters.xyz**