const { Worker } = require('bullmq');
const { createRedisConnection } = require('../../config/redis');
const { execute } = require('../../services/executor');
const { httpRequest } = require('../../utils/http-client');
const config = require('../../config');

function createIntegrationWorker() {
    const worker = new Worker(
        'integration-execute',
        async (job) => {
            const { code, payload, correlationId, callbackUrl } = job.data;

            console.log(`[Worker] Processing job ${job.id} for integration: ${code}`);

            const result = await execute(code, payload, correlationId);

            if (callbackUrl) {
                try {
                    await httpRequest({
                        url: callbackUrl,
                        method: 'POST',
                        body: {
                            jobId: job.id,
                            correlationId,
                            integrationCode: code,
                            result,
                        },
                        timeout: 10000,
                    });
                } catch (err) {
                    console.error(`[Worker] Callback failed for job ${job.id}:`, err.message);
                }
            }

            return result;
        },
        {
            connection: createRedisConnection('worker'),
            concurrency: config.queue.concurrency,
        }
    );

    worker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
}

module.exports = { createIntegrationWorker };