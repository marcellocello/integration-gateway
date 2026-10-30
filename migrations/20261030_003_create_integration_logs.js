exports.up = function (knex) {
    return knex.schema.createTable('integration_logs', (table) => {
        table.bigIncrements('id').primary();
        table.integer('integration_id').unsigned().notNullable()
            .references('id').inTable('integrations');
        table.string('correlation_id', 100).nullable();
        table.enum('direction', ['OUTBOUND', 'INBOUND']).notNullable();
        table.text('request_url').nullable();
        table.string('request_method', 10).nullable();
        table.json('request_headers').nullable();
        table.text('request_body', 'longtext').nullable();
        table.integer('response_status').nullable();
        table.json('response_headers').nullable();
        table.text('response_body', 'longtext').nullable();
        table.enum('status', ['SUCCESS', 'FAILED', 'TIMEOUT', 'RETRY']).notNullable();
        table.text('error_message').nullable();
        table.integer('duration_ms').nullable();
        table.integer('retry_attempt').defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());

        // Indexes
        table.index(['integration_id', 'created_at']);
        table.index('correlation_id');
        table.index(['status', 'created_at']);
        table.index('created_at');
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('integration_logs');
};