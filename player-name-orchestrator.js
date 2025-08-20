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
const NODE_SERVICE_URL = "http://localhost:8081"; // Node service для GraphQL

app.use(express.json());
app.use(cors()); // Дозволити CORS для веб-фронтенду
app.use(express.static('.')); // Статичні файли

// Глобальні змінні для зберігання стану
let publishedBytecodeId = "d92b347985c048a252956edec32acfa7ba8e759febf81d5be684b5daba9d53fa2d684380da1639a2b52d11f0bc8eb28d56c4c2a9d20a054cd9e29cb44a119cb500";
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
    const { chainId, applicationId } = req.body;
    
    if (!chainId || !applicationId) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID та Application ID обов\'язкові'
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
        note: 'Операція виконується в фоновому режимі'
    });
});

// Додавання здоров'я гравця (паралельна обробка)
app.post('/add-health', (req, res) => {
    const { chainId, applicationId, amount } = req.body;
    
    if (!chainId || !applicationId || amount === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID та amount обов\'язкові'
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
    const { chainId, applicationId, amount } = req.body;
    
    if (!chainId || !applicationId || amount === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID та amount обов\'язкові'
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
app.get('/get-health/:chainId/:applicationId', async (req, res) => {
    try {
        const { chainId, applicationId } = req.params;
        
        if (!chainId || !applicationId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID та Application ID обов\'язкові'
            });
        }
        
        console.log(`💚 Отримання здоров\'я для додатку ${applicationId}...`);
        
        // URL для GraphQL запиту до конкретного додатку
        const appUrl = `http://localhost:8081/chains/${chainId}/applications/${applicationId}`;
        
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
        publishedBytecodeId: publishedBytecodeId,
        mainChainId: mainChainId,
        timestamp: new Date().toISOString()
    });
});

// Встановлення Bytecode ID вручну
app.post('/set-bytecode-id', async (req, res) => {
    try {
        const { bytecodeId } = req.body;
        
        if (!bytecodeId) {
            return res.status(400).json({
                success: false,
                message: 'Bytecode ID обов\'язковий'
            });
        }
        
        publishedBytecodeId = bytecodeId;
        console.log(`✅ Bytecode ID встановлено: ${publishedBytecodeId}`);
        
        res.json({
            success: true,
            message: 'Bytecode ID успішно встановлено',
            bytecodeId: publishedBytecodeId
        });
        
    } catch (error) {
        console.error('❌ Помилка встановлення Bytecode ID:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка встановлення Bytecode ID',
            error: error.message
        });
    }
});

// Створення нового ланцюга через openChain мутацію
app.post('/create-chain', async (req, res) => {
    console.log('🔗 Створення нового ланцюга через openChain мутацію...');

    try {
        // Дані для створення ланцюга
        const chainId = "8e2dc984a00a8e778f6666c2751a48df99dee050cb310f4223cd5a4c78968d73";
        const ownerAddress = "0x4b34a1814cba5d1273c4114b2cd86ee51b5e73574899612e228da33adba3c0ca";
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

// Створення додатку на ланцюзі
app.post('/create-application', async (req, res) => {
    try {
        const { chainId, bytecodeId } = req.body;
        
        if (!chainId) {
            return res.status(400).json({
                success: false,
                message: 'Chain ID обов\'язковий'
            });
        }
        
        const targetBytecodeId = bytecodeId || publishedBytecodeId;
        if (!targetBytecodeId) {
            return res.status(400).json({
                success: false,
                message: 'Bytecode ID не знайдено. Спочатку опублікуйте додаток.'
            });
        }
        
        console.log(`📱 Створення додатку на ланцюзі ${chainId}...`);
        
        // GraphQL мутація для створення додатку
        const mutation = {
            query: `mutation {
                createApplication(
                    chainId: "${chainId}",
                    moduleId: "${targetBytecodeId}",
                    parameters: "null",
                    instantiationArgument: \"\\\"\\\"\",
                    requiredApplicationIds: []
                )
            }`
        };
        
        console.log('🔍 GraphQL запит для створення додатку:');
        console.log('URL:', NODE_SERVICE_URL);
        console.log('Mutation:', JSON.stringify(mutation, null, 2));
        console.log('Raw query string:', mutation.query);
        
        const response = await fetch(NODE_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mutation)
        });
        
        const responseText = await response.text();
        console.log('Create app response:', responseText);
        
        const result = JSON.parse(responseText);
        
        console.log('📥 Відповідь від GraphQL сервера:');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.errors) {
            console.error('❌ GraphQL помилки:', result.errors);
            throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`);
        }
        
        const applicationId = result.data.createApplication;
        console.log(`✅ Додаток створено: ${applicationId}`);
        
        res.json({
            success: true,
            message: 'Додаток успішно створено',
            applicationId: applicationId,
            chainId: chainId,
            bytecodeId: targetBytecodeId
        });
        
    } catch (error) {
        console.error('❌ Помилка створення додатку:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка створення додатку',
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
        const appUrl = `http://localhost:8081/chains/${chainId}/applications/${applicationId}`;
        
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

// Отримання опублікованого Bytecode ID
app.get('/bytecode-id', (req, res) => {
    res.json({
        bytecodeId: publishedBytecodeId,
        published: !!publishedBytecodeId
    });
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
    const { chainId, applicationId, amount } = req.body;
    
    if (!chainId || !applicationId || !amount) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID та amount обов\'язкові'
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
    const { chainId, applicationId, amount } = req.body;
    
    if (!chainId || !applicationId || !amount) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID та amount обов\'язкові'
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
app.get('/get-coin-balance/:chainId/:applicationId', async (req, res) => {
    try {
        const { chainId, applicationId } = req.params;
        
        console.log(`🔍 Отримання балансу монет для додатку ${applicationId}...`);
        
        // URL для GraphQL запиту до конкретного додатку
        const appUrl = `http://localhost:8081/chains/${chainId}/applications/${applicationId}`;
        
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
    const { chainId, applicationId, mobId, health } = req.body;
    
    if (!chainId || !applicationId || !mobId || health === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID, Mob ID та health обов\'язкові'
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
    const { chainId, applicationId, mobId, damage } = req.body;
    
    if (!chainId || !applicationId || !mobId || damage === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID, Mob ID та damage обов\'язкові'
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
    const { chainId, applicationId, mobId } = req.body;
    
    if (!chainId || !applicationId || !mobId) {
        return res.status(400).json({
            success: false,
            message: 'Chain ID, Application ID та Mob ID обов\'язкові'
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
app.get('/get-mob-health/:chainId/:applicationId/:mobId', async (req, res) => {
    try {
        const { chainId, applicationId, mobId } = req.params;
        
        console.log(`🔍 Отримання здоров\'я моба ${mobId}...`);
        
        const query = `
            query {
                mobHealth(mobId: "${mobId}")
            }
        `;
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`, {
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
app.get('/get-all-mobs/:chainId/:applicationId', async (req, res) => {
    try {
        const { chainId, applicationId } = req.params;
        
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
        
        const response = await fetch(`${NODE_SERVICE_URL}/chains/${chainId}/applications/${applicationId}`, {
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

// Запуск сервера
app.listen(port, () => {
    console.log(`🎮 Player Name Orchestrator запущено на http://localhost:${port}`);
    console.log(`📋 Доступні endpoints:`);
    console.log(`   GET  /                              - Головна сторінка`);
    console.log(`   GET  /status                        - Статус системи`);
    console.log(`   POST /publish-app                  - Публікація додатку`);
    console.log(`   POST /create-chain                 - Створення ланцюга`);
    console.log(`   POST /create-application           - Створення додатку`);
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
    console.log(`   GET  /bytecode-id                  - Bytecode ID`);
    console.log(``);
    console.log(`🌐 Фронтенд: http://localhost:${port}/player-name-test-advanced.html`);
    console.log(`🔧 Фаусет: ${FAUCET_URL}`);
    console.log(`📡 Node Service: ${NODE_SERVICE_URL}`);
});