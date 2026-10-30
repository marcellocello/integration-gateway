const Redis = require('ioredis');
const config = require('./index');

function createRedisConnection(name = 'default') {
    const conn = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 200, 5000),
        connectionName: `igw:${name}`,
    });

    conn.on('error', (err) => {
        console.error(`[Redis:${name}] Connection error:`, err.message);
    });

    return conn;
}

module.exports = { createRedisConnection };