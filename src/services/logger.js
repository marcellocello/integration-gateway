const db = require('../config/database');
const { maskHeaders, maskObject } = require('../security/sanitizer');

async function logIntegration({
    integrationId,
    correlationId,
    direction,
    request: req,
    response: res,
    status,
    errorMessage,
    duration,
    retryAttempt = 0,
    maskFields = [],
}) {
    const sensitiveKeys = maskFields.length > 0 ? maskFields : undefined;

    try {
        const [logId] = await db('integration_logs').insert({
            integration_id: integrationId,
            correlation_id: correlationId,
            direction,
            request_url: req?.url || null,
            request_method: req?.method || null,
            request_headers: req?.headers ? JSON.stringify(maskHeaders(req.headers)) : null,
            request_body: req?.body ? JSON.stringify(maskObject(
                typeof req.body === 'string' ? JSON.parse(req.body) : req.body,
                sensitiveKeys
            )) : null,
            response_status: res?.statusCode || null,
            response_headers: res?.headers ? JSON.stringify(maskHeaders(res.headers)) : null,
            response_body: res?.body ? JSON.stringify(
                typeof res.body === 'object' ? maskObject(res.body, sensitiveKeys) : res.body
            ) : null,
            status,
            error_message: errorMessage || null,
            duration_ms: duration || null,
            retry_attempt: retryAttempt,
        });

        return logId;
    } catch (err) {
        console.error('[LogService] Failed to write log:', err.message);
        return null;
    }
}

module.exports = { logIntegration };