const { LRUCache } = require('lru-cache');

const integrationCache = new LRUCache({
    max: 500,
    ttl: 5 * 60 * 1000,
});

const credentialCache = new LRUCache({
    max: 200,
    ttl: 60 * 1000,
});

function invalidateIntegration(code) {
    integrationCache.delete(`integration:${code}`);
    credentialCache.delete(`credential:${code}`);
}

function invalidateAll() {
    integrationCache.clear();
    credentialCache.clear();
}

module.exports = {
    integrationCache,
    credentialCache,
    invalidateIntegration,
    invalidateAll,
};