const db = require('../config/database');
const { integrationCache, credentialCache } = require('./cache');
const { logIntegration } = require('./logger');
const { decrypt } = require('../security/encryption');
const { canExecute, recordSuccess, recordFailure } = require('./circuit-breaker');
const { IntegrationNotFoundError, IntegrationInactiveError, IntegrationExecutionError, CircuitOpenError } = require('../utils/errors');

const RestApiAdapter = require('../adapters/rest-api.adapter');
const WebviewAdapter = require('../adapters/webview.adapter');

const ADAPTER_MAP = {
    REST: RestApiAdapter,
    WEBVIEW: WebviewAdapter,
};

async function getIntegration(code) {
    const cacheKey = `integration:${code}`;
    let integration = integrationCache.get(cacheKey);
    if (integration) return integration;

    integration = await db('integrations').where('code', code).first();
    if (!integration) return null;

    if (typeof integration.config === 'string') {
        integration.config = JSON.parse(integration.config);
    }
    if (typeof integration.metadata === 'string' && integration.metadata) {
        integration.metadata = JSON.parse(integration.metadata);
    }

    integrationCache.set(cacheKey, integration);
    return integration;
}

async function getCredentials(integrationId, code) {
    const cacheKey = `credential:${code}`;
    let cred = credentialCache.get(cacheKey);
    if (cred) return cred;

    const row = await db('integration_credentials')
        .where('integration_id', integrationId)
        .first();

    if (!row) return null;

    const decrypted = decrypt(row.credentials);
    cred = {
        auth_type: row.auth_type,
        data: JSON.parse(decrypted),
        expires_at: row.expires_at,
    };

    credentialCache.set(cacheKey, cred);
    return cred;
}

async function execute(code, payload, correlationId = null) {
    const integration = await getIntegration(code);
    if (!integration) throw new IntegrationNotFoundError(code);
    if (!integration.is_active) throw new IntegrationInactiveError(code);

    const cbConfig = integration.config.circuit_breaker || {};
    if (cbConfig.enabled && !canExecute(code, cbConfig)) {
        throw new CircuitOpenError(code);
    }

    const AdapterClass = ADAPTER_MAP[integration.transport];
    if (!AdapterClass) {
        throw new IntegrationExecutionError(`Unsupported transport: ${integration.transport}`);
    }

    const credentials = await getCredentials(integration.id, code);

    const adapter = new AdapterClass(integration, credentials);
    const validation = adapter.validateConfig();
    if (!validation.valid) {
        throw new IntegrationExecutionError(`Invalid config: ${validation.error}`);
    }

    let result;
    let logStatus;
    let errorMessage = null;

    try {
        result = await adapter.execute(payload);

        if (result.success) {
            logStatus = 'SUCCESS';
            if (cbConfig.enabled) recordSuccess(code);
        } else {
            logStatus = 'FAILED';
            errorMessage = result.error?.message || `HTTP ${result.statusCode}`;
            if (cbConfig.enabled) recordFailure(code);
        }
    } catch (err) {
        logStatus = err.code === 'UND_ERR_HEADERS_TIMEOUT' ? 'TIMEOUT' : 'FAILED';
        errorMessage = err.message;
        if (cbConfig.enabled) recordFailure(code);

        result = {
            success: false,
            statusCode: null,
            data: null,
            duration: 0,
            error: { message: err.message },
            _raw: { request: { payload }, response: null },
        };
    }

    const maskFields = integration.metadata?.mask_fields || [];
    logIntegration({
        integrationId: integration.id,
        correlationId,
        direction: integration.direction === 'PASSIVE' ? 'OUTBOUND' : integration.direction,
        request: result._raw?.request ? {
            url: result._raw.request.url,
            method: result._raw.request.method || integration.config.method,
            headers: result._raw.request.headers,
            body: result._raw.request.body,
        } : null,
        response: result._raw?.response ? {
            statusCode: result._raw.response.statusCode,
            headers: result._raw.response.headers,
            body: result._raw.response.body,
        } : null,
        status: logStatus,
        errorMessage,
        duration: result.duration,
        maskFields,
    }).catch(() => { });

    const { _raw, ...cleanResult } = result;
    return {
        ...cleanResult,
        integration: {
            code: integration.code,
            name: integration.name,
            transport: integration.transport,
        },
        correlationId,
    };
}

module.exports = { execute, getIntegration };