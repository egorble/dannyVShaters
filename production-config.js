// production-config.js
// Конфігурація для production середовища

module.exports = {
  // Основні налаштування
  domain: 'dannyvshaters.xyz',
  email: 'egor4042007@gmail.com',
  
  // Порти
  ports: {
    frontend: 8082,
    orchestrator: 3001,
    nginx: 443,
    nginxHttp: 80
  },
  
  // Шляхи
  paths: {
    app: '/var/www/danny-game',
    logs: '/var/log/pm2',
    nginx: '/etc/nginx/sites-available',
    ssl: '/etc/letsencrypt/live'
  },
  
  // Користувач системи
  user: 'danny-game',
  
  // Налаштування PM2
  pm2: {
    instances: 1,
    maxMemoryRestart: {
      orchestrator: '1G',
      frontend: '512M'
    },
    autorestart: true,
    watch: false
  },
  
  // Налаштування nginx
  nginx: {
    clientMaxBodySize: '10M',
    proxyTimeout: 60,
    gzipCompression: true,
    sslProtocols: ['TLSv1.2', 'TLSv1.3'],
    securityHeaders: {
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      xXssProtection: '1; mode=block',
      strictTransportSecurity: 'max-age=31536000; includeSubDomains'
    }
  },
  
  // Налаштування SSL
  ssl: {
    autoRenew: true,
    renewTime: '0 12 * * *', // Щодня о 12:00
    keySize: 4096
  },
  
  // Налаштування backup
  backup: {
    enabled: true,
    schedule: '0 2 * * 0', // Щонеділі о 2:00
    retention: 30, // днів
    directory: '/var/backups/danny-game'
  },
  
  // Налаштування моніторингу
  monitoring: {
    healthCheck: {
      enabled: true,
      interval: 300000, // 5 хвилин
      endpoints: [
        'http://localhost:8082',
        'http://localhost:3001/status'
      ]
    },
    alerts: {
      email: 'egor4042007@gmail.com',
      diskUsage: 85, // %
      memoryUsage: 90, // %
      cpuUsage: 95 // %
    }
  },
  
  // Налаштування безпеки
  security: {
    firewall: {
      allowedPorts: [22, 80, 443],
      allowedIPs: [], // Порожній масив = дозволити всім
      rateLimiting: {
        enabled: true,
        requests: 100,
        window: 900000 // 15 хвилин
      }
    },
    fail2ban: {
      enabled: true,
      maxRetries: 5,
      banTime: 3600 // 1 година
    }
  },
  
  // Налаштування логування
  logging: {
    level: 'info',
    rotation: {
      enabled: true,
      maxSize: '100M',
      maxFiles: 10
    },
    destinations: {
      file: true,
      console: false,
      syslog: true
    }
  },
  
  // Налаштування бази даних (якщо потрібно)
  database: {
    type: 'file', // localStorage для frontend
    backup: true,
    encryption: false
  },
  
  // Налаштування кешування
  cache: {
    static: {
      enabled: true,
      maxAge: '1y',
      types: ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'eot']
    },
    api: {
      enabled: false, // Для blockchain даних кеш не потрібен
      maxAge: '5m'
    }
  },
  
  // Налаштування для Linera
  linera: {
    version: '0.14.2',
    network: 'testnet-babbage',
    faucetUrl: 'https://faucet.testnet-babbage.linera.net',
    nodeServiceUrl: 'http://localhost:8080'
  },
  
  // Змінні середовища
  environment: {
    NODE_ENV: 'production',
    DEBUG: false,
    LOG_LEVEL: 'info'
  }
};