import dotenv from 'dotenv';
import { prisma } from './prisma.js';

dotenv.config();

// Helper function: Check connection
export async function testConnection() {
  try {
    // Use Prisma to test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

export { prisma };

