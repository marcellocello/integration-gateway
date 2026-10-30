const crypto = require('crypto');
const config = require('../config');

function generateSignature(secret, method, path, timestamp, body) {
    const payload = [method.toUpperCase(), path, timestamp, body || ''].join('\n');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyRequest(request) {
    const apiKeyId = request.headers['x-api-key'];
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];

    if (!apiKeyId || !timestamp || !signature) {
        return { valid: false, error: 'Missing auth headers (x-api-key, x-timestamp, x-signature)' };
    }

    const now = Date.now();
    const reqTime = parseInt(timestamp);
    if (isNaN(reqTime) || Math.abs(now - reqTime) > config.security.hmacToleranceMs) {
        return { valid: false, error: 'Request timestamp expired or invalid' };
    }

    const secret = config.security.apiKeys.get(apiKeyId);
    if (!secret) {
        return { valid: false, error: 'Invalid API key' };
    }

    const bodyStr = request.body ? JSON.stringify(request.body) : '';
    const expectedSignature = generateSignature(
        secret,
        request.method,
        request.url,
        timestamp,
        bodyStr
    );

    const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, apiKeyId };
}

module.exports = { generateSignature, verifyRequest };