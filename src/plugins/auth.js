const { verifyRequest } = require('../security/hmac');
const { AuthenticationError } = require('../utils/errors');

async function authPlugin(fastify) {
    fastify.decorate('authenticate', async function (request, reply) {
        if (request.url === '/health' || request.url === '/') return;

        const result = verifyRequest(request);
        if (!result.valid) {
            throw new AuthenticationError(result.error);
        }

        request.apiKeyId = result.apiKeyId;
    });
}

module.exports = authPlugin;