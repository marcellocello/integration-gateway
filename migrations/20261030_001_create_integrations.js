exports.up = function (knex) {
    return knex.schema.createTable('integrations', (table) => {
        table.increments('id').primary();
        table.string('code', 100).notNullable().unique();
        table.string('name', 255).notNullable();
        table.enum('direction', ['OUTBOUND', 'INBOUND', 'BILATERAL', 'PASSIVE']).notNullable();
        table.enum('transport', ['REST', 'SOAP', 'GRAPHQL', 'WEBSOCKET', 'WEBHOOK', 'WEBVIEW', 'FILE', 'CUSTOM']).notNullable();
        table.enum('execution_mode', ['SYNC', 'ASYNC']).notNullable().defaultTo('SYNC');
        table.json('config').notNullable();
        table.json('metadata').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('integrations');
};