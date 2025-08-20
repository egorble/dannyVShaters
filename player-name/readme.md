# Player Name Application

Простий додаток Linera для встановлення та зміни імені гравця.

## Опис

Цей додаток демонструє базову функціональність Linera SDK:
- Збереження стану (ім'я гравця) в блокчейні
- Ініціалізація додатку з початковим іменем
- Зміна імені через операції
- GraphQL API для читання та зміни імені

## Структура

- `src/lib.rs` - ABI додатку (Application Binary Interface)
- `src/state.rs` - Визначення стану додатку
- `src/contract.rs` - Логіка смарт-контракту
- `src/service.rs` - GraphQL сервіс

## Використання

### Компіляція

```bash
cargo build --release --target wasm32-unknown-unknown
```

### Публікація та створення додатку

```bash
linera publish-and-create \
  target/wasm32-unknown-unknown/release/player_name_{contract,service}.wasm \
  --json-argument '"Ваше Ім\'я"'
```

### GraphQL запити

**Отримання поточного імені:**
```graphql
{
  player_name
}
```

**Зміна імені:**
```graphql
mutation {
  setName(name: "Нове Ім'я")
}
```

## Особливості

- Додаток не підтримує міжланцюгові повідомлення
- Стан зберігається локально на кожному ланцюгу
- Використовує RegisterView для зберігання простого рядкового значення
- Надає GraphQL API для взаємодії з фронтендом