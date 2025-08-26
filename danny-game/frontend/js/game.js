// Game state
let gameState = {
    screen: 'menu', // menu, game, upgrades, leaderboard
    isGameRunning: false,
    totalCoins: parseInt(localStorage.getItem('totalCoins')) || 0,
    swordLevel: parseInt(localStorage.getItem('swordLevel')) || 1,
    currentGameCoins: 0,
    kills: 0,
    gameTime: 0,
    gameSeconds: 0, // Track game time in seconds
    spawnRate: 120, // Initial spawn rate (frames between spawns)
    allowedMobTypes: [1], // Start with only type 1 mobs
    maxMobs: 8, // Maximum mobs on screen at once
    targetMobs: 3, // Target number of mobs to maintain
    absoluteMaxMobs: 15, // Hard limit for performance
    lastHealthUpdate: 0 // Time of last health update from blockchain
};

// Canvas and context
let canvas, ctx;

// Images
let swordImages = {};
let mobImages = {};
let mobLeftImages = {}; // Add mob images for left direction
let backgroundImage = null;
let cakeImage = null;
let dannyImage = null;
let dannyLeftImage = null;
let castleImage = null;
let imagesLoaded = 0;
let totalImages = 17; // 3 swords + 1 background + 1 cake + 6 mobs (3 right + 3 left) + 1 danny + 1 dannyleft + 1 castle

// World boundaries (rectangular map)
const WORLD_WIDTH = 2000; // Wide map
const WORLD_HEIGHT = 1200; // Shorter height for rectangular shape (5:3 ratio)
const WORLD_BORDER = 50; // Thickness of border wall
const CASTLE_AVOIDANCE_RADIUS = 150; // Square radius around castle that mobs should avoid

// Camera system
let camera = {
    x: 0,
    y: 0
};

// Game objects
let player = {
    x: 0, // World coordinates
    y: 0, // World coordinates
    width: 32,
    height: 46.6,
    maxHealth: 100,
    health: 100,
    speed: 1.33, // Reduced speed (4/3)
    color: '#4169E1',
    facingLeft: false, // Track if player is facing left
    sword: {
        active: false,
        angle: 0,
        damage: 1,
        level: 1,
        tempSword: null,
        tempUses: 0,
        swingProgress: 0, // Animation progress 0-1
        swingDuration: 30, // Duration in frames
        targetAngle: 0 // Target angle for auto-aim
    }
};

let mobs = [];
let drops = [];
let keys = {};

// Castle object (static barrier in center)
let castle = {
    x: 0, // Center of world
    y: 0, // Center of world
    width: 0, // Will be set when image loads
    height: 0 // Will be set when image loads
};

// Mob types (base stats - will be modified by difficulty scaling)
const mobTypes = {
    1: { hp: 2, color: '#FF69B4', baseSpeed: 1.13, baseDamage: 10, size: 20 },
    2: { hp: 4, color: '#FF1493', baseSpeed: 1.13, baseDamage: 15, size: 25 },
    3: { hp: 8, color: '#C71585', baseSpeed: 1.13, baseDamage: 20, size: 30 }
};

// Mapping mob files to correct names
const mobImageFiles = {
    1: { right: 'Mob1Right.PNG', left: 'mob1left.png' },
    2: { right: 'Mobright2.png', left: 'Mobleft2.png' },
    3: { right: 'Mob3Right.png', left: 'MobLeft3.PNG' }
};

// Sword data
const swordData = {
    1: { damage: 1, color: '#C0C0C0' },
    2: { damage: 2, color: '#FFD700' },
    3: { damage: 4, color: '#FF4500' }
};

// Drop types
const dropTypes = {
    coin: { color: '#FFD700', size: 8, value: 1 },
    cake: { color: '#FFB6C1', size: 12, heal: 20 },
    sword2: { color: '#FFD700', size: 10, swordLevel: 2 },
    sword3: { color: '#FF4500', size: 10, swordLevel: 3 }
};

// Check collision with castle
// Canvas for getting castle pixel data
let castleCanvas = null;
let castleContext = null;
let castleImageData = null;

function initializeCastleCollision() {
    if (!castleImage || !castleCanvas) {
        castleCanvas = document.createElement('canvas');
        castleContext = castleCanvas.getContext('2d');
        castleCanvas.width = castle.width;
        castleCanvas.height = castle.height;
        
        // Draw castle image on hidden canvas
        castleContext.drawImage(castleImage, 0, 0, castle.width, castle.height);
        
        // Get pixel data
        castleImageData = castleContext.getImageData(0, 0, castle.width, castle.height);
        console.log('Castle collision data initialized');
    }
}

function checkCastleCollision(x, y, width, height) {
    if (!castleImage || castle.width === 0 || castle.height === 0) return false;
    
    // Initialize collision data if needed
    if (!castleImageData) {
        initializeCastleCollision();
    }
    
    // First check basic rectangular collision for optimization
    const objLeft = x - width/2;
    const objRight = x + width/2;
    const objTop = y - height/2;
    const objBottom = y + height/2;
    
    const castleLeft = castle.x - castle.width/2;
    const castleRight = castle.x + castle.width/2;
    const castleTop = castle.y - castle.height/2;
    const castleBottom = castle.y + castle.height/2;
    
    // If no basic collision, then definitely no collision
    if (!(objLeft < castleRight && objRight > castleLeft && 
          objTop < castleBottom && objBottom > castleTop)) {
        return false;
    }
    
    // Now check pixels in intersection area
    const intersectLeft = Math.max(objLeft, castleLeft);
    const intersectRight = Math.min(objRight, castleRight);
    const intersectTop = Math.max(objTop, castleTop);
    const intersectBottom = Math.min(objBottom, castleBottom);
    
    // Check several points in intersection area
    const checkPoints = 5; // Number of points to check per axis
    for (let i = 0; i < checkPoints; i++) {
        for (let j = 0; j < checkPoints; j++) {
            const checkX = intersectLeft + (intersectRight - intersectLeft) * i / (checkPoints - 1);
            const checkY = intersectTop + (intersectBottom - intersectTop) * j / (checkPoints - 1);
            
            // Convert world coordinates to image coordinates
            const imgX = Math.floor(checkX - castleLeft);
            const imgY = Math.floor(checkY - castleTop);
            
            // Check if point is within image bounds
            if (imgX >= 0 && imgX < castle.width && imgY >= 0 && imgY < castle.height) {
                // Get pixel alpha channel (transparency)
                const pixelIndex = (imgY * castle.width + imgX) * 4 + 3; // +3 for alpha channel
                const alpha = castleImageData.data[pixelIndex];
                
                // If pixel is not transparent (alpha > 128), there is collision
                if (alpha > 128) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Check if mob is in castle avoidance zone (square radius)
function isInCastleAvoidanceZone(x, y) {
    const distanceX = Math.abs(x - castle.x);
    const distanceY = Math.abs(y - castle.y);
    return distanceX < CASTLE_AVOIDANCE_RADIUS && distanceY < CASTLE_AVOIDANCE_RADIUS;
}

// Calculate avoidance direction to go around castle
function getCastleAvoidanceDirection(mobX, mobY, targetX, targetY) {
    // Calculate relative position to castle
    const toCastleX = mobX - castle.x;
    const toCastleY = mobY - castle.y;
    
    // Determine which side of castle the mob is on
    const isLeft = toCastleX < 0;
    const isTop = toCastleY < 0;
    
    // Calculate direction to move around castle (perpendicular to castle direction)
    let avoidX, avoidY;
    
    if (Math.abs(toCastleX) > Math.abs(toCastleY)) {
        // Mob is more to the side, move vertically around castle
        avoidX = isLeft ? -1 : 1; // Continue moving away from castle horizontally
        avoidY = (targetY > castle.y) ? 1 : -1; // Move towards target's Y direction
    } else {
        // Mob is more above/below, move horizontally around castle
        avoidX = (targetX > castle.x) ? 1 : -1; // Move towards target's X direction
        avoidY = isTop ? -1 : 1; // Continue moving away from castle vertically
    }
    
    return { x: avoidX, y: avoidY };
}

// Calculate scaled mob stats based on game time
function getScaledMobStats(mobType) {
    const baseStats = mobTypes[mobType];
    
    // Scaling starts only after 3rd mob type appears (180 seconds)
    if (gameState.gameSeconds < 180) {
        return {
            speed: baseStats.baseSpeed,
            damage: baseStats.baseDamage,
            hp: baseStats.hp,
            color: baseStats.color,
            size: baseStats.size
        };
    }
    
    // Very gradual scaling after 3 minutes: +5% speed and +10% damage per minute
    const minutesAfterThirdMob = (gameState.gameSeconds - 180) / 60;
    const speedMultiplier = 1 + (minutesAfterThirdMob * 0.05); // +5% per minute
    const damageMultiplier = 1 + (minutesAfterThirdMob * 0.10); // +10% per minute
    
    return {
        speed: baseStats.baseSpeed * speedMultiplier,
        damage: Math.floor(baseStats.baseDamage * damageMultiplier),
        hp: baseStats.hp,
        color: baseStats.color,
        size: baseStats.size
    };
}

// Load images
function loadImages() {
    const swordFiles = ['sword1.png', 'sword2.png', 'sword3.png'];
    
    // Load background image
    const bgImg = new Image();
    bgImg.onload = function() {
        backgroundImage = bgImg;
        imagesLoaded++;
        console.log('Background image loaded');
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    bgImg.onerror = function() {
        console.error('Failed to load background image');
        imagesLoaded++;
    };
    bgImg.src = 'assets/gamefield.png';
    
    // Load cake image
    const cakeImg = new Image();
    cakeImg.onload = function() {
        cakeImage = cakeImg;
        imagesLoaded++;
        console.log('Cake image loaded');
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    cakeImg.onerror = function() {
        console.error('Failed to load cake image');
        imagesLoaded++;
    };
    cakeImg.src = 'assets/cake.png';
    
    // Load sword images
    swordFiles.forEach((file, index) => {
        const img = new Image();
        img.onload = function() {
            swordImages[index + 1] = img;
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                console.log('All images loaded');
            }
        };
        img.onerror = function() {
            console.error(`Failed to load ${file}`);
            imagesLoaded++;
        };
        img.src = 'assets/' + file;
    });
    
    // Load mob images (right direction)
    Object.keys(mobImageFiles).forEach(mobType => {
        const rightFile = mobImageFiles[mobType].right;
        const img = new Image();
        img.onload = function() {
            mobImages[mobType] = img;
            imagesLoaded++;
            console.log(`Mob ${mobType} right image loaded`);
            if (imagesLoaded === totalImages) {
                console.log('All images loaded');
            }
        };
        img.onerror = function() {
            console.error(`Failed to load ${rightFile}`);
            imagesLoaded++;
        };
        img.src = 'assets/' + rightFile;
    });
    
    // Load mob images (left direction)
    Object.keys(mobImageFiles).forEach(mobType => {
        const leftFile = mobImageFiles[mobType].left;
        const img = new Image();
        img.onload = function() {
            mobLeftImages[mobType] = img;
            imagesLoaded++;
            console.log(`Mob ${mobType} left image loaded`);
            if (imagesLoaded === totalImages) {
                console.log('All images loaded');
            }
        };
        img.onerror = function() {
            console.error(`Failed to load ${leftFile}`);
            imagesLoaded++;
        };
        img.src = 'assets/' + leftFile;
    });
    
    // Load Danny image
    const dannyImg = new Image();
    dannyImg.onload = function() {
        dannyImage = dannyImg;
        imagesLoaded++;
        console.log('Danny image loaded');
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    dannyImg.onerror = function() {
        console.error('Failed to load danny.png');
        imagesLoaded++;
    };
    dannyImg.src = 'assets/Danny.png';
    
    // Load Danny Left image
    const dannyLeftImg = new Image();
    dannyLeftImg.onload = function() {
        dannyLeftImage = dannyLeftImg;
        imagesLoaded++;
        console.log('Danny Left image loaded');
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    dannyLeftImg.onerror = function() {
        console.error('Failed to load dannyleft.png');
        imagesLoaded++;
    };
    dannyLeftImg.src = 'assets/dannyleft.png';
    
    // Load Castle image
    const castleImg = new Image();
    castleImg.onload = function() {
        castleImage = castleImg;
        // Set castle dimensions to original image size
        castle.width = castleImg.naturalWidth;
        castle.height = castleImg.naturalHeight;
        
        // Initialize collision data after image loading
        initializeCastleCollision();
        
        imagesLoaded++;
        console.log('Castle image loaded with original size:', castle.width, 'x', castle.height);
        if (imagesLoaded === totalImages) {
            console.log('All images loaded');
        }
    };
    castleImg.onerror = function() {
        console.error('Failed to load Castle.png');
        imagesLoaded++;
    };
    castleImg.src = 'assets/Castle.png';
}

// Notification system
function showNotification(message, type = 'default') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Add roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Update camera to follow player
function updateCamera() {
    if (canvas) {
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
    }
}

// Resize canvas to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update camera to center on player
    updateCamera();
}

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Clear old local leaderboard records (now everything through server)
    localStorage.removeItem('leaderboard');
    
    // Set initial canvas size
    resizeCanvas();
    
    // Resize canvas when window resizes
    window.addEventListener('resize', resizeCanvas);
    
    // Load images
    loadImages();
    
    // Event listeners
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') {
            e.preventDefault();
            activateSword();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse click handler
    canvas.addEventListener('click', (e) => {
        if (gameState.isGameRunning) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            // Convert screen coordinates to world coordinates
            const worldMouseX = mouseX + camera.x;
            const worldMouseY = mouseY + camera.y;
            
            // Calculate sword angle based on world mouse position
            player.sword.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
            activateSword();
        }
    });
    
    // Touch handler for mobile devices
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState.isGameRunning && e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const touchX = (e.touches[0].clientX - rect.left) * scaleX;
            const touchY = (e.touches[0].clientY - rect.top) * scaleY;
            
            // Convert screen coordinates to world coordinates
            const worldTouchX = touchX + camera.x;
            const worldTouchY = touchY + camera.y;
            
            // Calculate sword angle based on world touch position
            player.sword.angle = Math.atan2(worldTouchY - player.y, worldTouchX - player.x);
            activateSword();
        }
    });
    
    updateUpgradeButtons();
}

// Screen management
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Hide leaderboard list when switching screens
    const leaderboardList = document.getElementById('leaderboard-list');
    if (leaderboardList && screenName !== 'leaderboard') {
        leaderboardList.style.display = 'none';
    }
    
    // Show/hide wallet info based on screen
    const walletInfo = document.getElementById('walletInfo');
    if (walletInfo) {
        if (screenName === 'mainMenu') {
            walletInfo.style.display = 'block';
        } else {
            walletInfo.style.display = 'none';
        }
    }
    
    // Handle different screen naming conventions
    let screenId;
    if (screenName === 'mainMenu') {
        screenId = 'mainMenu';
    } else {
        screenId = screenName + 'Screen';
    }
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        gameState.screen = screenName;
    } else {
        console.error(`Screen element not found: ${screenId}`);
    }
}

async function showMainMenu() {
    showScreen('mainMenu');
    if (gameState.isGameRunning) {
        await endGame();
    }
}

async function showUpgrades() {
    showScreen('upgrades');
    
    // Sync balance from blockchain before showing upgrades
    await updatePlayerStats();
    
    updateUpgradeButtons();
    document.getElementById('totalCoins').textContent = gameState.totalCoins;
}

async function showLeaderboard() {
    showScreen('leaderboard');
    updateLineraStatus();
    updatePlayerStats();
    
    // Load and display Linera leaderboard data
    await loadLineraLeaderboard();
}

/**
 * Load and display Linera leaderboard data
 */
async function loadLineraLeaderboard() {
    try {
        console.log('🏆 Loading Linera leaderboard data...');
        
        // Get leaderboard container
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) {
            console.warn('⚠️ Leaderboard list element not found');
            return;
        }
        
        // Show loading state
        leaderboardList.innerHTML = '<div class="loading">Loading leaderboard...</div>';
        
        if (!window.lineraSDK) {
            leaderboardList.innerHTML = '<div class="error">Linera SDK not available</div>';
            return;
        }
        
        // Get top players
        let topPlayers = [];
        if (window.lineraSDK.getTopPlayers) {
            topPlayers = await window.lineraSDK.getTopPlayers(100);
            console.log('🔍 Retrieved top players:', topPlayers);
            console.log('🔍 Top players length:', topPlayers ? topPlayers.length : 'null');
            if (topPlayers && topPlayers.length > 0) {
                console.log('🔍 First player data:', topPlayers[0]);
            }
        }
        
        // Build leaderboard HTML
        let html = '';
        
        // Top players section
        html += '<div class="top-players">';
        html += '<h3>🥇 Top Players</h3>';
        
        console.log('🔍 Checking topPlayers for display:', topPlayers);
        console.log('🔍 topPlayers && topPlayers.length > 0:', topPlayers && topPlayers.length > 0);
        
        if (topPlayers && topPlayers.length > 0) {
            console.log('🔍 Building HTML for', topPlayers.length, 'players');
            html += '<ol class="leaderboard-entries">';
            topPlayers.forEach((player, index) => {
                console.log(`🔍 Processing player ${index}:`, player);
                const rank = index + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
                html += `<li class="leaderboard-entry rank-${rank}">`;
                html += `<span class="rank">${medal}</span>`;
                html += `<span class="player-name">${player.playerName || 'Anonymous'}</span>`;
                html += `<span class="score">${player.score} kills</span>`;
                html += '</li>';
            });
            html += '</ol>';
        } else {
            console.log('🔍 No players to display, showing no data message');
            html += '<p class="no-data">No leaderboard data available yet</p>';
        }
        
        html += '</div>';
        
        console.log('🔍 Generated HTML:', html);
        
        // Update the leaderboard display
        leaderboardList.innerHTML = html;
        
        // Show the leaderboard list
        leaderboardList.style.display = 'block';
        
        console.log('✅ Linera leaderboard data loaded successfully');
        console.log('🔍 Leaderboard list display set to:', leaderboardList.style.display);
        
    } catch (error) {
        console.error('❌ Error loading Linera leaderboard:', error);
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="error">Error loading leaderboard data</div>';
            leaderboardList.style.display = 'block';
        }
    }
}

async function startGame() {
    showScreen('game');
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.style.display = 'block';
    }
    
    // Reset game state
    gameState.isGameRunning = true;
    gameState.currentGameCoins = 0;
    gameState.kills = 0;
    gameState.gameTime = 0;
    
    // Reset player position below castle
    player.x = 0;
    player.y = 300; // Spawn much further below castle
    
    // Sync health with blockchain
    if (window.lineraSDK && window.lineraSDK.fetchPlayerStats) {
        try {
            await window.lineraSDK.fetchPlayerStats();
            const stats = window.lineraSDK.getPlayerStats();
            if (stats && typeof stats.health === 'number') {
                player.health = Math.min(player.maxHealth, Math.max(0, stats.health));
                console.log('✅ Player health synced from blockchain:', player.health);
            } else {
                console.log('ℹ️ No valid health data from blockchain, using maximum health');
                player.health = player.maxHealth;
            }
        } catch (error) {
            console.error('❌ Failed to sync health from blockchain:', error);
            player.health = player.maxHealth;
        }
    } else {
        console.log('🔧 SDK unavailable, using maximum health');
        player.health = player.maxHealth;
    }
    
    // Start with purchased sword level
    player.sword.level = gameState.swordLevel;
    player.sword.damage = swordData[gameState.swordLevel].damage;
    player.sword.tempSword = null;
    player.sword.tempUses = 0;
    
    // Reset difficulty progression
    gameState.gameSeconds = 0;
    gameState.spawnRate = 120; // Balanced initial spawn rate
    gameState.allowedMobTypes = [1];
    gameState.maxMobs = 8;
    gameState.targetMobs = 3;
    
    // Clear arrays
    mobs = [];
    drops = [];
    
    // Initialize leaderboard if available
    if (window.lineraSDK && window.lineraSDK.setupLeaderboard) {
        try {
            console.log('🏆 Initializing leaderboard for game session...');
            await window.lineraSDK.setupLeaderboard();
            console.log('✅ Leaderboard initialized successfully');
        } catch (error) {
            console.warn('⚠️ Failed to initialize leaderboard:', error);
            // Continue with game even if leaderboard setup fails
        }
    }
    
    updateUI();
    gameLoop();
}

async function endGame() {
    // Prevent repeated calls
    if (!gameState.isGameRunning) {
        return;
    }
    
    gameState.isGameRunning = false;
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    
    // Coins are now saved immediately when picked up, so no need to save them here
    // Just update local storage with current total for display purposes
    localStorage.setItem('totalCoins', gameState.totalCoins);
    
    // Save to local leaderboard (only if there are kills)
    if (gameState.kills > 0) {
        saveScore(gameState.kills);
        
        // Submit score to Linera leaderboard
        if (window.lineraSDK && window.lineraSDK.submitScore) {
            try {
                console.log(`🏆 Submitting score to Linera leaderboard: ${gameState.kills} kills`);
                const success = await window.lineraSDK.submitScore(gameState.kills);
                if (success) {
                    console.log('✅ Score successfully submitted to Linera leaderboard');
                    showNotification(`Score ${gameState.kills} submitted to leaderboard!`, 'success');
                } else {
                    console.warn('⚠️ Failed to submit score to Linera leaderboard');
                    showNotification('Failed to submit score to leaderboard', 'error');
                }
            } catch (error) {
                console.error('❌ Error submitting score to Linera leaderboard:', error);
                showNotification('Error submitting score to leaderboard', 'error');
            }
        } else {
            console.warn('⚠️ Linera SDK submitScore function not available');
        }
    }
    
    // Clean up UI elements
    const swordUsesElement = document.getElementById('sword-uses');
    if (swordUsesElement) swordUsesElement.remove();
    
    const mobCountElement = document.getElementById('mob-count');
    if (mobCountElement) mobCountElement.remove();
    
    const difficultyElement = document.getElementById('difficulty-info');
    if (difficultyElement) difficultyElement.remove();
    
    const gameTimeElement = document.getElementById('game-time');
    if (gameTimeElement) gameTimeElement.remove();
    
    const healthElement = document.getElementById('player-health');
    if (healthElement) healthElement.remove();
    
    // Clear game objects
    mobs = [];
    drops = [];
    
    // Clear the canvas completely
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Fill with solid background color to ensure complete clearing
        ctx.fillStyle = '#2d3a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Remove all remaining mobs from blockchain
    if (window.lineraSDK && window.lineraSDK.removeAllMobs) {
        try {
            const success = await window.lineraSDK.removeAllMobs();
            if (success) {
                console.log('✅ All mobs removed from blockchain');
            } else {
                console.warn('⚠️ Not all mobs could be removed from blockchain');
            }
        } catch (error) {
            console.error('❌ Error removing mobs from blockchain:', error);
        }
    }
    
    // Reset player health to 100 via blockchain for next game
    if (window.lineraSDK && window.lineraSDK.addHealth) {
        // Calculate how much health to restore to reach 100
        const healthToRestore = player.maxHealth - player.health;
        if (healthToRestore > 0) {
            console.log(`🔄 Restoring ${healthToRestore} health to 100`);
            try {
                const success = await window.lineraSDK.addHealth(healthToRestore);
                if (success) {
                    player.health = player.maxHealth;
                    console.log('✅ Health restored to 100 for next game');
                    // Update statistics after health restoration
                    if (window.lineraSDK.fetchPlayerStats) {
                        try {
                            await window.lineraSDK.fetchPlayerStats();
                            console.log('✅ Player statistics synced after health restoration');
                        } catch (error) {
                            console.warn('⚠️ Failed to sync statistics after restoration:', error);
                        }
                    }
                } else {
                    console.warn('⚠️ Health restoration returned false, using local fallback');
                    player.health = player.maxHealth;
                }
            } catch (error) {
                console.error('❌ Error restoring health through blockchain:', error);
                // Fallback to local health reset
                player.health = player.maxHealth;
            }
        } else {
            console.log('ℹ️ Health already at maximum (100)');
        }
    } else {
        // Fallback to local health reset if SDK not available
        player.health = player.maxHealth;
        console.log('🔧 Health reset to 100 (local fallback)');
    }
    
    player.x = 0;
    player.y = 0;
    player.sword.tempSword = null;
    player.sword.tempUses = 0;
    
    showMainMenu();
}

// Save coins to Linera blockchain
async function saveCoinsToBlockchain(coins) {
    try {
        if (window.lineraSDK && window.lineraSDK.isInitialized()) {
            console.log(`Saving ${coins} coins to blockchain...`);
            const success = await window.lineraSDK.addCoins(coins);
            
            if (success) {
                console.log(`Successfully saved ${coins} coins to blockchain`);
            } else {
                console.warn('Failed to save coins to blockchain');
            }
        } else {
            console.warn('Linera integration not available, coins saved locally only');
        }
    } catch (error) {
        console.error('Error saving coins to blockchain:', error);
    }
}

// Upgrade system
function updateUpgradeButtons() {
    const upgrade2Btn = document.getElementById('upgrade2Btn');
    const upgrade3Btn = document.getElementById('upgrade3Btn');
    
    // Level 2 upgrade
    if (gameState.swordLevel >= 2) {
        upgrade2Btn.textContent = 'Purchased';
        upgrade2Btn.disabled = true;
    } else if (gameState.totalCoins >= 500) {
        upgrade2Btn.disabled = false;
    } else {
        upgrade2Btn.disabled = true;
    }
    
    // Level 3 upgrade
    if (gameState.swordLevel >= 3) {
        upgrade3Btn.textContent = 'Purchased';
        upgrade3Btn.disabled = true;
    } else if (gameState.totalCoins >= 1500 && gameState.swordLevel >= 2) {
        upgrade3Btn.disabled = false;
    } else {
        upgrade3Btn.disabled = true;
    }
}

async function buyUpgrade(level) {
    const costs = { 2: 500, 3: 1500 };
    
    if (gameState.totalCoins >= costs[level] && gameState.swordLevel < level) {
        // Try to subtract coins through blockchain
        if (window.lineraSDK && window.lineraSDK.subtractCoins) {
            try {
                const success = await window.lineraSDK.subtractCoins(costs[level]);
                
                if (success) {
                    // Successfully subtracted coins through blockchain
                    gameState.totalCoins -= costs[level];
                    gameState.swordLevel = level;
                    
                    localStorage.setItem('totalCoins', gameState.totalCoins);
                    localStorage.setItem('swordLevel', gameState.swordLevel);
                    
                    updateUpgradeButtons();
                    document.getElementById('totalCoins').textContent = gameState.totalCoins;
                    
                    showNotification(`Axe level ${level} purchased!`, 'success');
        console.log(`✅ Axe level ${level} purchased via blockchain`);
                } else {
                    // Error subtracting through blockchain, fallback to local
                    console.warn('❌ Failed to subtract coins via blockchain, using local fallback');
                    gameState.totalCoins -= costs[level];
                    gameState.swordLevel = level;
                    
                    localStorage.setItem('totalCoins', gameState.totalCoins);
                    localStorage.setItem('swordLevel', gameState.swordLevel);
                    
                    updateUpgradeButtons();
                    document.getElementById('totalCoins').textContent = gameState.totalCoins;
                    
                    showNotification(`Axe level ${level} purchased (locally)!`, 'success');
                }
            } catch (error) {
                console.error('❌ Error purchasing sword upgrade via blockchain:', error);
                // Fallback to local subtraction
                gameState.totalCoins -= costs[level];
                gameState.swordLevel = level;
                
                localStorage.setItem('totalCoins', gameState.totalCoins);
                localStorage.setItem('swordLevel', gameState.swordLevel);
                
                updateUpgradeButtons();
                document.getElementById('totalCoins').textContent = gameState.totalCoins;
                
                showNotification(`Axe level ${level} purchased (locally)!`, 'success');
            }
        } else {
            // SDK unavailable, using local subtraction
            console.log('🔧 Linera SDK not available, using local coin deduction');
            gameState.totalCoins -= costs[level];
            gameState.swordLevel = level;
            
            localStorage.setItem('totalCoins', gameState.totalCoins);
            localStorage.setItem('swordLevel', gameState.swordLevel);
            
            updateUpgradeButtons();
            document.getElementById('totalCoins').textContent = gameState.totalCoins;
            
            showNotification(`Axe level ${level} purchased!`, 'success');
        }
    }
}



// Leaderboard system
async function saveScore(kills) {
    console.log(`saveScore called with kills: ${kills}`);
    
    const survivalTime = gameState.gameSeconds;
    
    // Try to save through Linera blockchain
    if (window.lineraIntegration && window.lineraIntegration.isInitialized()) {
        try {
            console.log('Saving score to Linera blockchain:', {
                kills: kills,
                survivalTime: survivalTime
            });
            
            // Send result to blockchain
            const success = await window.lineraIntegration.submitScore(kills);
            
            if (success) {
                showNotification(`🎉 Result saved to blockchain! ${kills} kills in ${Math.floor(survivalTime/60)}:${(survivalTime%60).toString().padStart(2, '0')}`, 'coin');
                console.log('Score successfully saved to blockchain');
            } else {
                showNotification('⚠️ Blockchain save error, trying locally...', 'damage');
                await saveScoreToServer(kills);
            }
        } catch (error) {
            console.error('Error saving to blockchain:', error);
            showNotification('⚠️ Blockchain error, trying locally...', 'damage');
            await saveScoreToServer(kills);
        }
    } else {
        // Fallback to old server API
        console.log('Blockchain not ready, using server API');
        await saveScoreToServer(kills);
    }
}

// Fallback function for saving to server (if blockchain unavailable)
async function saveScoreToServer(kills) {
    // Get chain information from Linera
    let playerWallet = null;
    let chainId = 'unknown';
    
    // Try to get data from Linera integration
    if (window.lineraIntegration && window.lineraIntegration.isInitialized()) {
        try {
            const playerStats = window.lineraIntegration.getPlayerStats();
            if (playerStats && playerStats.playerName) {
                playerWallet = playerStats.playerName;
                chainId = 'linera-testnet';
                console.log('Using Linera player:', playerStats.playerName);
            }
        } catch (error) {
            console.error('Error getting Linera player stats:', error);
        }
    }
    
    // If no Linera connection, don't save result
    if (!playerWallet) {
        showNotification('❌ Linera connection required to save result', 'damage');
        console.log('No Linera connection - score not saved');
        return;
    }
    
    // Send result to server
    try {
        const response = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerWallet: playerWallet,
                chainId: chainId,
                kills: kills
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.isNewRecord) {
                if (result.previousRecord) {
                    showNotification(`🎉 NEW RECORD! ${kills} kills (previous: ${result.previousRecord})`, 'coin');
                } else {
                    showNotification(`🎉 FIRST RESULT! ${kills} kills`, 'coin');
                }
            } else {
                showNotification(`📊 Result: ${kills} kills (record: ${result.currentRecord})`, 'default');
            }
            console.log('Score processed:', result);
        } else {
            const error = await response.json();
            console.error('Error saving to global leaderboard:', error);
            showNotification('❌ Error saving result', 'damage');
        }
    } catch (error) {
        console.error('Network error saving score:', error);
        showNotification('❌ Server connection error', 'damage');
    }
}

async function updatePlayerStats() {
    // Update Linera status
    updateLineraStatus();
    
    // Update player statistics
    if (window.lineraSDK && window.lineraSDK.isInitialized()) {
        try {
            console.log('Fetching player stats from blockchain...');
            await window.lineraSDK.fetchPlayerStats();
            const playerStats = window.lineraSDK.getPlayerStats();
            
            // Update display
            const playerNameElement = document.getElementById('player-name');
            const playerCoinsElement = document.getElementById('player-best');
            const playerChainElement = document.getElementById('player-chain');
            
            if (playerNameElement) {
                playerNameElement.textContent = playerStats.playerName || '-';
            }
            
            if (playerCoinsElement) {
                playerCoinsElement.textContent = playerStats.totalCoins || 0;
            }
            
            // Synchronize totalCoins with blockchain
            if (playerStats.totalCoins !== undefined) {
                gameState.totalCoins = playerStats.totalCoins;
                localStorage.setItem('totalCoins', gameState.totalCoins);
            }
            
            if (playerChainElement && playerStats.chainId) {
                const shortChainId = playerStats.chainId.substring(0, 8) + '...';
                playerChainElement.textContent = shortChainId;
            }
            
            console.log('Player stats updated:', playerStats);
        } catch (error) {
            console.error('Error fetching player stats:', error);
        }
    } else {
        // Show local data
        const playerNameElement = document.getElementById('player-name');
        const playerCoinsElement = document.getElementById('player-best');
        const playerChainElement = document.getElementById('player-chain');
        
        if (playerNameElement) {
            playerNameElement.textContent = 'Local Player';
        }
        
        if (playerCoinsElement) {
            playerCoinsElement.textContent = gameState.totalCoins || 0;
        }
        
        if (playerChainElement) {
            playerChainElement.textContent = 'Local Mode';
        }
    }
}

// Function to change player name
async function changePlayerName() {
    if (window.lineraSDK && window.lineraSDK.isInitialized()) {
        await window.lineraSDK.promptForPlayerName();
        // Update statistics after name change
        await updatePlayerStats();
    } else {
        alert('Name change available only when connected to Linera');
    }
}

// Function renderLeaderboard removed - no longer needed

// Function to update Linera status
function updateLineraStatus() {
    const statusElement = document.getElementById('lineraStatus');
    if (!statusElement) return;
    
    if (window.lineraSDK && window.lineraSDK.isInitialized()) {
        const playerStats = window.lineraSDK.getPlayerStats();
        if (playerStats && playerStats.playerName) {
            statusElement.innerHTML = `⛓️ Connected to Linera: ${playerStats.playerName}`;
            statusElement.style.color = '#a0ffa0';
            statusElement.parentElement.style.borderColor = 'rgba(108, 255, 108, 0.8)';
        } else {
            statusElement.innerHTML = '🔄 Initializing Linera...';
            statusElement.style.color = '#ffff80';
            statusElement.parentElement.style.borderColor = 'rgba(255, 255, 108, 0.8)';
        }
    } else {
        statusElement.innerHTML = '📱 Local mode (Linera unavailable)';
        statusElement.style.color = '#ffa0a0';
        statusElement.parentElement.style.borderColor = 'rgba(255, 108, 108, 0.8)';
    }
}

// Game logic
function spawnMob() {
    // Choose mob type based on allowed types
    const allowedTypes = gameState.allowedMobTypes;
    const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
    
    // World boundaries for spawning
    const worldMinX = -WORLD_WIDTH/2 + WORLD_BORDER + 20;
    const worldMaxX = WORLD_WIDTH/2 - WORLD_BORDER - 20;
    const worldMinY = -WORLD_HEIGHT/2 + WORLD_BORDER + 20;
    const worldMaxY = WORLD_HEIGHT/2 - WORLD_BORDER - 20;
    
    // Calculate camera bounds with extra margin for guaranteed off-screen spawn
    const margin = 200; // Extra space outside camera view
    const cameraLeft = camera.x - margin;
    const cameraRight = camera.x + canvas.width + margin;
    const cameraTop = camera.y - margin;
    const cameraBottom = camera.y + canvas.height + margin;
    
    let x, y;
    let attempts = 0;
    let validSpawn = false;
    
    // Try to spawn outside camera view
    while (!validSpawn && attempts < 10) {
        const side = Math.floor(Math.random() * 4); // Choose which side to spawn from
        
        switch (side) {
            case 0: // Left of camera
                x = Math.max(worldMinX, cameraLeft - Math.random() * 300);
                y = cameraTop + Math.random() * (cameraBottom - cameraTop);
                break;
            case 1: // Right of camera
                x = Math.min(worldMaxX, cameraRight + Math.random() * 300);
                y = cameraTop + Math.random() * (cameraBottom - cameraTop);
                break;
            case 2: // Above camera
                x = cameraLeft + Math.random() * (cameraRight - cameraLeft);
                y = Math.max(worldMinY, cameraTop - Math.random() * 300);
                break;
            case 3: // Below camera
                x = cameraLeft + Math.random() * (cameraRight - cameraLeft);
                y = Math.min(worldMaxY, cameraBottom + Math.random() * 300);
                break;
        }
        
        // Ensure spawn is within world bounds
        x = Math.max(worldMinX, Math.min(worldMaxX, x));
        y = Math.max(worldMinY, Math.min(worldMaxY, y));
        
        // Check if spawn is outside camera view and not in castle avoidance zone
        const outsideCamera = (x < cameraLeft || x > cameraRight || y < cameraTop || y > cameraBottom);
        const notInCastleZone = !isInCastleAvoidanceZone(x, y);
        
        if (outsideCamera && notInCastleZone) {
            validSpawn = true;
        }
        
        attempts++;
    }
    
    // Fallback: spawn at world edges if no valid position found
    if (!validSpawn) {
        const edges = [
            { x: worldMinX + 50, y: player.y + (Math.random() - 0.5) * 200 }, // Left world edge
            { x: worldMaxX - 50, y: player.y + (Math.random() - 0.5) * 200 }, // Right world edge
            { x: player.x + (Math.random() - 0.5) * 200, y: worldMinY + 50 }, // Top world edge
            { x: player.x + (Math.random() - 0.5) * 200, y: worldMaxY - 50 }  // Bottom world edge
        ];
        
        // Filter out edges that are in castle avoidance zone
        const validEdges = edges.filter(edge => !isInCastleAvoidanceZone(edge.x, edge.y));
        
        if (validEdges.length > 0) {
            const randomEdge = validEdges[Math.floor(Math.random() * validEdges.length)];
            x = randomEdge.x;
            y = randomEdge.y;
        } else {
            // If all edges are blocked by castle, spawn far from castle
            const angle = Math.random() * 2 * Math.PI;
            const distance = CASTLE_AVOIDANCE_RADIUS + 100;
            x = castle.x + Math.cos(angle) * distance;
            y = castle.y + Math.sin(angle) * distance;
            
            // Ensure within world bounds
            x = Math.max(worldMinX, Math.min(worldMaxX, x));
            y = Math.max(worldMinY, Math.min(worldMaxY, y));
        }
    }
    
    // Generate unique mob ID
    const mobId = `mob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const maxHp = mobTypes[type].hp;
    
    // Create mob locally first
    const mob = {
        id: mobId,
        x: x,
        y: y,
        type: type,
        hp: maxHp,
        maxHp: maxHp,
        lastAttack: 0,
        blockchainSynced: false,
        facingLeft: false // Track if mob is facing left
    };
    
    mobs.push(mob);
    
    // Try to create mob on blockchain
    if (window.lineraSDK && window.lineraSDK.createMob) {
        window.lineraSDK.createMob(mobId, maxHp).then(success => {
            if (success) {
                console.log(`✅ Mob ${mobId} created on blockchain`);
                mob.blockchainSynced = true;
            } else {
                console.log(`⚠️ Failed to create mob ${mobId} on blockchain, keeping local only`);
            }
        }).catch(error => {
            console.error(`❌ Error creating mob ${mobId} on blockchain:`, error);
        });
    }
}

function activateSword() {
    if (player.sword.active) return; // Prevent multiple swings
    
    // Find closest mob for auto-aim
    let closestMob = null;
    let closestDistance = Infinity;
    
    mobs.forEach(mob => {
        const distance = Math.sqrt((mob.x - player.x) ** 2 + (mob.y - player.y) ** 2);
        if (distance < 120 && distance < closestDistance) { // Within sword range
            closestDistance = distance;
            closestMob = mob;
        }
    });
    
    // Set target angle based on closest mob or current mouse position
    if (closestMob) {
        player.sword.targetAngle = Math.atan2(closestMob.y - player.y, closestMob.x - player.x);
    } else {
        player.sword.targetAngle = player.sword.angle; // Use current angle if no mob nearby
    }
    
    player.sword.active = true;
    player.sword.swingProgress = 0;
    
    // Reset hit flags for all mobs
    mobs.forEach(mob => {
        mob.hitThisSwing = false;
    });
}

function createDrop(x, y) {
    const rand = Math.random();
    let type;
    
    if (rand < 0.6) { // 60% chance
        type = 'coin';
    } else if (rand < 0.85) { // 25% chance (0.6 + 0.25 = 0.85)
        type = 'cake';
    } else if (rand < 0.95) { // 10% chance (0.85 + 0.10 = 0.95)
        type = 'sword2';
    } else { // 5% chance (remaining)
        type = 'sword3';
    }
    
    drops.push({
        x: x,
        y: y,
        type: type,
        size: dropTypes[type].size
    });
}

function updatePlayer() {
    // Store previous position for collision detection
    const prevX = player.x;
    const prevY = player.y;
    
    // Movement
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) {
        player.x -= player.speed;
        player.facingLeft = true;
    }
    if (keys['d'] || keys['arrowright']) {
        player.x += player.speed;
        player.facingLeft = false;
    }
    
    // Check collision with castle and revert if colliding
    if (checkCastleCollision(player.x, player.y, player.width, player.height)) {
        player.x = prevX;
        player.y = prevY;
    }
    
    // Keep player within world boundaries
    const halfWidth = player.width / 2;
    const halfHeight = player.height / 2;
    const minX = -WORLD_WIDTH/2 + WORLD_BORDER + halfWidth;
    const maxX = WORLD_WIDTH/2 - WORLD_BORDER - halfWidth;
    const minY = -WORLD_HEIGHT/2 + WORLD_BORDER + halfHeight;
    const maxY = WORLD_HEIGHT/2 - WORLD_BORDER - halfHeight;
    
    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));
    
    // Update sword swing animation
    if (player.sword.active) {
        player.sword.swingProgress += 1 / player.sword.swingDuration;
        
        if (player.sword.swingProgress >= 1) {
            player.sword.active = false;
            player.sword.swingProgress = 0;
        } else {
            // Create arc swing animation
            const swingArc = Math.PI / 3; // 60 degree arc
            const centerAngle = player.sword.targetAngle;
            const progress = player.sword.swingProgress;
            
            // Smooth swing using sine wave for natural motion
            const animatedProgress = Math.sin(progress * Math.PI);
            player.sword.angle = centerAngle - swingArc/2 + swingArc * animatedProgress;
        }
    }
    
    // Update camera to follow player
    updateCamera();
}

function updateMobs() {
    for (let i = mobs.length - 1; i >= 0; i--) {
        const mob = mobs[i];
        const mobStats = getScaledMobStats(mob.type);
        
        // Move towards player (optimized calculation)
        const dx = player.x - mob.x;
        const dy = player.y - mob.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            let moveX, moveY;
            
            // Check if mob is in castle avoidance zone
            if (isInCastleAvoidanceZone(mob.x, mob.y)) {
                // Get avoidance direction to go around castle
                const avoidDirection = getCastleAvoidanceDirection(mob.x, mob.y, player.x, player.y);
                moveX = avoidDirection.x * mobStats.speed;
                moveY = avoidDirection.y * mobStats.speed;
            } else {
                // Normal movement towards player
                moveX = (dx / distance) * mobStats.speed;
                moveY = (dy / distance) * mobStats.speed;
            }
            
            // Update mob facing direction based on movement
            if (moveX < 0) {
                mob.facingLeft = true;
            } else if (moveX > 0) {
                mob.facingLeft = false;
            }
            
            // Store previous position for collision detection
            const prevX = mob.x;
            const prevY = mob.y;
            
            mob.x += moveX;
            mob.y += moveY;
            
            // Check collision with castle and revert if colliding (backup safety)
            if (checkCastleCollision(mob.x, mob.y, mobStats.size, mobStats.size)) {
                mob.x = prevX;
                mob.y = prevY;
                
                // If still colliding, try to move away from castle
                const toCastleX = mob.x - castle.x;
                const toCastleY = mob.y - castle.y;
                const toCastleDistance = Math.sqrt(toCastleX * toCastleX + toCastleY * toCastleY);
                
                if (toCastleDistance > 0) {
                    // Move away from castle
                    mob.x += (toCastleX / toCastleDistance) * mobStats.speed * 2;
                    mob.y += (toCastleY / toCastleDistance) * mobStats.speed * 2;
                }
            }
        }
        
        // Attack player if close (using scaled damage)
        if (distance < 30 && Date.now() - mob.lastAttack > 1000) {
            const damage = mobStats.damage;
            
            // Use blockchain to subtract health
            if (window.lineraSDK && window.lineraSDK.subtractHealth) {
                window.lineraSDK.subtractHealth(damage).then(success => {
                    if (success) {
                        player.health = Math.max(0, player.health - damage);
                        
                        if (player.health <= 0) {
                            showNotification('Game Over!', 'damage');
                            setTimeout(async () => await endGame(), 1000);
                            return;
                        }
                    }
                }).catch(error => {
                    console.error('Failed to subtract health via blockchain:', error);
                    // Fallback to local health reduction
                    player.health -= damage;
                    showNotification(`-${damage} HP`, 'damage');
                    
                    if (player.health <= 0) {
                        showNotification('Game Over!', 'damage');
                        setTimeout(async () => await endGame(), 1000);
                        return;
                    }
                });
            } else {
                // Fallback to local health reduction if SDK not available
                player.health -= damage;
                showNotification(`-${damage} HP`, 'damage');
                
                if (player.health <= 0) {
                    showNotification('Game Over!', 'damage');
                    setTimeout(async () => await endGame(), 1000);
                    return;
                }
            }
            
            mob.lastAttack = Date.now();
        }
        
        // Check sword collision (adjusted for new sword position)
        if (player.sword.active && distance < 80) {
            // Check if this mob was already hit this swing
            if (!mob.hitThisSwing) {
                const currentDamage = player.sword.tempSword ? 
                    swordData[player.sword.tempSword].damage : 
                    swordData[player.sword.level].damage;
                
                mob.hitThisSwing = true;
                
                // Visual feedback for hit
                mob.lastHit = Date.now();
                
                // Try to damage mob on blockchain first
                if (mob.blockchainSynced && window.lineraSDK && window.lineraSDK.damageMob) {
                    window.lineraSDK.damageMob(mob.id, currentDamage).then(success => {
                        if (success) {
                            console.log(`✅ Mob ${mob.id} damaged on blockchain`);
                            // Update local health after blockchain success
                            mob.hp -= currentDamage;
                            
                            if (mob.hp <= 0) {
                                // Remove from blockchain
                                if (window.lineraSDK.removeMob) {
                                    window.lineraSDK.removeMob(mob.id).catch(error => {
                                        console.error(`❌ Failed to remove mob ${mob.id} from blockchain:`, error);
                                    });
                                }
                                
                                // Create drop and remove mob locally
                                createDrop(mob.x, mob.y);
                                mobs.splice(i, 1);
                                gameState.kills++;
                                
                                // Update blockchain with current kills (async, non-blocking)
                                if (window.leaderboardBlockchain && window.leaderboardBlockchain.isReady()) {
                                    window.leaderboardBlockchain.updateKills(gameState.kills).catch(error => {
                                        console.log('Non-critical blockchain update error:', error);
                                    });
                                }
                            }
                        } else {
                            console.log(`⚠️ Failed to damage mob ${mob.id} on blockchain, using local fallback`);
                            // Fallback to local damage
                            mob.hp -= currentDamage;
                            
                            if (mob.hp <= 0) {
                                createDrop(mob.x, mob.y);
                                mobs.splice(i, 1);
                                gameState.kills++;
                                
                                if (window.leaderboardBlockchain && window.leaderboardBlockchain.isReady()) {
                                    window.leaderboardBlockchain.updateKills(gameState.kills).catch(error => {
                                        console.log('Non-critical blockchain update error:', error);
                                    });
                                }
                            }
                        }
                    }).catch(error => {
                        console.error(`❌ Error damaging mob ${mob.id} on blockchain:`, error);
                        // Fallback to local damage
                        mob.hp -= currentDamage;
                        
                        if (mob.hp <= 0) {
                            createDrop(mob.x, mob.y);
                            mobs.splice(i, 1);
                            gameState.kills++;
                            
                            if (window.leaderboardBlockchain && window.leaderboardBlockchain.isReady()) {
                                window.leaderboardBlockchain.updateKills(gameState.kills).catch(error => {
                                    console.log('Non-critical blockchain update error:', error);
                                });
                            }
                        }
                    });
                } else {
                    // Fallback to local damage if blockchain not available or mob not synced
                    mob.hp -= currentDamage;
                    
                    if (mob.hp <= 0) {
                        createDrop(mob.x, mob.y);
                        mobs.splice(i, 1);
                        gameState.kills++;
                        
                        if (window.leaderboardBlockchain && window.leaderboardBlockchain.isReady()) {
                            window.leaderboardBlockchain.updateKills(gameState.kills).catch(error => {
                                console.log('Non-critical blockchain update error:', error);
                            });
                        }
                    }
                }
                
                // Only reduce temp sword uses when actually hitting a mob
                if (player.sword.tempSword) {
                    player.sword.tempUses--;
                    if (player.sword.tempUses <= 0) {
                        player.sword.tempSword = null;
                        showNotification('Temporary sword broke!', 'damage');
                    }
                }
                
                // Continue to next mob if this one was removed
                if (mob.hp <= 0) {
                    continue;
                }
            }
        }
    }
    
    // Remove mobs too far from player (optimized distance check)
    const maxDistance = 800;
    const maxDistanceSquared = maxDistance * maxDistance; // Avoid sqrt calculation
    
    for (let i = mobs.length - 1; i >= 0; i--) {
        const mob = mobs[i];
        const dx = mob.x - player.x;
        const dy = mob.y - player.y;
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared >= maxDistanceSquared) {
            // Remove from blockchain if synced
            if (mob.blockchainSynced && window.lineraSDK && window.lineraSDK.removeMob) {
                window.lineraSDK.removeMob(mob.id).catch(error => {
                    console.error(`❌ Failed to remove distant mob ${mob.id} from blockchain:`, error);
                });
            }
            
            // Remove from local array
            mobs.splice(i, 1);
            console.log(`🗑️ Removed distant mob ${mob.id}`);
        }
    }
}

function updateDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        const dx = player.x - drop.x;
        const dy = player.y - drop.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 25) {
            switch (drop.type) {
                case 'coin':
                    // Add coin directly to blockchain instead of accumulating
                    if (window.lineraSDK && window.lineraSDK.addCoins) {
                        window.lineraSDK.addCoins(dropTypes.coin.value).then(success => {
                            if (success) {
                                gameState.currentGameCoins += dropTypes.coin.value;
                                showNotification(`+${dropTypes.coin.value} coin (saved)`, 'coin');
                            } else {
                                // Fallback to local accumulation if blockchain fails
                                gameState.currentGameCoins += dropTypes.coin.value;
                                showNotification(`+${dropTypes.coin.value} coin (locally)`, 'coin');
                            }
                        }).catch(error => {
                            console.error('Failed to add coin via blockchain:', error);
                            // Fallback to local accumulation
                            gameState.currentGameCoins += dropTypes.coin.value;
                            showNotification(`+${dropTypes.coin.value} coin (locally)`, 'coin');
                        });
                    } else {
                        // Fallback to local accumulation if SDK not available
                        gameState.currentGameCoins += dropTypes.coin.value;
                        showNotification(`+${dropTypes.coin.value} coin`, 'coin');
                    }
                    break;
                case 'cake':
                    const healAmount = Math.floor(player.maxHealth * 0.2);
                    
                    // Use blockchain to add health
                    if (window.lineraSDK && window.lineraSDK.addHealth) {
                        window.lineraSDK.addHealth(healAmount).then(success => {
                            if (success) {
                                player.health = Math.min(player.maxHealth, 
                                    player.health + healAmount);
                            }
                        }).catch(error => {
                            console.error('Failed to add health via blockchain:', error);
                            // Fallback to local health increase
                            player.health = Math.min(player.maxHealth, 
                                player.health + healAmount);
                            showNotification(`+${healAmount} HP`, 'heal');
                        });
                    } else {
                        // Fallback to local health increase if SDK not available
                        player.health = Math.min(player.maxHealth, 
                            player.health + healAmount);
                        showNotification(`+${healAmount} HP`, 'heal');
                    }
                    break;
                case 'sword2':
                case 'sword3':
                    const swordLevel = drop.type === 'sword2' ? 2 : 3;
                    // Only give temporary sword if player doesn't have permanent upgrade of this level or higher
                    if (gameState.swordLevel < swordLevel) {
                        player.sword.tempSword = swordLevel;
                        player.sword.tempUses = 5;
                        showNotification(`Axe level ${swordLevel}! (5 hits)`, 'default');
                    } else {
                        // Give 1 coin instead if player already has this upgrade
                        if (window.lineraSDK && window.lineraSDK.addCoins) {
                            window.lineraSDK.addCoins(1).then(success => {
                                if (success) {
                                    gameState.currentGameCoins += 1;
                                    showNotification(`+1 coin (already have this sword, saved)`, 'coin');
                                } else {
                                    gameState.currentGameCoins += 1;
                                    showNotification(`+1 coin (already have this sword, locally)`, 'coin');
                                }
                            }).catch(error => {
                                console.error('Failed to add coin via blockchain:', error);
                                gameState.currentGameCoins += 1;
                                showNotification(`+1 coin (already have this sword, locally)`, 'coin');
                            });
                        } else {
                            gameState.currentGameCoins += 1;
                            showNotification(`+1 coin (already have this sword)`, 'coin');
                        }
                    }
                    break;
            }
            
            drops.splice(i, 1);
        }
    }
}

function updateUI() {
    document.getElementById('coins').textContent = gameState.currentGameCoins;
    document.getElementById('kills').textContent = gameState.kills;
    

    
    // Show temp sword uses if player has a temporary sword
    const swordUsesElement = document.getElementById('sword-uses');
    if (player.sword.tempSword) {
        if (!swordUsesElement) {
            // Create sword uses display
            const swordUsesDiv = document.createElement('div');
            swordUsesDiv.id = 'sword-uses';
            swordUsesDiv.style.cssText = `
                position: fixed;
                top: 120px;
                left: 20px;
                color: #FFD700;
                font-family: 'Orbitron', monospace;
                font-size: 16px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                z-index: 1000;
                background: rgba(0,0,0,0.7);
                padding: 8px 12px;
                border-radius: 5px;
                border: 2px solid #FFD700;
            `;
            document.body.appendChild(swordUsesDiv);
        }
        document.getElementById('sword-uses').textContent = `Sword ${player.sword.tempSword}: ${player.sword.tempUses} hits`;
    } else if (swordUsesElement) {
        // Remove sword uses display when no temp sword
        swordUsesElement.remove();
    }
    
    // Show mob count in UI for monitoring performance
    const mobCountElement = document.getElementById('mob-count');
    if (!mobCountElement) {
        // Create mob count display
        const mobCountDiv = document.createElement('div');
        mobCountDiv.id = 'mob-count';
        mobCountDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 160px;
            color: #FF6B6B;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 1000;
            background: rgba(0,0,0,0.7);
            padding: 6px 10px;
            border-radius: 5px;
            border: 1px solid #FF6B6B;
        `;
        document.body.appendChild(mobCountDiv);
    }
    document.getElementById('mob-count').textContent = `Mobs: ${mobs.length}/${gameState.absoluteMaxMobs}`;
    
    // Show difficulty scaling info only after 3rd mob appears
    const difficultyElement = document.getElementById('difficulty-info');
    
    if (gameState.gameSeconds >= 180) {
        // Show scaling info after 3 minutes
        if (!difficultyElement) {
            const difficultyDiv = document.createElement('div');
            difficultyDiv.id = 'difficulty-info';
            difficultyDiv.style.cssText = `
                position: fixed;
                top: 50px;
                right: 20px;
                color: #FFA500;
                font-family: 'Orbitron', monospace;
                font-size: 13px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                z-index: 1000;
                background: rgba(0,0,0,0.7);
                padding: 6px 10px;
                border-radius: 5px;
                border: 1px solid #FFA500;
            `;
            document.body.appendChild(difficultyDiv);
        }
        
        const minutesAfterThirdMob = (gameState.gameSeconds - 180) / 60;
        const speedBonus = Math.floor(minutesAfterThirdMob * 5);
        const damageBonus = Math.floor(minutesAfterThirdMob * 10);
        document.getElementById('difficulty-info').textContent = `+${speedBonus}% speed, +${damageBonus}% damage`;
    } else if (difficultyElement) {
        // Remove element if it exists but we're before 3 minutes
        difficultyElement.remove();
    }
    
    // Debug info (can be removed later)
    // console.log(`Mobs: ${mobs.length}/${gameState.maxMobs} (target: ${gameState.targetMobs})`);
}

function render() {
    // Clear canvas with background (optimized)
    if (backgroundImage) {
        // Draw background image covering the entire world
        ctx.save();
        ctx.translate(-camera.x, -camera.y);
        
        // Draw the background image to cover the world
        const worldLeft = -WORLD_WIDTH/2;
        const worldTop = -WORLD_HEIGHT/2;
        ctx.drawImage(backgroundImage, worldLeft, worldTop, WORLD_WIDTH, WORLD_HEIGHT);
        
        ctx.restore();
    } else {
        // Optimized fallback: solid color instead of gradient
        ctx.fillStyle = '#5a6d33';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Save context and apply camera transformation
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Optional: Draw subtle grid pattern over background (uncomment if needed)
    /*
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    
    const gridSize = 40;
    const worldLeft = -WORLD_WIDTH/2 + WORLD_BORDER;
    const worldRight = WORLD_WIDTH/2 - WORLD_BORDER;
    const worldTop = -WORLD_HEIGHT/2 + WORLD_BORDER;
    const worldBottom = WORLD_HEIGHT/2 - WORLD_BORDER;
    
    const startX = Math.max(worldLeft, Math.floor(camera.x / gridSize) * gridSize);
    const startY = Math.max(worldTop, Math.floor(camera.y / gridSize) * gridSize);
    const endX = Math.min(worldRight, startX + canvas.width + gridSize);
    const endY = Math.min(worldBottom, startY + canvas.height + gridSize);
    
    for (let x = startX; x < endX; x += gridSize) {
        if (x >= worldLeft && x <= worldRight) {
            ctx.beginPath();
            ctx.moveTo(x, Math.max(worldTop, startY));
            ctx.lineTo(x, Math.min(worldBottom, endY));
            ctx.stroke();
        }
    }
    for (let y = startY; y < endY; y += gridSize) {
        if (y >= worldTop && y <= worldBottom) {
            ctx.beginPath();
            ctx.moveTo(Math.max(worldLeft, startX), y);
            ctx.lineTo(Math.min(worldRight, endX), y);
            ctx.stroke();
        }
    }
    */
    
    // Draw world boundaries (walls)
    const wallLeft = -WORLD_WIDTH/2;
    const wallRight = WORLD_WIDTH/2;
    const wallTop = -WORLD_HEIGHT/2;
    const wallBottom = WORLD_HEIGHT/2;
    
    ctx.fillStyle = '#2d3a0f';
    ctx.strokeStyle = '#5a6d33';
    ctx.lineWidth = 3;
    
    // Left wall
    ctx.fillRect(wallLeft, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    ctx.strokeRect(wallLeft, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    
    // Right wall
    ctx.fillRect(wallRight - WORLD_BORDER, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    ctx.strokeRect(wallRight - WORLD_BORDER, wallTop, WORLD_BORDER, WORLD_HEIGHT);
    
    // Top wall
    ctx.fillRect(wallLeft, wallTop, WORLD_WIDTH, WORLD_BORDER);
    ctx.strokeRect(wallLeft, wallTop, WORLD_WIDTH, WORLD_BORDER);
    
    // Bottom wall
    ctx.fillRect(wallLeft, wallBottom - WORLD_BORDER, WORLD_WIDTH, WORLD_BORDER);
    ctx.strokeRect(wallLeft, wallBottom - WORLD_BORDER, WORLD_WIDTH, WORLD_BORDER);
    
    // Add corner decorations
    ctx.fillStyle = '#1a2208';
    const cornerSize = WORLD_BORDER;
    
    // Corner blocks for visual appeal
    ctx.fillRect(wallLeft, wallTop, cornerSize, cornerSize);
    ctx.fillRect(wallRight - cornerSize, wallTop, cornerSize, cornerSize);
    ctx.fillRect(wallLeft, wallBottom - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(wallRight - cornerSize, wallBottom - cornerSize, cornerSize, cornerSize);
    
    // Draw castle
    if (castleImage) {
        ctx.drawImage(castleImage, castle.x - castle.width / 2, castle.y - castle.height / 2, castle.width, castle.height);
    }
    
    // Draw player
    const currentDannyImage = player.facingLeft ? dannyLeftImage : dannyImage;
    if (currentDannyImage) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(65,105,225,0.5)';
        
        // Proportional scaling
        const desiredHeight = 105;
        const aspect = currentDannyImage.width / currentDannyImage.height;
        const desiredWidth = desiredHeight * aspect;
        ctx.drawImage(
          currentDannyImage,
          player.x - desiredWidth / 2,
          player.y - desiredHeight / 2,
          desiredWidth,
          desiredHeight
        );
        
        ctx.shadowBlur = 0;
        ctx.restore();
    } else {
        // Fallback to colored rectangle
        ctx.fillStyle = player.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(65,105,225,0.5)';
        ctx.fillRect(player.x - player.width/2, player.y - player.height/2, 
                     player.width, player.height);
        ctx.shadowBlur = 0;
    }
    
    // Draw player health bar above head (in world coordinates)
    const healthBarWidth = 40;
    const healthBarHeight = 6;
    const healthBarX = player.x - healthBarWidth/2;
    const healthBarY = player.y - player.height/2 - 15;
    
    // Health bar background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(healthBarX - 2, healthBarY - 2, healthBarWidth + 4, healthBarHeight + 4);
    
    // Health bar border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(healthBarX - 2, healthBarY - 2, healthBarWidth + 4, healthBarHeight + 4);
    
    // Health bar fill
    const healthPercent = player.health / player.maxHealth;
    const healthColor = healthPercent > 0.6 ? '#4CAF50' : 
                       healthPercent > 0.3 ? '#FFC107' : '#F44336';
    ctx.fillStyle = healthColor;
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
    
    // Draw sword if active
    if (player.sword.active) {
        const swordLevel = player.sword.tempSword || player.sword.level;
        
        // Draw sword image if loaded
        if (swordImages[swordLevel]) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.sword.angle);
            
            // Add glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = swordData[swordLevel].color;
            
            // Draw sword image with proper proportions
            const swordImage = swordImages[swordLevel];
            const aspectRatio = swordImage.width / swordImage.height;
            const swordHeight = 52.5; // Increased height by 1.5x for better visibility
            const swordWidth = swordHeight * aspectRatio; // Maintain aspect ratio
            const swordOffset = 25; // Distance from player center
            ctx.drawImage(swordImage, 
                         swordOffset, -swordHeight/2, swordWidth, swordHeight);
            
            ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            // Fallback to simple sword shape
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.sword.angle);
            
            ctx.fillStyle = swordData[swordLevel].color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = swordData[swordLevel].color;
            
            // Draw sword blade with better proportions
            const swordOffset = 25; // Distance from player center
            ctx.fillRect(swordOffset, -12, 75, 24); // Increased size by 1.5x for better visibility
            // Draw sword handle
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(swordOffset - 27, -6, 22.5, 12); // Proportional handle increased by 1.5x
            
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }
    
    // Draw mobs (optimized rendering)
    mobs.forEach(mob => {
        const mobData = mobTypes[mob.type];
        
        // Simple flash effect (no heavy operations)
        const timeSinceHit = Date.now() - (mob.lastHit || 0);
        const isFlashing = timeSinceHit < 100; // Shorter flash duration
        
        // Draw mob using image if available
        if (mobImages[mob.type] || mobLeftImages[mob.type]) {
            // Minimal glow effect for performance
            if (isFlashing) {
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#FFFFFF';
            }
            
            const size = mobData.size * 3; // Make images 3x bigger
            // Choose correct image based on facing direction
            const mobImage = mob.facingLeft ? mobLeftImages[mob.type] : mobImages[mob.type];
            if (mobImage) {
                ctx.drawImage(mobImage, 
                             mob.x - size/2, mob.y - size/2, size, size);
            }
            
            if (isFlashing) {
                ctx.shadowBlur = 0;
            }
        } else {
            // Optimized fallback rendering
            ctx.fillStyle = isFlashing ? '#FFFFFF' : mobData.color;
            
            const size = mobData.size;
            const x = mob.x - size/2;
            const y = mob.y - size/2;
            
            ctx.fillRect(x, y, size, size); // Simple rectangle instead of rounded
        }
        
        // Health bar for damaged mobs
        if (mob.hp < mob.maxHp) {
            const barWidth = mobData.size;
            const barHeight = 4;
            const barX = mob.x - barWidth/2;
            const barY = mob.y - mobData.size/2 - 10;
            
            // Health bar background
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            
            // Health bar fill
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, (mob.hp / mob.maxHp) * barWidth, barHeight);
            
            // Health bar border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        }
    });
    
    // Draw drops with optimized animations
    const time = Date.now() * 0.003; // Calculate once outside loop
    drops.forEach((drop, index) => {
        const dropData = dropTypes[drop.type];
        const bounce = Math.sin(time + index) * 2; // Reduced bounce
        const rotation = time + index;
        
        ctx.save();
        ctx.translate(drop.x, drop.y + bounce);
        
        // Minimal glow effect for performance
        ctx.shadowBlur = 8;
        ctx.shadowColor = dropData.color;
        
        if (drop.type === 'coin') {
            // Draw spinning coin
            ctx.rotate(rotation);
            ctx.fillStyle = dropData.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, drop.size, drop.size * Math.abs(Math.cos(rotation)), 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Add inner circle
            ctx.fillStyle = '#FFB000';
            ctx.beginPath();
            ctx.ellipse(0, 0, drop.size * 0.6, drop.size * 0.6 * Math.abs(Math.cos(rotation)), 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (drop.type === 'cake') {
            // Draw cake using image or fallback
            const pulse = 1 + Math.sin(time * 2 + index) * 0.2;
            ctx.scale(pulse, pulse);
            
            if (cakeImage) {
                // Draw actual cake image
                const cakeSize = drop.size * 2; // Make cake bigger
                ctx.drawImage(cakeImage, -cakeSize/2, -cakeSize/2, cakeSize, cakeSize);
            } else {
                // Fallback to original drawing
                ctx.fillStyle = dropData.color;
                ctx.beginPath();
                ctx.arc(0, 0, drop.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add cake details
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(0, -drop.size * 0.3, drop.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (drop.type === 'sword2' || drop.type === 'sword3') {
            // Draw sword drops using actual sword images
            const swordLevel = drop.type === 'sword2' ? 2 : 3;
            
            ctx.rotate(rotation * 0.5);
            
            if (swordImages[swordLevel]) {
                // Draw actual sword image
                const swordWidth = drop.size * 3;
                const swordHeight = drop.size * 1.2;
                ctx.drawImage(swordImages[swordLevel], 
                             -swordWidth/2, -swordHeight/2, swordWidth, swordHeight);
            } else {
                // Fallback drawing
                ctx.fillStyle = dropData.color;
                ctx.fillRect(-drop.size * 1.5, -drop.size * 0.3, drop.size * 3, drop.size * 0.6);
                
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-drop.size * 0.5, -drop.size * 0.4, drop.size, drop.size * 0.8);
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    });
    
    // Restore context (return to screen coordinates)
    ctx.restore();
    
    // Draw mini-map in screen coordinates
    const miniMapSize = 120;
    const miniMapX = canvas.width - miniMapSize - 20;
    const miniMapY = 20;
    
    // Mini-map background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
    
    // Mini-map border
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2;
    ctx.strokeRect(miniMapX, miniMapY, miniMapSize, miniMapSize);
    
    // Draw world boundaries on mini-map
    ctx.strokeStyle = '#5a6d33';
    ctx.lineWidth = 1;
    ctx.strokeRect(miniMapX + 5, miniMapY + 5, miniMapSize - 10, miniMapSize - 10);
    
    // Draw player position on mini-map
    const playerMapX = miniMapX + 5 + ((player.x + WORLD_WIDTH/2) / WORLD_WIDTH) * (miniMapSize - 10);
    const playerMapY = miniMapY + 5 + ((player.y + WORLD_HEIGHT/2) / WORLD_HEIGHT) * (miniMapSize - 10);
    
    ctx.fillStyle = '#4169E1';
    ctx.beginPath();
    ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Mini-map label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Map', miniMapX + miniMapSize/2, miniMapY + miniMapSize + 15);
}

// Update difficulty progression
function updateDifficulty() {
    // Update game time in seconds
    gameState.gameSeconds = Math.floor(gameState.gameTime / 60);
    
    // Mob type progression (revised timings)
    if (gameState.gameSeconds >= 60 && !gameState.allowedMobTypes.includes(2)) {
        gameState.allowedMobTypes.push(2);
        showNotification('New enemies appeared!', 'damage');
    }
    if (gameState.gameSeconds >= 180 && !gameState.allowedMobTypes.includes(3)) {
        gameState.allowedMobTypes.push(3);
        showNotification('Strong enemies appeared!', 'damage');
    }
    
    // Dynamic mob count based on time (with hard limits for performance)
    const baseTargetMobs = 3;
    const baseMaxMobs = 8;
    
    // Gradually increase mob count over time but cap at absoluteMaxMobs
    const difficultyMultiplier = 1 + Math.min(gameState.gameSeconds / 120, 1.5); // Max 2.5x after 2 minutes
    gameState.targetMobs = Math.min(Math.floor(baseTargetMobs * difficultyMultiplier), gameState.absoluteMaxMobs - 3);
    gameState.maxMobs = Math.min(Math.floor(baseMaxMobs * difficultyMultiplier), gameState.absoluteMaxMobs);
    
    // Spawn rate for maintaining mob count
    const baseSpawnRate = 120; // 2 seconds base
    const minSpawnRate = 45; // Fastest spawn every 0.75 seconds
    const difficultyIncrease = Math.min(gameState.gameSeconds * 1.5, 75);
    gameState.spawnRate = Math.max(minSpawnRate, baseSpawnRate - difficultyIncrease);
}

function gameLoop() {
    if (!gameState.isGameRunning) return;
    
    gameState.gameTime++;
    
    // Update difficulty progression
    updateDifficulty();
    
    // Smart mob spawning system with absolute limit
    const currentMobCount = mobs.length;
    
    // Strict check: NEVER exceed absolute maximum
    if (currentMobCount >= gameState.absoluteMaxMobs) {
        // Don't spawn any new mobs - performance protection
        console.log(`Mob limit reached: ${currentMobCount}/${gameState.absoluteMaxMobs}`);
    } else {
        // Always try to maintain target mob count
        if (currentMobCount < gameState.targetMobs) {
            // Spawn more frequently if under target
            if (gameState.gameTime % Math.max(30, gameState.spawnRate / 2) === 0) {
                spawnMob();
            }
        } else if (currentMobCount < gameState.maxMobs) {
            // Normal spawn rate if between target and max
            if (gameState.gameTime % gameState.spawnRate === 0) {
                spawnMob();
            }
        }
        // Don't spawn if at or above max mob count
    }
    
    updatePlayer();
    updateMobs();
    updateDrops();
    updateUI();
    render();
    
    requestAnimationFrame(gameLoop);
}

// Initialize when page loads
window.addEventListener('load', init);