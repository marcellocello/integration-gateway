exports.up = function (knex) {
    return knex.schema.createTable('integration_jobs', (table) => {
        table.bigIncrements('id').primary();
        table.string('job_id', 100).notNullable().unique();
        table.integer('integration_id').unsigned().notNullable()
            .references('id').inTable('integrations');
        table.string('correlation_id', 100).nullable();
        table.enum('status', ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING']).notNullable().defaultTo('QUEUED');
        table.integer('priority').defaultTo(5);
        table.json('payload').nullable();
        table.json('result').nullable();
        table.text('error_message').nullable();
        table.integer('attempts').defaultTo(0);
        table.string('callback_url', 500).nullable();
        table.timestamp('queued_at').defaultTo(knex.fn.now());
        table.timestamp('started_at').nullable();
        table.timestamp('completed_at').nullable();

        table.index('job_id');
        table.index(['status', 'queued_at']);
        table.index('correlation_id');
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('integration_jobs');
};