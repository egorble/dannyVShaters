/**
 * Linera SDK Integration - Proper approach from documentation
 * 
 * Uses official Linera SDK for creating and managing wallets
 * Based on documentation: https://docs.linera.io/developers/frontend/interactivity
 */

// Configuration
const ORCHESTRATOR_URL = 'http://localhost:3001';
const MODULE_ID = 'b7f6d8e640277ef95ffac2e940f79ec0da8a1a56921ce46c7a73dd8c95765bec1ce514a2c21090f515ee2a9ef4e08ddd898c442e5078e17e4a8fe690e6eba75600';

// Global state
let userChainId = null;
let applicationId = null;
let isInitialized = false;

let playerStats = {
    playerName: '',
    totalCoins: 0,
    health: 100
};

/**
 * Initialization through orchestrator
 */
async function initializeLineraSDK() {
    console.log('🚀 ==========================================');
    console.log('🚀 INITIALIZING GAME WITH ORCHESTRATOR');
    console.log('🚀 ==========================================');
    
    try {
        updateStatus('🔄 Checking orchestrator...');
        
        // Check orchestrator status
        const statusResponse = await fetch(`${ORCHESTRATOR_URL}/status`);
        if (!statusResponse.ok) {
            throw new Error('Orchestrator unavailable. Make sure it is running on port 3001.');
        }
        
        console.log('✅ Orchestrator is running');
        
        // Check saved data in localStorage
        const savedChainId = localStorage.getItem('lineraChainId');
        const savedAppId = localStorage.getItem('lineraApplicationId');
        
        if (savedChainId && savedAppId) {
            console.log('📦 Found saved data:');
            console.log('⛓️ Chain ID:', savedChainId);
            console.log('🎯 Application ID:', savedAppId);
            
            userChainId = savedChainId;
            applicationId = savedAppId;
            
            updateStatus('🔄 Checking existing chain...');
            
            // Check if saved chain works
            try {
                await fetchPlayerStats();
                console.log('✅ Saved chain works!');
            } catch (error) {
                console.warn('⚠️ Saved chain doesn\'t work, creating new:', error.message);
                // Clear saved data and create new
                localStorage.removeItem('lineraChainId');
                localStorage.removeItem('lineraApplicationId');
                userChainId = null;
                applicationId = null;
            }
        }
        
        // If no saved data or they don't work, create new
        if (!userChainId || !applicationId) {
            // Create new chain
            updateStatus('🔄 Creating new chain...');
            const chainResponse = await fetch(`${ORCHESTRATOR_URL}/create-chain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!chainResponse.ok) {
                throw new Error('Failed to create chain');
            }
            
            const chainData = await chainResponse.json();
            userChainId = chainData.chainId;
            console.log('✅ Chain created:', userChainId);
            
            // Save chain ID in localStorage
            localStorage.setItem('lineraChainId', userChainId);
            
            // Add application to chain
            updateStatus('🔄 Adding application to chain...');
            const appResponse = await fetch(`${ORCHESTRATOR_URL}/create-application`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chainId: userChainId,
                    bytecodeId: MODULE_ID
                })
            });
            
            if (!appResponse.ok) {
                throw new Error('Failed to add application to chain');
            }
            
            const appData = await appResponse.json();
            applicationId = appData.applicationId;
            console.log('✅ Application added:', applicationId);
            
            // Log GraphQL endpoint URL
            const graphqlUrl = `http://localhost:8081/chains/${userChainId}/applications/${applicationId}`;
            console.log('🔗 GraphQL endpoint:', graphqlUrl);
            
            // Save application ID in localStorage
            localStorage.setItem('lineraApplicationId', applicationId);
        }
        
        // Load initial data
        await fetchPlayerStats();
        
        // Check player name
        if (!playerStats.playerName || playerStats.playerName.trim() === '') {
            await promptForPlayerName();
        }
        
        isInitialized = true;
        updateStatus('✅ Ready to play!');
        
        console.log('🎉 ==========================================');
        console.log('🎉 GAME READY!');
        console.log('🎉 ==========================================');
        console.log('📊 Integration summary:');
        console.log('⛓️ Chain ID:', userChainId);
        console.log('🎯 Application ID:', applicationId);
        console.log('👤 Player Name:', playerStats.playerName || 'Not set');
        console.log('💰 Total Coins:', playerStats.totalCoins);
        console.log('❤️ Health:', playerStats.health);
        console.log('✅ Status: READY FOR GAME');
        console.log('🎉 ==========================================');
        
        // Update UI
        updatePlayerStatsDisplay();
        updateChainInfo();
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        updateStatus(`❌ Initialization error: ${error.message}`);
        
        // Fallback to local mode
        console.log('⚠️ Falling back to local mode');
        isInitialized = false;
        return false;
    }
}



/**
 * Executes GraphQL query to application through orchestrator
 */
async function executeGraphQLQuery(query) {
    if (!userChainId || !applicationId) {
        throw new Error('Chain ID or Application ID not initialized');
    }
    
    console.log('📤 Executing GraphQL query via orchestrator:', query);
    
    const response = await fetch(`${ORCHESTRATOR_URL}/execute-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chainId: userChainId,
            applicationId: applicationId,
            query: query
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📥 GraphQL response:', result);
    
    if (result.errors) {
        console.log('❌ GraphQL errors:', result.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    
    return result;
}

/**
 * Gets player statistics through orchestrator
 */
async function fetchPlayerStats() {
    try {
        const response = await fetch(`${ORCHESTRATOR_URL}/get-player-name/${userChainId}/${applicationId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (data && data.success) {
            // Get player name
            playerStats.playerName = data.playerName || '';
            
            // Get health
            try {
                const healthResponse = await fetch(`${ORCHESTRATOR_URL}/get-health/${userChainId}/${applicationId}`);
                if (healthResponse.ok) {
                    const healthData = await healthResponse.json();
                    if (healthData.success) {
                        playerStats.health = healthData.health || 100;
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch health:', error);
            }
            
            // Get coins
            try {
                const coinsResponse = await fetch(`${ORCHESTRATOR_URL}/get-coin-balance/${userChainId}/${applicationId}`);
                if (coinsResponse.ok) {
                    const coinsData = await coinsResponse.json();
                    if (coinsData.success) {
                        playerStats.totalCoins = coinsData.balance || 0;
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch coins:', error);
            }
            
            console.log('📊 Player stats updated:', playerStats);
            updatePlayerStatsDisplay();
        }
        
        return playerStats;
    } catch (error) {
        console.error('Failed to fetch player stats:', error);
        return playerStats;
    }
}

/**
 * Sets player name through orchestrator
 */
async function setPlayerName(name) {
    console.log('👤 ==========================================');
    console.log('👤 SETTING PLAYER NAME');
    console.log('👤 ==========================================');
    
    if (!name || name.trim() === '') {
        console.warn('❌ Cannot set empty player name');
        showNotification('Name cannot be empty', 'warning');
        return false;
    }

    try {
        console.log(`👤 New name to set: "${name}"`);
        updateStatus(`🔄 Setting name: ${name}...`);
        
        const response = await fetch(`${ORCHESTRATOR_URL}/set-player-name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                playerName: name.trim()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        console.log('✅ SetPlayerName executed successfully');
        
        // Update local statistics
        playerStats.playerName = name;
        updatePlayerStatsDisplay();
        
        showNotification(`Name changed to: ${name}`, 'success');
        updateStatus('✅ Name updated!');
        
        return true;
        
    } catch (error) {
        console.log('❌ ==========================================');
        console.log('❌ FAILED TO SET PLAYER NAME!');
        console.log('❌ ==========================================');
        console.error('❌ Error details:', error);
        
        showNotification('Error changing name', 'error');
        updateStatus('❌ Error changing name');
        return false;
    }
}

/**
 * Adds coins through orchestrator
 */
async function addCoins(amount) {
    try {
        console.log('💰 ==========================================');
        console.log('💰 ADDING COINS TO PLAYER BALANCE');
        console.log('💰 ==========================================');
        
        if (!isInitialized) {
            console.warn('❌ SDK not initialized, cannot add coins');
            return false;
        }

        if (amount <= 0) {
            console.warn('❌ Invalid coin amount:', amount);
            return false;
        }

        console.log(`💰 Amount to add: ${amount} coins`);
        updateStatus(`🔄 Adding ${amount} coins...`);

        const response = await fetch(`${ORCHESTRATOR_URL}/add-coins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                amount: amount
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Coins added successfully via orchestrator');
            
            // Update local statistics
            playerStats.totalCoins += amount;
            updatePlayerStatsDisplay();
            
            showNotification(`+${amount} coins!`, 'success');
        updateStatus('✅ Coins added!');
            
            return true;
        } else {
            throw new Error('Failed to add coins');
        }
        
    } catch (error) {
        console.log('❌ ==========================================');
        console.log('❌ FAILED TO ADD COINS!');
        console.log('❌ ==========================================');
        console.error('❌ Error details:', error);
        
        showNotification('Error saving coins', 'error');
        updateStatus('❌ Error adding coins');
        return false;
    }
}

/**
 * Adds health through orchestrator
 */
async function addHealth(amount) {
    try {
        console.log('❤️ ==========================================');
        console.log('❤️ ADDING HEALTH TO PLAYER');
        console.log('❤️ ==========================================');
        
        if (!isInitialized) {
            console.warn('❌ SDK not initialized, cannot add health');
            return false;
        }

        if (amount <= 0) {
            console.warn('❌ Invalid health amount:', amount);
            return false;
        }

        console.log(`❤️ Amount to add: ${amount} health`);
        updateStatus(`🔄 Adding ${amount} health...`);

        const response = await fetch(`${ORCHESTRATOR_URL}/add-health`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                amount: amount
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Health added successfully via orchestrator');
            
            // Update local statistics
            playerStats.health += amount;
            updatePlayerStatsDisplay();
            
            showNotification(`+${amount} health!`, 'success');
            updateStatus('✅ Health added!');
            
            return true;
        } else {
            throw new Error('Failed to add health');
        }
        
    } catch (error) {
        console.log('❌ ==========================================');
        console.log('❌ FAILED TO ADD HEALTH!');
        console.log('❌ ==========================================');
        console.error('❌ Error details:', error);
        
        showNotification('Error adding health', 'error');
        updateStatus('❌ Error adding health');
        return false;
    }
}

/**
 * Subtracts coins through orchestrator
 */
async function subtractCoins(amount) {
    try {
        console.log('💸 ==========================================')
        console.log('💸 SUBTRACTING COINS FROM PLAYER BALANCE')
        console.log('💸 ==========================================')
        
        if (!isInitialized) {
            console.warn('❌ SDK not initialized, cannot subtract coins')
            return false
        }

        if (amount <= 0) {
            console.warn('❌ Invalid coin amount:', amount)
            return false
        }

        console.log(`💸 Amount to subtract: ${amount} coins`)
        updateStatus(`🔄 Subtracting ${amount} coins...`)

        const response = await fetch(`${ORCHESTRATOR_URL}/subtract-coins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                amount: amount
            })
        })
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.success) {
            console.log('✅ Coins subtracted successfully via orchestrator')
            
            // Update local statistics
            playerStats.totalCoins -= amount
            updatePlayerStatsDisplay()
            
            showNotification(`-${amount} coins!`, 'damage')
            updateStatus('✅ Coins subtracted!')
            
            return true
        } else {
            throw new Error('Failed to subtract coins')
        }
        
    } catch (error) {
        console.log('❌ ==========================================')
        console.log('❌ FAILED TO SUBTRACT COINS!')
        console.log('❌ ==========================================')
        console.error('❌ Error details:', error)
        
        showNotification('Error subtracting coins', 'error')
        updateStatus('❌ Error subtracting coins')
        return false
    }
}

/**
 * Subtracts health through orchestrator
 */
async function subtractHealth(amount) {
    try {
        console.log('💔 ==========================================');
        console.log('💔 SUBTRACTING HEALTH FROM PLAYER');
        console.log('💔 ==========================================');
        
        if (!isInitialized) {
            console.warn('❌ SDK not initialized, cannot subtract health');
            return false;
        }

        if (amount <= 0) {
            console.warn('❌ Invalid health amount:', amount);
            return false;
        }

        console.log(`💔 Amount to subtract: ${amount} health`);
        updateStatus(`🔄 Subtracting ${amount} health...`);

        const response = await fetch(`${ORCHESTRATOR_URL}/subtract-health`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                amount: amount
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Health subtracted successfully via orchestrator');
            
            // Update local statistics
            playerStats.health = Math.max(0, playerStats.health - amount);
            updatePlayerStatsDisplay();
            
            showNotification(`-${amount} health!`, 'warning');
            updateStatus('✅ Health subtracted!');
            
            return true;
        } else {
            throw new Error('Failed to subtract health');
        }
        
    } catch (error) {
        console.log('❌ ==========================================');
        console.log('❌ FAILED TO SUBTRACT HEALTH!');
        console.log('❌ ==========================================');
        console.error('❌ Error details:', error);
        
        showNotification('Error subtracting health', 'error');
        updateStatus('❌ Error subtracting health');
        return false;
    }
}

/**
 * Request player name at startup
 */
async function promptForPlayerName() {
    const playerName = prompt('👋 Welcome to Danny Game!\n\nEnter your name:');
    
    if (playerName && playerName.trim()) {
        try {
            console.log('📝 Setting player name:', playerName.trim());
            updateStatus(`🔄 Setting name: ${playerName.trim()}...`);
            
            const success = await setPlayerName(playerName.trim());
            if (success) {
                console.log('✅ Player name set successfully!');
                showNotification(`Welcome, ${playerName.trim()}!`, 'success');
            }
        } catch (error) {
            console.error('❌ Failed to set player name:', error);
            showNotification('Error setting name. Please try again.', 'error');
        }
    } else {
        console.log('⚠️ No name provided, using Anonymous');
        showNotification('Playing as anonymous player', 'info');
    }
}

/**
 * Updates player statistics display
 */
function updatePlayerStatsDisplay() {
    // Update total balance
    const totalCoinsElement = document.getElementById('totalCoins');
    if (totalCoinsElement) {
        totalCoinsElement.textContent = playerStats.totalCoins;
    }

    // Update leaderboard display
    const playerNameElement = document.getElementById('player-name');
    const playerCoinsElement = document.getElementById('player-best');
    
    if (playerNameElement) {
        playerNameElement.textContent = playerStats.playerName || 'Unknown player';
    }
    
    if (playerCoinsElement) {
        playerCoinsElement.textContent = playerStats.totalCoins;
    }

    // Update Linera status
    const lineraStatusElement = document.getElementById('lineraStatus');
    if (lineraStatusElement) {
        if (isInitialized && playerStats.playerName) {
            lineraStatusElement.innerHTML = `⛓️ Connected: ${playerStats.playerName}`;
            lineraStatusElement.style.color = '#a0ffa0';
        } else if (isInitialized) {
            lineraStatusElement.innerHTML = '🔄 Connected to Linera';
            lineraStatusElement.style.color = '#ffff80';
        } else {
            lineraStatusElement.innerHTML = '❌ Not connected';
            lineraStatusElement.style.color = '#ffa0a0';
        }
    }
}

/**
 * Updates chain information
 */
function updateChainInfo() {
    const chainIdElement = document.getElementById('player-chain');
    if (chainIdElement && userChainId) {
        const shortChainId = userChainId.substring(0, 8) + '...';
        chainIdElement.textContent = shortChainId;
    }
    
    // Also update old element if it exists
    const oldChainIdElement = document.getElementById('chainId');
    if (oldChainIdElement && userChainId) {
        oldChainIdElement.textContent = userChainId.substring(0, 8) + '...';
    }
}

/**
 * Shows notification to user
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    console.log(`Notification (${type}): ${message}`);
}

/**
 * Updates status
 */
function updateStatus(message) {
    const statusElement = document.getElementById('walletStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log('Status:', message);
}

/**
 * Function to clear saved data (for debugging)
 */
function clearSavedData() {
    localStorage.removeItem('lineraChainId');
    localStorage.removeItem('lineraApplicationId');
    // Clear sword upgrade data
    localStorage.removeItem('totalCoins');
    localStorage.removeItem('swordLevel');
    localStorage.removeItem('leaderboard');
    console.log('🗑️ Saved data cleared (including sword upgrades). Reload page to create new chain.');
    alert('Saved data cleared (including sword upgrades). Reload page to create new chain.');
}

// Make function globally available for browser console
window.clearSavedData = clearSavedData;

/**
 * Gets current player statistics
 */
function getPlayerStats() {
    return {
        ...playerStats,
        isInitialized: isInitialized,
        chainId: userChainId,
        appId: applicationId
    };
}

/**
 * Clears wallet data
 */
function clearWalletData() {
    localStorage.removeItem('linera_wallet_json');
    localStorage.removeItem('linera_wallet_created_at');
    console.log('🗑️ Wallet data cleared');
}

/**
 * Creates new mob through orchestrator
 */
async function createMob(mobId, health) {
    try {
        console.log('👹 Creating mob:', mobId, 'with health:', health);
        
        const response = await fetch(`${ORCHESTRATOR_URL}/create-mob`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                mobId: mobId,
                health: health
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Mob created successfully:', result);
        return result.success;
        
    } catch (error) {
        console.error('❌ Failed to create mob:', error);
        return false;
    }
}

/**
 * Damages mob through orchestrator
 */
async function damageMob(mobId, damage) {
    try {
        console.log('⚔️ Damaging mob:', mobId, 'for', damage, 'damage');
        
        const response = await fetch(`${ORCHESTRATOR_URL}/damage-mob`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                mobId: mobId,
                damage: damage
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Mob damaged successfully:', result);
        return result.success;
        
    } catch (error) {
        console.error('❌ Failed to damage mob:', error);
        return false;
    }
}

/**
 * Removes mob through orchestrator
 */
async function removeMob(mobId) {
    try {
        console.log('🗑️ Removing mob:', mobId);
        
        const response = await fetch(`${ORCHESTRATOR_URL}/remove-mob`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId,
                mobId: mobId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Mob removed successfully:', result);
        return result.success;
        
    } catch (error) {
        console.error('❌ Failed to remove mob:', error);
        return false;
    }
}

/**
 * Gets mob health through orchestrator
 */
async function getMobHealth(mobId) {
    try {
        const response = await fetch(`${ORCHESTRATOR_URL}/get-mob-health/${userChainId}/${applicationId}/${mobId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.success ? result.health : 0;
        
    } catch (error) {
        console.error('❌ Failed to get mob health:', error);
        return 0;
    }
}

/**
 * Gets list of all mobs through orchestrator
 */
async function getAllMobs() {
    try {
        const response = await fetch(`${ORCHESTRATOR_URL}/get-all-mobs/${userChainId}/${applicationId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.success ? result.mobs : [];
        
    } catch (error) {
        console.error('❌ Failed to get all mobs:', error);
        return [];
    }
}

/**
 * Removes all mobs from blockchain with single call
 */
async function removeAllMobs() {
    try {
        console.log('🧹 Removing all mobs from blockchain...');
        
        const response = await fetch(`${ORCHESTRATOR_URL}/remove-all-mobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chainId: userChainId,
                applicationId: applicationId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ All mobs successfully removed from blockchain');
            return true;
        } else {
            console.error('❌ Error removing mobs:', result.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Failed to remove all mobs:', error);
        return false;
    }
}



// Export functions for use in game.js
window.lineraSDK = {
    initialize: initializeLineraSDK,
    addCoins: addCoins,
    subtractCoins: subtractCoins,
    addHealth: addHealth,
    subtractHealth: subtractHealth,
    fetchPlayerStats: fetchPlayerStats,
    setPlayerName: setPlayerName,
    getPlayerStats: getPlayerStats,
    promptForPlayerName: promptForPlayerName,
    clearWalletData: clearWalletData,
    isInitialized: () => isInitialized,
    // Mob management functions
    createMob: createMob,
    damageMob: damageMob,
    removeMob: removeMob,
    getMobHealth: getMobHealth,
    getAllMobs: getAllMobs,
    removeAllMobs: removeAllMobs
};

// Fallback functions for local mode
function addCoinsLocal(amount) {
    console.log(`Local mode: adding ${amount} coins`);
    playerStats.totalCoins += amount;
    updatePlayerStatsDisplay();
    showNotification(`+${amount} coins! (local)`, 'info');
    return Promise.resolve(true);
}

function subtractCoinsLocal(amount) {
    console.log(`Local mode: subtracting ${amount} coins`);
    playerStats.totalCoins -= amount;
    updatePlayerStatsDisplay();
    showNotification(`-${amount} coins! (local)`, 'damage');
    return Promise.resolve(true);
}

function getPlayerStatsLocal() {
    return {
        totalCoins: playerStats.totalCoins,
        playerName: 'Local player',
        isInitialized: false
    };
}

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Danny Game Linera SDK integration...');
    
    // Small delay for UI loading
    setTimeout(() => {
        initializeLineraSDK().then(success => {
            if (success) {
                console.log('🎉 Linera SDK integration ready!');
            } else {
                console.log('⚠️ Running in local mode');
                updateStatus('🎮 Local mode (without blockchain)');
                
                // Use local fallback functions
                window.lineraSDK = {
                    initialize: () => Promise.resolve(false),
                    addCoins: addCoinsLocal,
                    subtractCoins: subtractCoinsLocal,
                    fetchPlayerStats: () => Promise.resolve(),
                    setPlayerName: () => Promise.resolve(true),
                    getPlayerStats: getPlayerStatsLocal,
                    promptForPlayerName: () => Promise.resolve(),
                    clearWalletData: () => {},
                    isInitialized: () => false
                };
            }
        });
    }, 1000);
});

export default window.lineraSDK;