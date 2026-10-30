require('dotenv').config();
const { createIntegrationWorker } = require('./workers/integration.worker');

console.log('[WorkerRunner] Starting integration worker...');
const worker = createIntegrationWorker();

async function shutdown() {
    console.log('[WorkerRunner] Shutting down...');
    await worker.close();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);