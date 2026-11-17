const { v4: uuidv4 } = require('uuid');
const { execute } = require('../services/executor');

async function executeRoutes(fastify) {
    fastify.post('/execute/:code', async (request, reply) => {
        const { code } = request.params;
        let corrId = uuidv4();
        let payload = {};
        let files = [];

        try {
            const contentType = request.headers['content-type'] || '';
            if (contentType.includes('multipart/form-data')) {
                const parts = request.parts();

                for await (const part of parts) {
                    if (part.type === 'file') {
                        const buffer = await part.toBuffer();
                        files.push({
                            fieldname: part.fieldname,
                            filename: part.filename,
                            mimetype: part.mimetype,
                            buffer,
                        });
                    } else {
                        if (part.fieldname === 'correlationId') {
                            corrId = part.value;
                        } else {
                            try { payload[part.fieldname] = JSON.parse(part.value); }
                            catch { payload[part.fieldname] = part.value; }
                        }
                    }
                }

                if (files.length > 0) payload._files = files;
            } else {
                payload = request.body?.payload || {};
                corrId = request.body?.correlationId || corrId;
            }

            const result = await execute(code, payload, corrId);
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