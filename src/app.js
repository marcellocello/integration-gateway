const fastify = require('fastify');
const { AuthenticationError } = require('./utils/errors');

function buildApp(opts = {}) {
    const app = fastify({
        logger: {
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        },
        bodyLimit: 1048576 * 5, // 5MB
        ...opts,
    });

    app.register(require('@fastify/helmet'), {
        contentSecurityPolicy: false,
    });
    app.register(require('@fastify/cors'), {
        origin: process.env.CORS_ORIGIN || false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });
    app.register(require('@fastify/rate-limit'), {
        max: 100,
        timeWindow: '1 minute',
    });

    app.register(require('./plugins/mysql'));

    app.addHook('preHandler', async (request, reply) => {
        const publicPaths = ['/health', '/', '/favicon.ico'];
        if (publicPaths.includes(request.url)) return;

        const apiKey = request.headers['x-api-key'];
        const validSecret = process.env.API_KEYS ? process.env.API_KEYS.split(':')[1] : null;

        if (!apiKey || apiKey !== validSecret) {
            throw new AuthenticationError('Invalid or missing x-api-key header');
        }
    });

    app.setErrorHandler((error, request, reply) => {
        const statusCode = error.statusCode || 500;

        if (statusCode >= 500) {
            app.log.error(error);
        }

        reply.code(statusCode).send({
            success: false,
            error: {
                code: error.code || 'INTERNAL_ERROR',
                message: statusCode >= 500 && process.env.NODE_ENV === 'production'
                    ? 'Internal server error'
                    : error.message,
            },
        });
    });

    app.register(require('./routes/health'));
    app.register(require('./routes/integrations'));
    app.register(require('./routes/execute'));
    app.register(require('./routes/logs'));

    return app;
}

module.exports = { buildApp };