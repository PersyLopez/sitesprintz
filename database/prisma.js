import { PrismaClient } from '@prisma/client';

// Singleton instance (let allows reassignment in closePrisma)
let prismaInstance = null;

/**
 * Get Prisma Client singleton instance
 * @returns {PrismaClient}
 */
export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }
  return prismaInstance;
}

/**
 * Close Prisma connection
 * Useful for tests and graceful shutdowns
 */
export async function closePrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

// Export singleton instance
export const prisma = getPrisma();

// Default export
export default prisma;
