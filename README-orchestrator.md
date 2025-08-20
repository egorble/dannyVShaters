# 🎮 Linera Player Name Orchestrator

Спрощений оркестратор для управління Linera Player Name додатком через HTTP API.

## 🚀 Швидкий старт

### 1. Підготовка середовища

```bash
# Запуск локальної Linera мережі з фаусетом
linera net up --with-faucet --faucet-port 8079

# В іншому терміналі - запуск node service
linera service --port 8081
```

### 2. Встановлення залежностей

```bash
npm install
```

### 3. Запуск оркестратора

```bash
npm run orchestrator
```

Оркестратор буде доступний на `http://localhost:3001`

### 4. Використання фронтенду

Відкрийте у браузері: `http://localhost:3001/player-name-orchestrator-frontend.html`

**Порядок використання:**
- Введіть та встановіть Bytecode ID додатку
- Створіть новий ланцюг
- Створіть додаток на ланцюзі
- Встановіть ім'я гравця
- Запитайте ім'я гравця

## 📡 API Endpoints

### GET /status
Перевірка статусу оркестратора

**Відповідь:**
```json
{
  "orchestrator": "running",
  "faucetUrl": "http://localhost:8079",
  "nodeServiceUrl": "http://localhost:8081",
  "publishedBytecodeId": "abc123...",
  "mainChainId": "def456...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### POST /set-bytecode-id
Встановлення Bytecode ID для додатку вручну

**Тіло запиту:**
```json
{
  "bytecodeId": "abc123..."
}
```

**Відповідь:**
```json
{
  "success": true,
  "message": "Bytecode ID успішно встановлено",
  "bytecodeId": "abc123..."
}
```

### POST /create-chain
Створення нового ланцюга через фаусет

**Відповідь:**
```json
{
  "success": true,
  "message": "Ланцюг успішно створено",
  "chainId": "def456..."
}
```

### POST /create-application
Створення додатку на ланцюзі

**Запит:**
```json
{
  "chainId": "def456...",
  "bytecodeId": "abc123..." // опціонально
}
```

**Відповідь:**
```json
{
  "success": true,
  "message": "Додаток успішно створено",
  "applicationId": "ghi789...",
  "chainId": "def456...",
  "bytecodeId": "abc123..."
}
```

### POST /set-player-name
Встановлення імені гравця

**Запит:**
```json
{
  "chainId": "def456...",
  "applicationId": "ghi789...",
  "playerName": "TestPlayer"
}
```

**Відповідь:**
```json
{
  "success": true,
  "message": "Ім'я \"TestPlayer\" успішно встановлено",
  "playerName": "TestPlayer"
}
```

### GET /get-player-name/:chainId/:applicationId
Отримання поточного імені гравця

**Відповідь:**
```json
{
  "success": true,
  "playerName": "TestPlayer",
  "chainId": "def456...",
  "applicationId": "ghi789..."
}
```

### GET /bytecode-id
Отримання опублікованого Bytecode ID

**Відповідь:**
```json
{
  "bytecodeId": "abc123...",
  "published": true
}
```

## 🎯 Переваги оркестратора

### ✅ Спрощена інтеграція
- Немає потреби в прямому використанні Linera SDK
- HTTP API замість складних GraphQL запитів
- Автоматичне управління wallet.json та permissions

### ✅ Централізоване управління
- Один сервіс для всіх операцій
- Автоматичне відстеження стану (Chain ID, Application ID, Bytecode ID)
- Вбудована обробка помилок та retry логіка

### ✅ Розробницька зручність
- Готовий веб-фронтенд для тестування
- Детальне логування всіх операцій
- Debug інформація та статус моніторинг

### ✅ Продакшн готовність
- Розв'язує проблему "non-existent chain"
- Не потребує перезапуску `linera service`
- Масштабується для множини клієнтів
- Гнучкість встановлення Bytecode ID вручну

## 🔧 Налаштування

### Порти
- **Оркестратор**: `3001`
- **Фаусет**: `8079` 
- **Node Service**: `8081`
- **Linera Service**: `8080`

### Структура проекту
```
linera-app/
├── player-name/                    # Linera додаток
├── player-name-orchestrator.js     # Основний оркестратор
├── player-name-orchestrator-frontend.html  # Веб-фронтенд
├── package.json                    # Залежності
└── README-orchestrator.md          # Ця документація
```

## 🐛 Troubleshooting

### Помилка "Faucet недоступний"
```bash
# Перевірте чи запущена локальна мережа
linera net up --with-faucet --faucet-port 8079
```

### Помилка "Node service недоступний"
```bash
# Запустіть node service
linera service --port 8081
```

### Помилка "Проект player-name не знайдено"
```bash
# Переконайтеся що папка player-name існує
ls player-name/

# Або створіть новий проект
linera project new player-name
```

### Помилка "Cannot find module"
```bash
# Встановіть залежності
npm install
```

## 📚 Порівняння з прямим SDK

| Аспект | Прямий SDK | Оркестратор |
|--------|------------|-------------|
| Складність | Висока | Низька |
| Налаштування | Ручне | Автоматичне |
| Wallet управління | Ручне | Централізоване |
| Chain discovery | Проблематичне | Розв'язано |
| Restart потреба | Так | Ні |
| Продакшн готовність | Складно | Готово |

## 🎉 Висновок

Оркестратор значно спрощує роботу з Linera додатками, надаючи:
- 🚀 Швидкий старт без складного налаштування
- 🎯 Простий HTTP API замість GraphQL
- 🔧 Автоматичне управління всіма компонентами
- 🌐 Готовий веб-фронтенд для тестування
- 📈 Масштабованість для продакшн використання

Ідеально підходить як для розробки, так і для продакшн деплойменту Linera додатків!