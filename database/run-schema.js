import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runSchema() {
  console.log('🚀 Running database schema...');
  
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_EuHrPY06FInJ@ep-noisy-truth-ahtau3k1-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Execute schema
    await client.query(schema);
    
    console.log('✅ Schema executed successfully!');
    
    // Verify tables
    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('\n📊 Tables created:');
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));
    
    await client.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error running schema:', error);
    await client.end();
    process.exit(1);
  }
}

runSchema();

