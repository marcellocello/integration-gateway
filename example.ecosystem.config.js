module.exports = {
    apps: [
        {
            name: 'integration-gateway-api',
            script: 'src/server.js',
            instances: '2',
            exec_mode: 'cluster',
            watch: false,
            max_memory_restart: '500M',
            kill_timeout: 5000,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'gateway-worker',
            script: 'src/queue/worker-runner.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '500M',
            kill_timeout: 10000,
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};