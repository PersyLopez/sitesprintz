import { prisma } from './db.js';

async function test() {
  try {
    console.log('🔌 Attempting to connect to database...');
    // Connect explicitly (optional, query will do it too)
    await prisma.$connect();
    console.log('✅ Connected!');

    // Test query
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Query successful:', result[0]);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

test();

