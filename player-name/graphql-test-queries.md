# GraphQL Test Queries for PlayerName Application

## Queries (Data retrieval requests)

### 1. Get player name
```graphql
query GetPlayerName {
  playerName
}
```

### 2. Get coin balance
```graphql
query GetCoinBalance {
  coinBalance
}
```

### 3. Get player health
```graphql
query GetHealth {
  health
}
```

### 4. Get all mobs
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

### 5. Get mob count
```graphql
query GetMobCount {
  mobCount
}
```

### 6. Complex query - all player information
```graphql
query GetPlayerInfo {
  playerName
  coinBalance
  health
  mobCount
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
    createdAt
  }
}
```

## Mutations (State change mutations)

### 1. Set player name
```graphql
mutation SetPlayerName {
  setName(name: "TestPlayer123") 
}
```

### 2. Add coins
```graphql
mutation AddCoins {
  addCoins(amount: 100)
}
```

### 3. Subtract coins
```graphql
mutation SubtractCoins {
  subtractCoins(amount: 50)
}
```

### 4. Add health
```graphql
mutation AddHealth {
  addHealth(amount: 25)
}
```

### 5. Subtract health
```graphql
mutation SubtractHealth {
  subtractHealth(amount: 10)
}
```

### 6. Create mob
```graphql
mutation CreateMob {
  createMob(mobId: "orc_001", mobType: 1, maxHealth: 100)
}
```

### 7. Damage mob
```graphql
mutation DamageMob {
  damageMob(mobId: "orc_001", damage: 25)
}
```

### 8. Delete mob
```graphql
mutation RemoveMob {
  removeMob(mobId: "orc_001")
}
```

## Complex test scenarios

### Scenario 1: Full player initialization

# 1. Set name
mutation {
  setName(name: "Hero123")
}

# 2. Add initial coins
mutation {
  addCoins(amount: 500)
}

# 3. Set initial health
mutation {
  addHealth(amount: 100)
}

# 4. Check state
query {
  playerName
  coinBalance
  health
}
```

### Scenario 2: Mob management

# 1. Create several mobs
mutation {
  createMob(mobId: "goblin_001", mobType: 1, maxHealth: 50)
}

mutation {
  createMob(mobId: "orc_001", mobType: 2, maxHealth: 100)
}

mutation {
  createMob(mobId: "dragon_001", mobType: 3, maxHealth: 500)
}

# 2. Check created mobs
query {
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
    createdAt
  }
  mobCount
}

# 3. Damage mobs
mutation {
  damageMob(mobId: "goblin_001", damage: 30)
}

mutation {
  damageMob(mobId: "orc_001", damage: 75)
}

# 4. Check state after attack
query {
  mobs {
    mobId
    currentHealth
    maxHealth
  }
}

# 5. Delete weak mob
mutation {
  removeMob(mobId: "goblin_001")
}

# 6. Final check
query {
  mobCount
  mobs {
    mobId
    mobType
    currentHealth
    maxHealth
  }
}
```

### Scenario 3: Economic system

# 1. Initial state
query {
  coinBalance
  health
}

# 2. Earn coins
mutation {
  addCoins(amount: 200)
}

# 3. Spend coins (e.g., on healing)
mutation {
  subtractCoins(amount: 50)
}

mutation {
  addHealth(amount: 20)
}

# 4. Take damage
mutation {
  subtractHealth(amount: 15)
}

# 5. Check final state
query {
  playerName
  coinBalance
  health
}
```

## Usage examples with curl

### Query request
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { playerName coinBalance health mobCount }"}'
```

### Mutation request
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { setName(name: \"TestPlayer\") }"}'
```

### Complex request
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { playerName coinBalance health mobs { mobId mobType currentHealth maxHealth } }"}'
```

## Testing notes

1. **Testing order**: First execute queries to check initial state, then mutations to change state, and again queries to confirm changes.

2. **Mob types**:
- 1 = Goblin (weak)
- 2 = Orc (medium)
- 3 = Dragon (strong)

3. **Validation**: Make sure that:
- Mob health cannot be negative
- Coin balance cannot be negative
- Player health cannot be negative
- Uniqueness of mob_id when creating

4. **Errors**: If operation failed, check server logs and make sure all parameters are correct.