const knex = require('knex');
const config = require('./index');

const db = knex({
    client: 'mysql2',
    connection: {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        typeCast: function (field, next) {
            if (field.type === 'JSON') {
                return JSON.parse(field.string());
            }
            return next();
        },
    },
    pool: {
        min: 2,
        max: config.env === 'production' ? 20 : 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
    },
});

module.exports = db;