const { integrationQueue } = require('../index');

async function enqueueExecution({ code, payload, correlationId, priority = 5, callbackUrl = null }) {
    const job = await integrationQueue.add(
        'execute',
        { code, payload, correlationId, callbackUrl },
        {
            priority,
            jobId: `${code}:${correlationId}`,
        }
    );

    return {
        jobId: job.id,
        status: 'QUEUED',
    };
}

module.exports = { enqueueExecution };