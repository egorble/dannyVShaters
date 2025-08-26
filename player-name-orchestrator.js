// player-name-orchestrator.js
const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3001;
const FAUCET_URL = "https://faucet.testnet-babbage.linera.net"; // Зовнішній testnet фаусет
const NODE_SERVICE_URL = "http://localhost:8080"; // Node service для GraphQL

app.use(express.json());
app.use(cors()); // Дозволити CORS для веб-фронтенду
app.use(express.static('.')); // Статичні файли

// Глобальні змінні для зберігання стану
let applicationId = "a3f653760949e55fe7cef39cd6975bd8c02d5037a42ec91b22379ca374816ad3"; // Єдиний app ID для всіх чейнів
let leaderboardChainId = "83990e573e43c72806fe93036de3418b9d3e57108e1cf4dabb6b5893b3f1a3b2"; // Leaderboard chain ID
let mainChainId = null;
let chains = []; // Масив для зберігання створених ланцюгів

// Функція затримки
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Паралельна обробка GraphQL запитів без очікування
function executeGraphQLAsync(url, query, operationName) {
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
    })
    .then(response => {
        if (!response.ok) {
            console.error(`❌ HTTP ${response.status} для ${operationName}: ${response.statusText}`);
            return;
        }
        return response.json();
    })
    .then(result => {
        if (result && result.errors) {
            console.error(`❌ GraphQL помилка для ${operationName}:`, result.errors);
            return;
        }
        console.log(`✅ ${operationName} виконано успішно (async)`);
    })
    .catch(error => {
        console.error(`❌ Помилка ${operationName} (async):`, error.message);
    });
}

// Головна сторінка
app.get('/', (req, res) => {
    res.send(`
        <h1>🎮 Player Name Orchestrator</h1>
        <p>Оркестратор для Linera Player Name додатку</p>
        <ul>
            <li><a href="/player-name-test-advanced.html">Тестовий фронтенд</a></li>
            <li><a href="/status">Статус системи</a></li>
        </ul>
    `);
});

// Видалення всіх мобів (паралельна обробка)
app.post('/remove-all-mobs', (req, res) => {
    const { chainId } = req.body;
    
    if (!chainId) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID обов\'язковий'
        });
    }
    
    console.log(`🧹 Видалення всіх мобів (async)...`);
    
    const mutation = `
        mutation {
            removeAllMobs
        }
    `;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        'removeAllMobs'
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: 'Запит на видалення всіх мобів надіслано (async)',
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Додавання здоров'я гравця (паралельна обробка)
app.post('/add-health', (req, res) => {
    const { chainId, amount } = req.body;
    
    if (!chainId || amount === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та amount обов\'язкові'
        });
    }
    
    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Кількість здоров\'я повинна бути позитивною'
        });
    }
    
    console.log(`💚 Додавання ${amount} здоров\'я для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        addHealth(amount: ${amount})
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `addHealth(${amount})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на додавання ${amount} здоров\'я надіслано (async)`,
        chainId: chainId,
        applicationId: applicationId,
        amount: amount,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Віднімання здоров'я гравця (паралельна обробка)
app.post('/subtract-health', (req, res) => {
    const { chainId, amount } = req.body;
    
    if (!chainId || amount === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та amount обов\'язкові'
        });
    }
    
    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Кількість здоров\'я повинна бути позитивною'
        });
    }
    
    console.log(`💔 Віднімання ${amount} здоров\'я для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        subtractHealth(amount: ${amount})
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `subtractHealth(${amount})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на віднімання ${amount} здоров\'я надіслано (async)`,
        chainId: chainId,
        applicationId: applicationId,
        amount: amount,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Отримання поточного здоров'я гравця
app.get('/get-health/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        
        if (!chainId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID обов\'язковий'
            });
        }
        
        console.log(`💚 Отримання здоров\'я для додатку ${applicationId}...`);
        
        // URL для GraphQL запиту до конкретного додатку
        const appUrl = `http://localhost:8080/chains/${chainId}/applications/${applicationId}`;
        
        const query = {
            query: `query {
                health
            }`
        };
        
        console.log('🔍 GraphQL запит для отримання здоров\'я:');
        console.log('URL:', appUrl);
        console.log('Query:', JSON.stringify(query, null, 2));
        console.log('Raw query string:', query.query);
        
        const response = await fetch(appUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query)
        });
        
        const responseText = await response.text();
        console.log('Get health response:', responseText);
        
        if (!responseText || responseText.trim() === '') {
            throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(responseText);
        
        console.log('📥 Відповідь від GraphQL сервера (отримання здоров\'я):');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
        }
        
        const health = result.data.health;
        console.log(`✅ Поточне здоров\'я: ${health}`);
        
        res.json({
            success: true,
            message: 'Здоров\'я отримано успішно',
            health: health,
            chainId: chainId,
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка отримання здоров\'я:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання здоров\'я',
            error: error.message
        });
    }
});

// Статус системи
app.get('/status', (req, res) => {
    res.json({
        orchestrator: 'running',
        faucetUrl: FAUCET_URL,
        nodeServiceUrl: NODE_SERVICE_URL,
        applicationId: applicationId,
        leaderboardChainId: leaderboardChainId,
        mainChainId: mainChainId,
        timestamp: new Date().toISOString()
    });
});



// Створення нового ланцюга через openChain мутацію
app.post('/create-chain', async (req, res) => {
    console.log('🔗 Створення нового ланцюга через openChain мутацію...');

    try {
        // Дані для створення ланцюга
        const chainId = "83990e573e43c72806fe93036de3418b9d3e57108e1cf4dabb6b5893b3f1a3b2";
        const ownerAddress = "0x546c8c3f1c1df4327ea0a607a2f445bcc3e37e894346ec8a266f7e3567856686";
        const balance = "1";

        console.log(`Створення ланцюга з ID: ${chainId}`);
        console.log(`Власник: ${ownerAddress}`);
        console.log(`Баланс: ${balance}`);

        // GraphQL мутація openChain
        const mutation = {
            query: `mutation {
                openChain(
                    chainId: "${chainId}",
                    owner: "${ownerAddress}",
                    balance: "${balance}"
                )
            }`
        };

        const response = await fetch(NODE_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mutation)
        });

        const responseText = await response.text();
        console.log(`Відповідь openChain: ${responseText}`);

        if (!responseText.trim()) {
            throw new Error("Порожня відповідь від Node Service.");
        }

        const result = JSON.parse(responseText);

        if (result.errors) {
            console.error(`Помилка openChain: ${JSON.stringify(result.errors)}`);
            throw new Error(`openChain повернув помилку: ${JSON.stringify(result.errors)}`);
        }

        const newChainId = result.data.openChain;
        console.log(`✅ Ланцюг успішно створено: ${newChainId}`);

        // Зберегти створений ланцюг
        chains.push({
            chainId: newChainId,
            owner: ownerAddress,
            balance: balance,
            createdAt: new Date().toISOString()
        });

        // Зберегти як основний ланцюг, якщо це перший
        if (!mainChainId) {
            mainChainId = newChainId;
            console.log(`📌 Встановлено основний Chain ID: ${mainChainId}`);
        }

        res.status(200).json({
            success: true,
            message: 'Chain ID успішно створено через зовнішній Faucet.',
            chainId: newChainId
        });

    } catch (error) {
        console.error('❌ Помилка в процесі створення Chain ID:', error);
        res.status(500).json({ 
            success: false,
            message: 'Внутрішня помилка сервера', 
            error: error.message 
        });
    }
});

// Отримання поточного Application ID
app.get('/application-id', (req, res) => {
    res.json({
        applicationId: applicationId
    });
});

// Отримання Leaderboard Chain ID
app.get('/leaderboard-chain-id', (req, res) => {
    res.json({
        leaderboardChainId: leaderboardChainId
    });
});

// Встановлення Application ID вручну
app.post('/set-application-id', async (req, res) => {
    try {
        const { appId } = req.body;
        
        if (!appId) {
            return res.status(400).json({
                success: false,
                message: 'Application ID обов\'язковий'
            });
        }
        
        applicationId = appId;
        console.log(`✅ Application ID встановлено: ${applicationId}`);
        
        res.json({
            success: true,
            message: 'Application ID успішно встановлено',
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка встановлення Application ID:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка встановлення Application ID',
            error: error.message
        });
    }
});

// Встановлення імені гравця (паралельна обробка)
app.post('/set-player-name', (req, res) => {
    const { chainId, applicationId, playerName } = req.body;
    
    if (!chainId || !applicationId || !playerName) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID та Player Name обов\'язкові'
        });
    }
    
    console.log(`✏️ Встановлення імені "${playerName}" для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        setName(name: "${playerName}")
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `setName(${playerName})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на встановлення імені "${playerName}" надіслано (async)`,
        playerName: playerName,
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Отримання поточного імені гравця
app.get('/get-player-name/:chainId/:applicationId', async (req, res) => {
    try {
        const { chainId, applicationId } = req.params;
        
        console.log(`🔍 Отримання імені для додатку ${applicationId}...`);
        
        // URL для GraphQL запиту до конкретного додатку
        const appUrl = `http://localhost:8080/chains/${chainId}/applications/${applicationId}`;
        
        const query = {
            query: `query {
                playerName
            }`
        };
        
        const response = await fetch(appUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query)
        });
        
        const responseText = await response.text();
        console.log('Get name response:', responseText);
        
        if (!responseText || responseText.trim() === '') {
            throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(responseText);
        
        console.log('📥 Відповідь від GraphQL сервера (отримання імені):');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
        }
        
        const currentName = result.data.playerName;
        console.log(`✅ Поточне ім'я: "${currentName}"`);
        
        res.json({
            success: true,
            playerName: currentName,
            chainId: chainId,
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка отримання імені:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання імені',
            error: error.message
        });
    }
});



// Перевірка існуючих ланцюгів
app.get('/check-chains', async (req, res) => {
    try {
        console.log('🔍 Перевірка існуючих ланцюгів...');
        
        // GraphQL запит для отримання всіх ланцюгів
        const query = {
            query: `query {
                chains {
                    list
                }
            }`
        };
        
        const response = await fetch(NODE_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query)
        });
        
        const responseText = await response.text();
        console.log('Chains response:', responseText);
        
        const result = JSON.parse(responseText);
        
        if (result.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
        }
        
        const chains = result.data.chains.list || [];
        console.log(`✅ Знайдено ${chains.length} ланцюгів`);
        
        res.json({
            success: true,
            message: `Знайдено ${chains.length} ланцюгів`,
            chains: chains,
            count: chains.length
        });
        
    } catch (error) {
        console.error('❌ Помилка перевірки ланцюгів:', error.message);
        res.status(500).json({
            success: false,
            message: 'Помилка перевірки ланцюгів',
            error: error.message
        });
    }
});

// Додавання монет гравцю (паралельна обробка)
app.post('/add-coins', (req, res) => {
    const { chainId, amount } = req.body;
    
    if (!chainId || !amount) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та amount обов\'язкові'
        });
    }
    
    const coinAmount = parseInt(amount);
    if (isNaN(coinAmount) || coinAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount повинен бути позитивним числом'
        });
    }
    
    console.log(`💰 Додавання ${coinAmount} монет для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        addCoins(amount: ${coinAmount})
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `addCoins(${coinAmount})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на додавання ${coinAmount} монет надіслано (async)`,
        amount: coinAmount,
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Віднімання монет гравця (паралельна обробка)
app.post('/subtract-coins', (req, res) => {
    const { chainId, amount } = req.body;
    
    if (!chainId || !amount) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та amount обов\'язкові'
        });
    }
    
    const coinAmount = parseInt(amount);
    if (isNaN(coinAmount) || coinAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount повинен бути позитивним числом'
        });
    }
    
    console.log(`💸 Віднімання ${coinAmount} монет для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        subtractCoins(amount: ${coinAmount})
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `subtractCoins(${coinAmount})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на віднімання ${coinAmount} монет надіслано (async)`,
        amount: coinAmount,
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Отримання балансу монет гравця
app.get('/get-coin-balance/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        
        console.log(`🔍 Отримання балансу монет для додатку ${applicationId}...`);
        
        // URL для GraphQL запиту до конкретного додатку
        const appUrl = `http://localhost:8080/chains/${chainId}/applications/${applicationId}`;
        
        const query = {
            query: `query {
                coinBalance
            }`
        };
        
        const response = await fetch(appUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(query)
        });
        
        const responseText = await response.text();
        console.log('Get coin balance response:', responseText);
        
        if (!responseText || responseText.trim() === '') {
            throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(responseText);
        
        console.log('📥 Відповідь від GraphQL сервера (отримання балансу):');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.errors) {
            throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
        }
        
        const balance = result.data.coinBalance;
        console.log(`✅ Поточний баланс: ${balance} монет`);
        
        res.json({
            success: true,
            balance: balance,
            chainId: chainId,
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка отримання балансу:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка отримання балансу',
            error: error.message
        });
    }
});

// Створення моба
// Створення моба (паралельна обробка)
app.post('/create-mob', (req, res) => {
    const { chainId, mobId, health } = req.body;
    
    if (!chainId || !mobId || health === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Mob ID та health обов\'язкові'
        });
    }

    console.log(`👹 Створення моба ${mobId} з здоров\'ям ${health} (async)...`);
    
    // Визначаємо тип моба на основі здоров'я
    let mobType = 1; // За замовчуванням тип 1
    if (health === 30) mobType = 1;
    else if (health === 50) mobType = 2;
    else if (health === 80) mobType = 3;
    
    const mutation = `mutation {
        createMob(mobId: "${mobId}", mobType: ${mobType}, maxHealth: ${health})
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `createMob(${mobId}, ${mobType}, ${health})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на створення моба ${mobId} з здоров\'ям ${health} надіслано (async)`,
        mobId: mobId,
        health: health,
        mobType: mobType,
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Завдання шкоди мобу (паралельна обробка)
app.post('/damage-mob', (req, res) => {
    const { chainId, mobId, damage } = req.body;
    
    if (!chainId || !mobId || damage === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Mob ID та damage обов\'язкові'
        });
    }

    console.log(`⚔️ Завдання ${damage} шкоди мобу ${mobId} (async)...`);
    
    const mutation = `mutation {
        damageMob(mobId: "${mobId}", damage: ${damage})
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `damageMob(${mobId}, ${damage})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на завдання ${damage} шкоди мобу ${mobId} надіслано (async)`,
        mobId: mobId,
        damage: damage,
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Видалення моба (паралельна обробка)
app.post('/remove-mob', (req, res) => {
    const { chainId, mobId } = req.body;
    
    if (!chainId || !mobId) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та Mob ID обов\'язкові'
        });
    }

    console.log(`🗑️ Видалення моба ${mobId} (async)...`);
    
    const mutation = `mutation {
        removeMob(mobId: "${mobId}")
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `removeMob(${mobId})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на видалення моба ${mobId} надіслано (async)`,
        mobId: mobId,
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Отримання здоров'я моба
app.get('/get-mob-health/:chainId/:mobId', async (req, res) => {
    try {
        const { chainId, mobId } = req.params;
        
        if (!chainId || !mobId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID та Mob ID обов\'язкові'
            });
        }
        
        console.log(`🔍 Отримання здоров\'я моба ${mobId}...`);
        
        const query = `
            query {
                mobHealth(mobId: "${mobId}")
            }
        `;
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${leaderboardChainId}/applications/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.errors) {
            throw new Error(`GraphQL помилка: ${JSON.stringify(result.errors)}`);
        }
        
        const health = result.data?.mobHealth || 0;
        
        console.log(`✅ Здоров\'я моба ${mobId}: ${health}`);
        
        res.json({
            success: true,
            health: health,
            mobId: mobId
        });
        
    } catch (error) {
        console.error('❌ Помилка отримання здоров\'я моба:', error.message);
        res.status(500).json({
            success: false,
            message: `Помилка отримання здоров\'я моба: ${error.message}`,
            health: 0
        });
    }
});

// Отримання всіх мобів
app.get('/get-all-mobs/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        
        if (!chainId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID обов\'язковий'
            });
        }
        
        console.log(`🔍 Отримання всіх мобів...`);
        
        const query = `
            query {
                mobs {
                    mobId
                    mobType
                    currentHealth
                    maxHealth
                    createdAt
                }
            }
        `;
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${leaderboardChainId}/applications/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.errors) {
            throw new Error(`GraphQL помилка: ${JSON.stringify(result.errors)}`);
        }
        
        const mobs = result.data?.mobs || [];
        
        console.log(`✅ Знайдено ${mobs.length} мобів`);
        
        res.json({
            success: true,
            mobs: mobs,
            count: mobs.length
        });
        
    } catch (error) {
        console.error('❌ Помилка отримання мобів:', error.message);
        res.status(500).json({
            success: false,
            message: `Помилка отримання мобів: ${error.message}`,
            mobs: []
        });
    }
});

// ===== LEADERBOARD ENDPOINTS =====

// Налаштування лідерборду
app.post('/setup-leaderboard', (req, res) => {
    const { chainId, leaderboardChainId } = req.body;
    
    if (!chainId || !leaderboardChainId) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та Leaderboard Chain ID обов\'язкові'
        });
    }

    console.log(`🏆 Налаштування лідерборду для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        setupLeaderboard(leaderboardChainId: "${leaderboardChainId}")
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        'setupLeaderboard'
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: 'Запит на налаштування лідерборду надіслано (async)',
        chainId: chainId,
        leaderboardChainId: leaderboardChainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Подання результату
app.post('/submit-score', (req, res) => {
    const { chainId, score } = req.body;
    
    if (!chainId || score === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та score обов\'язкові'
        });
    }

    console.log(`🏆 Подання результату ${score} для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        submitScore(score: ${score})
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        `submitScore(${score})`
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: `Запит на подання результату ${score} надіслано (async)`,
        score: score,
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Скидання лідерборду (тільки для leaderboard chain)
app.post('/reset-leaderboard', (req, res) => {
    const { chainId } = req.body;
    
    if (!chainId) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID обов\'язковий'
        });
    }

    console.log(`🏆 Скидання лідерборду для додатку ${applicationId} (async)...`);
    
    const mutation = `mutation {
        resetLeaderboard
    }`;
    
    // Виконуємо запит асинхронно без очікування
    executeGraphQLAsync(
        `${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`,
        mutation,
        'resetLeaderboard'
    );
    
    // Відразу повертаємо успішну відповідь
    res.json({
        success: true,
        message: 'Запит на скидання лідерборду надіслано (async)',
        chainId: chainId,
        applicationId: applicationId,
        note: 'Операція виконується в фоновому режимі'
    });
});

// Отримання особистого найкращого результату
// Отримання глобального лідерборду
app.get('/global-leaderboard/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        
        if (!chainId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID обов\'язковий'
            });
        }

        console.log(`🔍 Отримання глобального лідерборду для додатку ${applicationId}...`);
        
        const query = `
            query {
                globalLeaderboard {
                    playerName
                    score
                    chainId
                    timestamp
                }
            }
        `;
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${leaderboardChainId}/applications/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();

        if (result.errors) {
            console.error('❌ GraphQL помилки:', result.errors);
            return res.status(500).json({
                success: false,
                message: 'Помилка при отриманні глобального лідерборду',
                errors: result.errors
            });
        }

        res.json({
            success: true,
            globalLeaderboard: result.data.globalLeaderboard,
            chainId: leaderboardChainId,
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка при отриманні глобального лідерборду:', error);
        res.status(500).json({
            success: false,
            message: 'Внутрішня помилка сервера',
            error: error.message
        });
    }
});

// Отримання топ гравців
app.get('/top-players/:chainId/:limit?', async (req, res) => {
    try {
        const { chainId, limit = 10 } = req.params;
        
        if (!chainId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID обов\'язковий'
            });
        }

        const limitNum = Math.min(parseInt(limit) || 10, 100); // Максимум 100

        console.log(`🔍 Отримання топ ${limitNum} гравців для додатку ${applicationId}...`);
        
        const query = `
            query {
                topPlayers(limit: ${limitNum}) {
                    playerName
                    score
                    chainId
                    timestamp
                }
            }
        `;
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${leaderboardChainId}/applications/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();

        if (result.errors) {
            console.error('❌ GraphQL помилки:', result.errors);
            return res.status(500).json({
                success: false,
                message: 'Помилка при отриманні топ гравців',
                errors: result.errors
            });
        }

        res.json({
            success: true,
            topPlayers: result.data.topPlayers,
            limit: limitNum,
            chainId: leaderboardChainId,
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка при отриманні топ гравців:', error);
        res.status(500).json({
            success: false,
            message: 'Внутрішня помилка сервера',
            error: error.message
        });
    }
});

// Отримання загальної кількості гравців
app.get('/total-players/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        
        if (!chainId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID обов\'язковий'
            });
        }

        console.log(`🔍 Отримання загальної кількості гравців для додатку ${applicationId}...`);
        
        const query = `
            query {
                totalPlayers
            }
        `;
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${leaderboardChainId}/applications/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();

        if (result.errors) {
            console.error('❌ GraphQL помилки:', result.errors);
            return res.status(500).json({
                success: false,
                message: 'Помилка при отриманні загальної кількості гравців',
                errors: result.errors
            });
        }

        res.json({
            success: true,
            totalPlayers: result.data.totalPlayers,
            chainId: leaderboardChainId,
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка при отриманні загальної кількості гравців:', error);
        res.status(500).json({
            success: false,
            message: 'Внутрішня помилка сервера',
            error: error.message
        });
    }
});

// Перевірка чи це leaderboard chain
app.get('/is-leaderboard-chain/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        
        if (!chainId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID обов\'язковий'
            });
        }

        console.log(`🔍 Перевірка чи це leaderboard chain для додатку ${applicationId}...`);
        
        const query = `
            query {
                isLeaderboardChain
                leaderboardChainId
            }
        `;
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        const result = await response.json();
        
        if (result.errors) {
            console.error('❌ GraphQL помилки:', result.errors);
            return res.status(500).json({
                success: false,
                message: 'Помилка при перевірці leaderboard chain',
                errors: result.errors
            });
        }
        
        res.json({
            success: true,
            isLeaderboardChain: result.data.isLeaderboardChain,
            leaderboardChainId: result.data.leaderboardChainId,
            chainId: chainId,
            applicationId: applicationId
        });
        
    } catch (error) {
        console.error('❌ Помилка при перевірці leaderboard chain:', error);
        res.status(500).json({
            success: false,
            message: 'Внутрішня помилка сервера',
            error: error.message
        });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`🎮 Player Name Orchestrator запущено на http://localhost:${port}`);
    console.log(`📋 Доступні endpoints:`);
    console.log(`   GET  /                              - Головна сторінка`);
    console.log(`   GET  /status                        - Статус системи`);
    console.log(`   GET  /application-id                - Отримати Application ID`);
    console.log(`   GET  /leaderboard-chain-id          - Отримати Leaderboard Chain ID`);
    console.log(`   POST /set-application-id            - Встановити Application ID`);
    console.log(`   POST /create-chain                 - Створення ланцюга`);
    console.log(`   POST /set-player-name              - Встановлення імені`);
    console.log(`   GET  /get-player-name/:chain/:app  - Отримання імені`);
    console.log(`   POST /add-coins                    - Додавання монет`);
    console.log(`   POST /subtract-coins               - Віднімання монет`);
    console.log(`   GET  /get-coin-balance/:chain/:app - Отримання балансу`);
    console.log(`   POST /add-health                   - Додавання здоров'я`);
    console.log(`   POST /subtract-health              - Віднімання здоров'я`);
    console.log(`   GET  /get-health/:chain/:app       - Отримання здоров'я`);
    console.log(`   POST /create-mob                   - Створення моба`);
    console.log(`   POST /damage-mob                   - Завдання шкоди мобу`);
    console.log(`   POST /remove-mob                   - Видалення моба`);
    console.log(`   POST /remove-all-mobs              - Видалення всіх мобів`);
    console.log(`   GET  /get-mob-health/:chain/:app/:mob - Отримання здоров'я моба`);
    console.log(`   GET  /get-all-mobs/:chain/:app     - Отримання всіх мобів`);
    console.log(`   GET  /check-chains                 - Перевірка ланцюгів`);
    console.log(``);
    console.log(`🏆 Leaderboard endpoints:`);
    console.log(`   POST /setup-leaderboard            - Налаштувати лідерборд`);
    console.log(`   POST /submit-score                 - Подати результат`);
    console.log(`   POST /reset-leaderboard            - Скинути лідерборд`);

    console.log(`   GET  /global-leaderboard/:chainId  - Отримати глобальний лідерборд`);
    console.log(`   GET  /top-players/:chainId/:limit  - Отримати топ гравців`);
    console.log(`   GET  /total-players/:chainId       - Отримати кількість гравців`);
    console.log(`   GET  /is-leaderboard-chain/:chainId - Перевірити leaderboard chain`);
    console.log(``);
    console.log(`🌐 Фронтенд: http://localhost:${port}/player-name-test-advanced.html`);
    console.log(`🔧 Фаусет: ${FAUCET_URL}`);
    console.log(`📡 Node Service: ${NODE_SERVICE_URL}`);
});