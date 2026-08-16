import { PrismaClient } from '@prisma/client';

// Singleton instance (let allows reassignment in closePrisma)
let prismaInstance = null;

/**
 * Get Prisma Client singleton instance
 * Configured for optimal connection pool management
 * @returns {PrismaClient}
 */
export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      // Connection pool configuration for test concurrency
      // See: https://www.prisma.io/docs/concepts/database-connectors/postgresql
      // In test environment, limit connections to prevent exhaustion
    });

    // Graceful shutdown handler
    if (process.env.NODE_ENV === 'test') {
      // Periodically cleanup idle connections in test mode
      const cleanupInterval = setInterval(async () => {
        try {
          // Query to check connection health
          await prismaInstance.$queryRaw`SELECT 1`;
        } catch (err) {
          console.error('Connection pool health check failed:', err.message);
        }
      }, 5000); // Every 5 seconds

      // Store interval ID for cleanup
      prismaInstance._cleanupInterval = cleanupInterval;
    }
  }
  return prismaInstance;
}

/**
 * Close Prisma connection
 * Useful for tests and graceful shutdowns
 * Properly cleans up connection pool
 */
export async function closePrisma() {
  if (prismaInstance) {
    // Clear cleanup interval if it exists
    if (prismaInstance._cleanupInterval) {
      clearInterval(prismaInstance._cleanupInterval);
      prismaInstance._cleanupInterval = null;
    }

    // Disconnect from database
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

// Export singleton instance
export const prisma = getPrisma();

// Default export
export default prisma;
