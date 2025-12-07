import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prisma } from './db.js';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_DIR = path.join(__dirname, '..', 'public', 'users');
const BATCH_SIZE = 50; // Process 50 users at a time for safety

/**
 * Main migration function
 */
async function migrateUsers() {
  console.log('🚀 Starting users migration...');
  console.log('📁 Source directory:', USERS_DIR);

  // Tracking variables
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  try {
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Step 1: Get all user JSON files
    const files = await fs.readdir(USERS_DIR);
    const userFiles = files.filter(f => f.endsWith('.json'));

    console.log(`📊 Found ${userFiles.length} user files to migrate\n`);

    // Step 2: Process files in batches
    for (let i = 0; i < userFiles.length; i += BATCH_SIZE) {
      const batch = userFiles.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(userFiles.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} users)`);

      // Step 3: Process each user in the batch
      for (const file of batch) {
        const filePath = path.join(USERS_DIR, file);

        try {
          // Read the JSON file
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const user = JSON.parse(fileContent);

          // Validate: Must have email and password
          if (!user.email || !user.password) {
            console.warn(`⚠️  Skipping ${file}: Missing email or password`);
            skippedCount++;

            // Log to migration_log table
            // We use executeRawUnsafe as we don't need a return value
            try {
              await prisma.$executeRawUnsafe(
                'INSERT INTO migration_log (migration_type, source_path, status, error_message) VALUES ($1, $2, $3, $4)',
                'users', filePath, 'skipped', 'Missing required fields (email or password)'
              );
            } catch (ignore) { /* Table might not exist, ignore log error */ }
            continue;
          }

          // Insert user into database
          // ON CONFLICT means: if email already exists, update instead of fail
          // Using queryRawUnsafe because we need the RETURNING id
          const result = await prisma.$queryRawUnsafe(`
            INSERT INTO users (
              email, 
              password_hash, 
              role, 
              status,
              stripe_customer_id,
              subscription_status,
              subscription_plan,
              subscription_id,
              created_at,
              last_login,
              json_file_path
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (email) DO UPDATE SET
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              status = EXCLUDED.status,
              stripe_customer_id = EXCLUDED.stripe_customer_id,
              subscription_status = EXCLUDED.subscription_status,
              subscription_plan = EXCLUDED.subscription_plan,
              subscription_id = EXCLUDED.subscription_id,
              updated_at = NOW()
            RETURNING id, email
          `,
            user.email,
            user.password, // Already hashed with bcrypt
            user.role || 'user',
            user.status || 'active',
            user.stripeCustomerId || null,
            user.subscriptionStatus || null,
            user.subscriptionPlan || null,
            user.subscriptionId || null,
            user.createdAt ? new Date(user.createdAt) : new Date(),
            user.lastLogin ? new Date(user.lastLogin) : null,
            filePath
          );

          if (result && result.length > 0) {
            console.log(`✅ Migrated: ${user.email} → ID: ${result[0].id}`);
            successCount++;

            // Log success to migration_log table
            try {
              await prisma.$executeRawUnsafe(
                'INSERT INTO migration_log (migration_type, source_path, target_id, status) VALUES ($1, $2, $3, $4)',
                'users', filePath, result[0].id, 'success'
              );
            } catch (ignore) { /* Ignore log error */ }
          }

        } catch (error) {
          console.error(`❌ Error migrating ${file}:`, error.message);
          errorCount++;

          // Log error to migration_log table
          try {
            await prisma.$executeRawUnsafe(
              'INSERT INTO migration_log (migration_type, source_path, status, error_message) VALUES ($1, $2, $3, $4)',
              'users', filePath, 'failed', error.message
            );
          } catch (ignore) { /* Ignore log error */ }
        }
      }

      console.log(''); // Empty line for readability
    }

    // Step 4: Print summary
    console.log('='.repeat(60));
    console.log('📊 MIGRATION SUMMARY - USERS');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`📝 Total: ${userFiles.length}`);
    console.log('='.repeat(60));

    // Step 5: Verify in database
    const count = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM users');
    console.log(`\n🔍 Database verification: ${count[0].count} users in database`);

    // Show a few example users
    const examples = await prisma.$queryRawUnsafe('SELECT email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('\n📋 Recent users in database:');
    examples.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Created: ${user.created_at}`);
    });

    await prisma.$disconnect();

    return { successCount, errorCount, skippedCount };

  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    await prisma.$disconnect();
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUsers()
    .then((results) => {
      console.log('\n✅ Users migration complete!');
      if (results.errorCount > 0) {
        console.log('\n⚠️  Some users failed to migrate. Check migration_log table for details.');
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateUsers };

