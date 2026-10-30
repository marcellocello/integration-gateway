require('dotenv').config();
const config = require('./config');
const { buildApp } = require('./app');

async function start() {
    const app = buildApp();

    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            app.log.info(`${signal} received. Shutting down gracefully...`);
            await app.close();
            process.exit(0);
        });
    });

    try {
        await app.listen({ port: config.server.port, host: config.server.host });
        app.log.info(`Integration Gateway running on port ${config.server.port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();