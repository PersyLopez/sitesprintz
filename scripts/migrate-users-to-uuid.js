
import { pool } from '../database/db.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: Users ID Integer -> UUID');
        await client.query('BEGIN');

        // 1. Add new UUID columns
        console.log('Adding temporary UUID columns...');
        await client.query(`
      ALTER TABLE users ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
      ALTER TABLE sites ADD COLUMN uuid_user_id UUID;
      ALTER TABLE booking_tenants ADD COLUMN uuid_user_id UUID;
    `);

        // 2. Populate new columns
        console.log('Populating UUID columns...');
        // For users, we already have defaults, but let's ensure they are set (gen_random_uuid handles it)

        // Update sites
        await client.query(`
      UPDATE sites 
      SET uuid_user_id = u.uuid_id 
      FROM users u 
      WHERE sites.user_id = u.id
    `);

        // Update booking_tenants
        await client.query(`
      UPDATE booking_tenants 
      SET uuid_user_id = u.uuid_id 
      FROM users u 
      WHERE booking_tenants.user_id = u.id
    `);

        // 3. Drop constraints and old columns
        console.log('Dropping old constraints and columns...');

        // Drop foreign keys first
        await client.query(`
      ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_user_id_fkey;
      ALTER TABLE booking_tenants DROP CONSTRAINT IF EXISTS booking_tenants_user_id_fkey;
    `);

        // Drop primary key on users (referencing columns are now free)
        await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;
    `);

        // Drop old integer columns
        await client.query(`
      ALTER TABLE users DROP COLUMN id;
      ALTER TABLE sites DROP COLUMN user_id;
      ALTER TABLE booking_tenants DROP COLUMN user_id;
    `);

        // 4. Rename new columns and restore constraints
        console.log('Renaming columns and restoring constraints...');

        // Rename users.uuid_id -> id
        await client.query(`ALTER TABLE users RENAME COLUMN uuid_id TO id`);

        // Rename sites.uuid_user_id -> user_id
        await client.query(`ALTER TABLE sites RENAME COLUMN uuid_user_id TO user_id`);

        // Rename booking_tenants.uuid_user_id -> user_id
        await client.query(`ALTER TABLE booking_tenants RENAME COLUMN uuid_user_id TO user_id`);

        // Add Primary Key
        await client.query(`ALTER TABLE users ADD PRIMARY KEY (id)`);

        // Add Foreign Keys
        await client.query(`
      ALTER TABLE sites 
      ADD CONSTRAINT sites_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

        await client.query(`
      ALTER TABLE booking_tenants 
      ADD CONSTRAINT booking_tenants_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
