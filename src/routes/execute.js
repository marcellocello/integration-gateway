const { v4: uuidv4 } = require('uuid');
const { execute } = require('../services/executor');

async function executeRoutes(fastify) {
    fastify.post('/execute/:code', {
        schema: {
            params: {
                type: 'object',
                properties: { code: { type: 'string' } },
            },
            body: {
                type: 'object',
                properties: {
                    payload: { type: 'object', default: {} },
                    correlationId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { code } = request.params;
        const { payload, correlationId } = request.body;
        const corrId = correlationId || uuidv4();

        try {
            const result = await execute(code, payload || {}, corrId);

            const statusCode = result.success ? 200 : 502;
            return reply.code(statusCode).send({
                success: result.success,
                data: result.data,
                metadata: {
                    correlationId: corrId,
                    integration: result.integration,
                    duration_ms: result.duration,
                    statusCode: result.statusCode,
                },
                error: result.error || null,
            });
        } catch (err) {
            const statusCode = err.statusCode || 500;
            return reply.code(statusCode).send({
                success: false,
                data: null,
                metadata: { correlationId: corrId },
                error: {
                    code: err.code || 'INTERNAL_ERROR',
                    message: err.message,
                },
            });
        }
    });
}

module.exports = executeRoutes;