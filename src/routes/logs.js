const db = require('../config/database');

async function logRoutes(fastify) {
    fastify.get('/logs', async (request) => {
        const { integration_code, status, correlation_id, from, to, page = 1, limit = 50 } = request.query;
        const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        const pageLimit = Math.min(100, Math.max(1, parseInt(limit)));

        let query = db('integration_logs as l')
            .join('integrations as i', 'i.id', 'l.integration_id')
            .select(
                'l.id', 'i.code as integration_code', 'i.name as integration_name',
                'l.correlation_id', 'l.direction', 'l.request_method', 'l.request_url',
                'l.response_status', 'l.status', 'l.error_message',
                'l.duration_ms', 'l.retry_attempt', 'l.created_at'
            );

        if (integration_code) query = query.where('i.code', integration_code);
        if (status) query = query.where('l.status', status);
        if (correlation_id) query = query.where('l.correlation_id', correlation_id);
        if (from) query = query.where('l.created_at', '>=', from);
        if (to) query = query.where('l.created_at', '<=', to);

        const [{ total }] = await query.clone().clearSelect().count('l.id as total');

        const logs = await query.orderBy('l.created_at', 'desc').limit(pageLimit).offset(offset);

        return {
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: pageLimit,
                total,
                totalPages: Math.ceil(total / pageLimit),
            },
        };
    });

    fastify.get('/logs/:id', async (request, reply) => {
        const log = await db('integration_logs as l')
            .join('integrations as i', 'i.id', 'l.integration_id')
            .select('l.*', 'i.code as integration_code', 'i.name as integration_name')
            .where('l.id', request.params.id)
            .first();

        if (!log) return reply.code(404).send({ success: false, error: 'Log not found' });
        return { success: true, data: log };
    });

    fastify.get('/logs/stats', async (request) => {
        const { integration_code, from, to } = request.query;
        const fromDate = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const toDate = to || new Date().toISOString();

        let query = db('integration_logs as l')
            .join('integrations as i', 'i.id', 'l.integration_id')
            .where('l.created_at', '>=', fromDate)
            .where('l.created_at', '<=', toDate);

        if (integration_code) query = query.where('i.code', integration_code);

        const stats = await query.clone()
            .select(
                db.raw('COUNT(*) as total'),
                db.raw("SUM(CASE WHEN l.status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count"),
                db.raw("SUM(CASE WHEN l.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count"),
                db.raw("SUM(CASE WHEN l.status = 'TIMEOUT' THEN 1 ELSE 0 END) as timeout_count"),
                db.raw('AVG(l.duration_ms) as avg_duration_ms'),
                db.raw('MAX(l.duration_ms) as max_duration_ms'),
                db.raw('MIN(l.duration_ms) as min_duration_ms')
            )
            .first();

        const perIntegration = await query.clone()
            .select(
                'i.code',
                'i.name',
                db.raw('COUNT(*) as total'),
                db.raw("SUM(CASE WHEN l.status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count"),
                db.raw("SUM(CASE WHEN l.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count"),
                db.raw('AVG(l.duration_ms) as avg_duration_ms')
            )
            .groupBy('i.code', 'i.name')
            .orderBy('total', 'desc');

        return {
            success: true,
            data: {
                period: { from: fromDate, to: toDate },
                summary: {
                    ...stats,
                    success_rate: stats.total > 0
                        ? ((stats.success_count / stats.total) * 100).toFixed(2) + '%'
                        : '0%',
                },
                per_integration: perIntegration,
            },
        };
    });
}

module.exports = logRoutes;