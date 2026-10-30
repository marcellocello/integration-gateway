const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

const connection = createRedisConnection('queue');

const integrationQueue = new Queue('integration-execute', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400 },      // 24 hours
        removeOnFail: { age: 7 * 86400 },      // 7 days
    },
});

module.exports = { integrationQueue };