# Всі можливі GraphQL запити для Danny Game Leaderboard

Цей документ містить повний перелік усіх можливих GraphQL запитів та мутацій для системи лідерборду Danny Game, базуючись на структурах даних та сервісі.

## 📊 Структури даних

### LeaderboardEntry
```graphql
type LeaderboardEntry {
  playerName: String!
  score: Int!
  chainId: String!
  timestamp: Int!
}
```

### ScoreEntry
```graphql
type ScoreEntry {
  playerName: String!
  score: Int!
  timestamp: Int!
}
```

### Mob
```graphql
type Mob {
  mobId: String!
  mobType: Int!
  currentHealth: Int!
  maxHealth: Int!
  createdAt: Int!
}
```

## 🔍 Query запити (Читання даних)

### 1. Базова інформація гравця

#### Ім'я гравця
```graphql
query GetPlayerName {
  playerName
}
```

#### Баланс монет
```graphql
query GetCoinBalance {
  coinBalance
}
```

#### Здоров'я гравця
```graphql
query GetHealth {
  health
}
```

#### Повна інформація про гравця
```graphql
query GetPlayerInfo {
  playerName
  coinBalance
  health
}
```

### 2. Управління мобами

#### Всі моби
```graphql
query GetAllMobs {
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
    createdAt
  }
}
```

#### Кількість мобів
```graphql
query GetMobCount {
  mobCount
}
```

#### Моби з фільтрацією по типу (приклад)
```graphql
query GetMobsByType {
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
    createdAt
  }
}
```

### 3. Система лідерборду

#### Глобальний лідерборд (всі записи)
```graphql
query GetGlobalLeaderboard {
  globalLeaderboard {
    playerName
    score
    chainId
    timestamp
  }
}
```

#### Топ гравців з лімітом
```graphql
query GetTopPlayers($limit: Int) {
  topPlayers(limit: $limit) {
    playerName
    score
    chainId
    timestamp
  }
}
```

#### Топ 10 гравців
```graphql
query GetTop10Players {
  topPlayers(limit: 10) {
    playerName
    score
    chainId
    timestamp
  }
}
```

#### Топ 5 гравців
```graphql
query GetTop5Players {
  topPlayers(limit: 5) {
    playerName
    score
    chainId
    timestamp
  }
}
```

#### Рейтинг конкретного гравця
```graphql
query GetPlayerRank($playerName: String!) {
  playerRank(playerName: $playerName)
}
```

### 4. Персональна статистика

#### Мої результати (історія)
```graphql
query GetMyScores {
  myScores {
    playerName
    score
    timestamp
  }
}
```

#### Мій найкращий результат
```graphql
query GetMyBestScore {
  myBestScore
}
```

#### Повна персональна статистика
```graphql
query GetMyStats {
  myBestScore
  myScores {
    playerName
    score
    timestamp
  }
}
```

### 5. Інформація про ланцюг

#### Чи є це ланцюг лідерборду
```graphql
query IsLeaderboardChain {
  isLeaderboardChain
}
```

#### ID ланцюга лідерборду
```graphql
query GetLeaderboardChainId {
  leaderboardChainId
}
```

#### Повна інформація про ланцюг
```graphql
query GetChainInfo {
  isLeaderboardChain
  leaderboardChainId
}
```

### 6. Комбіновані запити

#### Повний стан гри
```graphql
query GetFullGameState {
  # Гравець
  playerName
  coinBalance
  health
  
  # Моби
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
    createdAt
  }
  mobCount
  
  # Лідерборд
  globalLeaderboard {
    playerName
    score
    chainId
    timestamp
  }
  
  # Персональна статистика
  myBestScore
  myScores {
    playerName
    score
    timestamp
  }
  
  # Інформація про ланцюг
  isLeaderboardChain
  leaderboardChainId
}
```

#### Дашборд лідерборду
```graphql
query GetLeaderboardDashboard {
  # Топ 10
  topPlayers(limit: 10) {
    playerName
    score
    chainId
    timestamp
  }
  
  # Мій рейтинг
  playerRank(playerName: "YourPlayerName")
  
  # Мій найкращий результат
  myBestScore
  
  # Чи це ланцюг лідерборду
  isLeaderboardChain
}
```

## 🔄 Mutation запити (Зміна даних)

### 1. Налаштування гри

#### Налаштування гри з лідербордом
```graphql
mutation SetupGame($leaderboardChainId: String!, $leaderboardName: String!) {
  setupGame(
    leaderboardChainId: $leaderboardChainId
    leaderboardName: $leaderboardName
  )
}
```

### 2. Управління гравцем

#### Встановити ім'я
```graphql
mutation SetPlayerName($name: String!) {
  setName(name: $name)
}
```

#### Додати монети
```graphql
mutation AddCoins($amount: Int!) {
  addCoins(amount: $amount)
}
```

#### Відняти монети
```graphql
mutation SubtractCoins($amount: Int!) {
  subtractCoins(amount: $amount)
}
```

#### Додати здоров'я
```graphql
mutation AddHealth($amount: Int!) {
  addHealth(amount: $amount)
}
```

#### Відняти здоров'я
```graphql
mutation SubtractHealth($amount: Int!) {
  subtractHealth(amount: $amount)
}
```

### 3. Управління мобами

#### Створити моба
```graphql
mutation CreateMob($mobId: String!, $mobType: Int!, $maxHealth: Int!) {
  createMob(
    mobId: $mobId
    mobType: $mobType
    maxHealth: $maxHealth
  )
}
```

#### Завдати шкоди мобу
```graphql
mutation DamageMob($mobId: String!, $damage: Int!) {
  damageMob(
    mobId: $mobId
    damage: $damage
  )
}
```

#### Видалити моба
```graphql
mutation RemoveMob($mobId: String!) {
  removeMob(mobId: $mobId)
}
```

#### Видалити всіх мобів
```graphql
mutation RemoveAllMobs {
  removeAllMobs
}
```

### 4. Система лідерборду

#### Подати результат
```graphql
mutation SubmitScore($playerName: String!, $score: Int!) {
  submitScore(
    playerName: $playerName
    score: $score
  )
}
```

## 📝 Приклади використання з змінними

### 1. Налаштування гри
```graphql
# Query
mutation SetupGame($leaderboardChainId: String!, $leaderboardName: String!) {
  setupGame(
    leaderboardChainId: $leaderboardChainId
    leaderboardName: $leaderboardName
  )
}

# Variables
{
  "leaderboardChainId": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "leaderboardName": "Danny Game Global Leaderboard"
}
```

### 2. Подача результату
```graphql
# Query
mutation SubmitScore($playerName: String!, $score: Int!) {
  submitScore(
    playerName: $playerName
    score: $score
  )
}

# Variables
{
  "playerName": "Player1",
  "score": 1500
}
```

### 3. Перегляд топ гравців
```graphql
# Query
query GetTopPlayers($limit: Int!) {
  topPlayers(limit: $limit) {
    playerName
    score
    chainId
    timestamp
  }
}

# Variables
{
  "limit": 10
}
```

### 4. Перевірка рейтингу
```graphql
# Query
query GetPlayerRank($playerName: String!) {
  playerRank(playerName: $playerName)
}

# Variables
{
  "playerName": "Player1"
}
```

## 🎯 Спеціальні запити для різних сценаріїв

### Для ланцюга лідерборду
```graphql
query LeaderboardChainData {
  # Перевірити, що це ланцюг лідерборду
  isLeaderboardChain
  
  # Отримати глобальний лідерборд
  globalLeaderboard {
    playerName
    score
    chainId
    timestamp
  }
  
  # Топ 20 гравців
  topPlayers(limit: 20) {
    playerName
    score
    chainId
    timestamp
  }
}
```

### Для ланцюга гравця
```graphql
query PlayerChainData {
  # Базова інформація
  playerName
  coinBalance
  health
  
  # Персональна статистика
  myBestScore
  myScores {
    playerName
    score
    timestamp
  }
  
  # Інформація про лідерборд
  leaderboardChainId
}
```

### Моніторинг гри
```graphql
query GameMonitoring {
  # Стан гравця
  playerName
  coinBalance
  health
  
  # Активні моби
  mobCount
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
  }
  
  # Останні результати
  myScores {
    score
    timestamp
  }
}
```

## 🔧 Налаштування GraphQL клієнта

### Приклад для JavaScript
```javascript
const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';

// Функція для виконання запитів
async function executeQuery(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  });
  
  return response.json();
}

// Приклад використання
const topPlayers = await executeQuery(`
  query GetTopPlayers($limit: Int!) {
    topPlayers(limit: $limit) {
      playerName
      score
      timestamp
    }
  }
`, { limit: 10 });
```

### Приклад для cURL
```bash
# Отримати топ 5 гравців
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { topPlayers(limit: 5) { playerName score timestamp } }"
  }'

# Подати результат
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { submitScore(playerName: \"TestPlayer\", score: 2000) }"
  }'
```

## 📊 Корисні комбінації запитів

### 1. Повний аналіз лідерборду
```graphql
query FullLeaderboardAnalysis {
  # Загальна статистика
  globalLeaderboard {
    playerName
    score
    chainId
    timestamp
  }
  
  # Топ 3
  topPlayers(limit: 3) {
    playerName
    score
  }
  
  # Мій рейтинг
  playerRank(playerName: "YourName")
  
  # Мої результати
  myBestScore
  myScores {
    score
    timestamp
  }
}
```

### 2. Стан гри для UI
```graphql
query GameStateForUI {
  # Інформація гравця для хедера
  playerName
  coinBalance
  health
  
  # Активні моби для ігрового поля
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
  }
  
  # Міні-лідерборд для сайдбару
  topPlayers(limit: 5) {
    playerName
    score
  }
  
  # Мій найкращий результат
  myBestScore
}
```

### 3. Адміністративний огляд
```graphql
query AdminOverview {
  # Інформація про ланцюг
  isLeaderboardChain
  leaderboardChainId
  
  # Статистика
  globalLeaderboard {
    playerName
    score
    chainId
    timestamp
  }
  
  # Кількість активних мобів
  mobCount
}
```

## 🚀 Оптимізація запитів

### Мінімальні запити для швидкості
```graphql
# Тільки топ 3
query QuickTop3 {
  topPlayers(limit: 3) {
    playerName
    score
  }
}

# Тільки мій рейтинг
query MyRankOnly {
  playerRank(playerName: "YourName")
}

# Тільки мій найкращий результат
query MyBestOnly {
  myBestScore
}
```

### Повні запити для аналітики
```graphql
# Повна аналітика
query FullAnalytics {
  globalLeaderboard {
    playerName
    score
    chainId
    timestamp
  }
  myScores {
    playerName
    score
    timestamp
  }
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
    createdAt
  }
}
```

---

**Примітка**: Всі ці запити базуються на поточній структурі Danny Game з Linera SDK v0.14.2. Переконайтеся, що ваш GraphQL сервер запущений на `http://localhost:8080/graphql` перед виконанням запитів.