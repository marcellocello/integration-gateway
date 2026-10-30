const fp = require('fastify-plugin') || ((fn) => fn); // fastify-plugin optional
const db = require('../config/database');

async function mysqlPlugin(fastify) {
    try {
        await db.raw('SELECT 1');
        fastify.log.info('MySQL connected');
    } catch (err) {
        fastify.log.error('MySQL connection failed:', err.message);
        throw err;
    }

    fastify.decorate('db', db);

    fastify.addHook('onClose', async () => {
        await db.destroy();
        fastify.log.info('MySQL connection closed');
    });
}

module.exports = mysqlPlugin;