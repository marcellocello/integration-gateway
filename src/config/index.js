require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    server: {
        host: process.env.HOST || '0.0.0.0',
        port: parseInt(process.env.PORT || '3000'),
    },
    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'integration_gateway',
    },
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    },
    security: {
        encryptionKey: process.env.ENCRYPTION_KEY,
        apiKeys: parseApiKeys(process.env.API_KEYS || ''),
        hmacToleranceMs: parseInt(process.env.HMAC_TOLERANCE_MS || '300000'),
    },
    queue: {
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10'),
    },
};

function parseApiKeys(raw) {
    const map = new Map();
    if (!raw) return map;
    raw.split(',').forEach((pair) => {
        const [id, secret] = pair.split(':');
        if (id && secret) map.set(id.trim(), secret.trim());
    });
    return map;
}

module.exports = config;