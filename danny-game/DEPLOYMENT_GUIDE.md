# 🚀 Повний гід з деплойменту Danny Game

Детальні інструкції для деплойменту Danny Game на Linera блокчейні.

## 📋 Передумови

### 1. Встановлення Linera SDK

```bash
# Клонуйте Linera репозиторій
git clone https://github.com/linera-io/linera-protocol.git
cd linera-protocol

# Зберіть Linera
cargo install --path linera-service
cargo install --path linera-client

# Перевірте встановлення
linera --version
```

### 2. Налаштування середовища

```bash
# Додайте до PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Встановіть Rust target для WebAssembly
rustup target add wasm32-unknown-unknown
```

## 🔧 Методи деплойменту

### Метод 1: Автоматичний деплоймент (Рекомендований)

#### Використання нашого скрипту

```bash
# Перейдіть до папки проекту
cd danny-game

# Зробіть скрипт виконуваним
chmod +x deploy-leaderboard.sh

# Запустіть деплоймент
./deploy-leaderboard.sh
```

#### Що робить скрипт:
1. ✅ Перевіряє наявність Linera
2. 🔨 Збирає проект
3. 📋 Отримує інформацію про гаманець
4. 🚀 Деплоїть додаток
5. ⚙️ Налаштовує лідерборд
6. 🎯 Тестує подачу результату
7. 💾 Зберігає інформацію про деплоймент

### Метод 2: Ручний деплоймент

#### Крок 1: Збірка проекту

```bash
# Зберіть для WebAssembly
cargo build --release --target wasm32-unknown-unknown

# Перевірте, що файли створені
ls target/wasm32-unknown-unknown/release/
# Повинні бути: player_name_contract.wasm, player_name_service.wasm
```

#### Крок 2: Ініціалізація гаманця

```bash
# Створіть новий гаманець (якщо потрібно)
linera wallet init --faucet https://faucet.testnet-babbage.linera.net

# Або використайте існуючий
linera wallet show
```

#### Крок 3: Деплоймент додатку

```bash
# Опублікуйте та створіть додаток
APP_ID=$(linera project publish-and-create \
    --json-argument '{"player_name": "Global Leaderboard"}' \
    --json-parameters '{"leaderboard_chain_id": null}')

echo "Application ID: $APP_ID"
```

#### Крок 4: Налаштування лідерборду

```bash
# Отримайте ID ланцюга
CHAIN_ID=$(linera wallet show | grep -E '^[0-9a-f]{64}' | head -1 | cut -d' ' -f1)

# Налаштуйте гру
linera project request-application $APP_ID \
    --json-argument '{
        "SetupGame": {
            "leaderboard_chain_id": "'$CHAIN_ID'",
            "leaderboard_name": "Danny Game Global Leaderboard"
        }
    }'
```

#### Крок 5: Запуск сервісу

```bash
# Запустіть GraphQL сервіс
linera service --port 8080
```

## 🌐 Деплоймент на тестнет

### Використання Linera Testnet

```bash
# Налаштуйте для тестнету
export LINERA_FAUCET="https://faucet.testnet-babbage.linera.net"

# Ініціалізуйте гаманець з тестнету
linera wallet init --faucet $LINERA_FAUCET

# Запустіть деплоймент
./deploy-leaderboard.sh
```

### Налаштування для продакшену

```bash
# Використайте власний валідатор
export LINERA_VALIDATOR="https://your-validator.com"

# Налаштуйте безпечний гаманець
linera wallet init --validator $LINERA_VALIDATOR
```

## 🔍 Відмінності від Linera Flappy

### Danny Game (Спрощений підхід)

```bash
# Один скрипт для всього
./deploy-leaderboard.sh

# Один сервіс
linera service --port 8080

# Одна команда деплойменту
linera project publish-and-create
```

### Linera Flappy (Складний підхід)

```bash
# Три окремі скрипти
./dev_1-start-network.sh    # Запуск мережі
./dev_2-setup-wallet.sh     # Налаштування гаманців
./dev_3-deploy.sh           # Деплоймент

# Два сервіси
linera --with-wallet 1 service --port 8080  # Лідерборд
linera --with-wallet 2 service --port 8081  # Гравець

# Складний деплоймент з адміном
linera --with-wallet 1 publish-and-create \
  target/wasm32-unknown-unknown/release/flappy_{contract,service}.wasm \
  --json-argument '{"admin_username": "admin", "admin_hash": "hash"}'
```

## 🛠️ Налагодження проблем

### Проблема: "linera command not found"

```bash
# Перевірте встановлення
which linera

# Якщо не знайдено, додайте до PATH
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Проблема: "Failed to build"

```bash
# Перевірте Rust версію
rustc --version

# Оновіть Rust
rustup update

# Встановіть wasm32 target
rustup target add wasm32-unknown-unknown
```

### Проблема: "No chains in wallet"

```bash
# Ініціалізуйте гаманець
linera wallet init --faucet https://faucet.testnet-babbage.linera.net

# Або створіть новий ланцюг
linera open-chain
```

### Проблема: "GraphQL service not responding"

```bash
# Перевірте, чи запущений сервіс
lsof -i :8080

# Перезапустіть сервіс
linera service --port 8080

# Перевірте логи
linera service --port 8080 --verbose
```

## 📊 Моніторинг деплойменту

### Перевірка стану додатку

```bash
# Перевірте додатки
linera wallet show

# GraphQL запит для перевірки
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ playerName coinBalance health }"}'
```

### Перевірка лідерборду

```bash
# Перевірте глобальний лідерборд
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ globalLeaderboard { playerName score timestamp } }"}'
```

## 🔄 Оновлення додатку

### Оновлення коду

```bash
# Зберіть нову версію
cargo build --release --target wasm32-unknown-unknown

# Опублікуйте оновлення
linera project publish

# Оновіть додаток
linera project upgrade $APP_ID
```

### Міграція даних

```bash
# Експортуйте дані
linera project query $APP_ID \
  --json-argument '{"globalLeaderboard": {}}'

# Імпортуйте в новий додаток
# (логіка залежить від змін у структурі)
```

## 📈 Масштабування

### Багато ланцюгів

```bash
# Створіть додаткові ланцюги для гравців
for i in {1..10}; do
    linera open-chain
done

# Налаштуйте кожен ланцюг
for chain in $(linera wallet show | grep -E '^[0-9a-f]{64}' | cut -d' ' -f1); do
    linera project request-application $APP_ID \
        --chain $chain \
        --json-argument '{"SetupGame": {...}}'
done
```

### Балансування навантаження

```bash
# Запустіть кілька сервісів
linera service --port 8080 &
linera service --port 8081 &
linera service --port 8082 &

# Використайте nginx для балансування
# (конфігурація nginx окремо)
```

## 🔐 Безпека

### Захист гаманця

```bash
# Використайте пароль для гаманця
linera wallet init --with-password

# Зберігайте backup
cp ~/.config/linera/wallet.json ~/wallet-backup.json
```

### Налаштування дозволів

```bash
# Обмежте доступ до файлів
chmod 600 ~/.config/linera/wallet.json
chmod 600 deployment-info.json
```

## 📝 Чек-лист деплойменту

- [ ] Linera SDK встановлено
- [ ] Rust та wasm32 target встановлені
- [ ] Проект збирається без помилок
- [ ] Гаманець ініціалізовано
- [ ] Додаток успішно деплоїться
- [ ] Лідерборд налаштовано
- [ ] GraphQL сервіс запущено
- [ ] Тестові запити працюють
- [ ] Інформація про деплоймент збережена

## 🎯 Наступні кроки

Після успішного деплойменту:

1. **Тестування**: Використайте [GraphQL приклади](graphql-examples.md)
2. **Frontend**: Запустіть веб-інтерфейс з папки `frontend/`
3. **Моніторинг**: Налаштуйте логування та метрики
4. **Розширення**: Додайте нові функції до гри

---

**Успішного деплойменту!** 🚀

Якщо виникли проблеми, перевірте [порівняння з Flappy](COMPARISON_WITH_FLAPPY.md) або створіть Issue.