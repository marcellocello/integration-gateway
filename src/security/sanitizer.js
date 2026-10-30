const MASK = '***REDACTED***';

const DEFAULT_SENSITIVE_KEYS = [
    'password', 'secret', 'token', 'authorization',
    'api_key', 'apikey', 'api-key', 'access_token',
    'refresh_token', 'private_key', 'card_number',
    'cvv', 'pin', 'ssn', 'credit_card',
];

function maskValue(value) {
    if (typeof value !== 'string') return MASK;
    if (value.length <= 8) return MASK;
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function maskObject(obj, sensitiveKeys = DEFAULT_SENSITIVE_KEYS) {
    if (!obj || typeof obj !== 'object') return obj;

    const masked = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(masked)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
            masked[key] = maskValue(masked[key]);
        } else if (typeof masked[key] === 'object' && masked[key] !== null) {
            masked[key] = maskObject(masked[key], sensitiveKeys);
        }
    }

    return masked;
}

function maskHeaders(headers) {
    if (!headers) return headers;
    const masked = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'x-signature', 'cookie', 'set-cookie'];
    for (const key of Object.keys(masked)) {
        if (sensitiveHeaders.includes(key.toLowerCase())) {
            masked[key] = maskValue(masked[key]);
        }
    }
    return masked;
}

module.exports = { maskObject, maskHeaders, maskValue };