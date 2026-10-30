const db = require('../config/database');

async function healthRoutes(fastify) {
    fastify.get('/health', { preHandler: [] }, async (request, reply) => {
        const checks = { status: 'ok', timestamp: new Date().toISOString() };

        try {
            await db.raw('SELECT 1');
            checks.mysql = 'connected';
        } catch {
            checks.mysql = 'disconnected';
            checks.status = 'degraded';
        }

        const statusCode = checks.status === 'ok' ? 200 : 503;
        return reply.code(statusCode).send(checks);
    });
}

module.exports = healthRoutes;