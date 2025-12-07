import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { prisma } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runSchema() {
  console.log('🚀 Running database schema...');

  try {
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    // Execute schema
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }

    console.log('✅ Schema executed successfully!');

    // Verify tables
    const result = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;

    console.log('\n📊 Tables created:');
    result.forEach(row => console.log(`  - ${row.tablename}`));

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error running schema:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runSchema();

