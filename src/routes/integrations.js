const db = require('../config/database');
const { encrypt } = require('../security/encryption');
const { invalidateIntegration } = require('../services/cache');

async function integrationRoutes(fastify) {
    fastify.get('/integrations', async (request) => {
        const { transport, direction, is_active } = request.query;
        let query = db('integrations').select('id', 'code', 'name', 'direction', 'transport', 'execution_mode', 'is_active', 'created_at', 'updated_at');

        if (transport) query = query.where('transport', transport);
        if (direction) query = query.where('direction', direction);
        if (is_active !== undefined) query = query.where('is_active', is_active === 'true' ? 1 : 0);

        const integrations = await query.orderBy('name');
        return { success: true, data: integrations };
    });

    fastify.get('/integrations/:code', async (request, reply) => {
        const integration = await db('integrations').where('code', request.params.code).first();
        if (!integration) return reply.code(404).send({ success: false, error: 'Not found' });

        const hasCred = await db('integration_credentials')
            .where('integration_id', integration.id).first();
        integration.has_credentials = !!hasCred;

        return { success: true, data: integration };
    });

    fastify.post('/integrations', {
        schema: {
            body: {
                type: 'object',
                required: ['code', 'name', 'direction', 'transport', 'config'],
                properties: {
                    code: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-z0-9-]+$' },
                    name: { type: 'string', minLength: 1, maxLength: 255 },
                    direction: { type: 'string', enum: ['OUTBOUND', 'INBOUND', 'BILATERAL', 'PASSIVE'] },
                    transport: { type: 'string', enum: ['REST', 'SOAP', 'GRAPHQL', 'WEBSOCKET', 'WEBHOOK', 'WEBVIEW', 'FILE', 'CUSTOM'] },
                    execution_mode: { type: 'string', enum: ['SYNC', 'ASYNC'], default: 'SYNC' },
                    config: { type: 'object' },
                    metadata: { type: 'object' },
                    credentials: {
                        type: 'object',
                        properties: {
                            auth_type: { type: 'string', enum: ['API_KEY', 'BASIC', 'BEARER', 'OAUTH2', 'HMAC', 'CUSTOM', 'NONE'] },
                            data: { type: 'object' },
                        },
                    },
                },
            },
        },
    }, async (request, reply) => {
        const { code, name, direction, transport, execution_mode, config, metadata, credentials } = request.body;

        const trx = await db.transaction();
        try {
            const [id] = await trx('integrations').insert({
                code,
                name,
                direction,
                transport,
                execution_mode: execution_mode || 'SYNC',
                config: JSON.stringify(config),
                metadata: metadata ? JSON.stringify(metadata) : null,
            });

            if (credentials && credentials.auth_type !== 'NONE') {
                const encrypted = encrypt(JSON.stringify(credentials.data));
                await trx('integration_credentials').insert({
                    integration_id: id,
                    auth_type: credentials.auth_type,
                    credentials: encrypted,
                });
            }

            await trx.commit();
            return reply.code(201).send({ success: true, data: { id, code } });
        } catch (err) {
            await trx.rollback();
            if (err.code === 'ER_DUP_ENTRY') {
                return reply.code(409).send({ success: false, error: `Integration '${code}' already exists` });
            }
            throw err;
        }
    });

    fastify.put('/integrations/:code', async (request, reply) => {
        const { name, config, metadata, execution_mode, credentials } = request.body;

        const integration = await db('integrations').where('code', request.params.code).first();
        if (!integration) return reply.code(404).send({ success: false, error: 'Not found' });

        const trx = await db.transaction();
        try {
            const updates = { updated_at: db.fn.now() };
            if (name) updates.name = name;
            if (config) updates.config = JSON.stringify(config);
            if (metadata) updates.metadata = JSON.stringify(metadata);
            if (execution_mode) updates.execution_mode = execution_mode;

            await trx('integrations').where('id', integration.id).update(updates);

            if (credentials) {
                await trx('integration_credentials').where('integration_id', integration.id).delete();
                if (credentials.auth_type !== 'NONE') {
                    const encrypted = encrypt(JSON.stringify(credentials.data));
                    await trx('integration_credentials').insert({
                        integration_id: integration.id,
                        auth_type: credentials.auth_type,
                        credentials: encrypted,
                    });
                }
            }

            await trx.commit();
            invalidateIntegration(request.params.code);
            return { success: true, data: { code: request.params.code } };
        } catch (err) {
            await trx.rollback();
            throw err;
        }
    });

    fastify.patch('/integrations/:code/toggle', async (request, reply) => {
        const integration = await db('integrations').where('code', request.params.code).first();
        if (!integration) return reply.code(404).send({ success: false, error: 'Not found' });

        await db('integrations').where('id', integration.id).update({
            is_active: !integration.is_active,
            updated_at: db.fn.now(),
        });

        invalidateIntegration(request.params.code);
        return { success: true, data: { code: integration.code, is_active: !integration.is_active } };
    });
}

module.exports = integrationRoutes;