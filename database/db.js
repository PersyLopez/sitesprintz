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

/**
 * Query wrapper for raw SQL queries
 * Provides compatibility with legacy code that uses db.query()
 * @param {string} sql - SQL query string with $1, $2, etc. placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<{rows: Array}>} Result object with rows array
 */
export async function query(sql, params = []) {
  // Convert parameterized query ($1, $2) to Prisma format
  // Prisma uses $1, $2 format directly in template literals
  const result = await prisma.$queryRawUnsafe(sql, ...params);
  return { rows: Array.isArray(result) ? result : [result] };
}

export { prisma };

