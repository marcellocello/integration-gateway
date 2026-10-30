exports.up = function (knex) {
    return knex.schema.createTable('integration_credentials', (table) => {
        table.increments('id').primary();
        table.integer('integration_id').unsigned().notNullable()
            .references('id').inTable('integrations').onDelete('CASCADE');
        table.enum('auth_type', ['API_KEY', 'BASIC', 'BEARER', 'OAUTH2', 'HMAC', 'CUSTOM', 'NONE']).notNullable();
        table.text('credentials').notNullable(); // AES-256-GCM encrypted
        table.timestamp('expires_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('integration_credentials');
};