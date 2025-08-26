/**
 * Environment Configuration for Danny Game
 * Automatically detects localhost vs VPS deployment
 */

// Auto-detect environment
function getEnvironmentConfig() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    // Check if running on localhost
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalhost) {
        // Local development environment
        return {
            ORCHESTRATOR_URL: 'http://localhost:3001',
            LINERA_SERVICE_URL: 'http://localhost:8080',
            FRONTEND_URL: 'http://localhost:8082',
            environment: 'development'
        };
    } else {
        // VPS/Production environment
        const baseUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
        return {
            ORCHESTRATOR_URL: `${baseUrl}/api`,
            LINERA_SERVICE_URL: `${baseUrl}/graphql`,
            FRONTEND_URL: baseUrl,
            environment: 'production'
        };
    }
}

// Export configuration
const ENV_CONFIG = getEnvironmentConfig();

console.log('🔧 Environment Configuration:', ENV_CONFIG);

// Backwards compatibility
const ORCHESTRATOR_URL = ENV_CONFIG.ORCHESTRATOR_URL;
const LEADERBOARD_CHAIN_ID = '83990e573e43c72806fe93036de3418b9d3e57108e1cf4dabb6b5893b3f1a3b2';

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ENV_CONFIG, ORCHESTRATOR_URL, LEADERBOARD_CHAIN_ID };
}