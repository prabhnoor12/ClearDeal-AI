
import { PrismaClient } from '@prisma/client';

export const DATABASE_URL = process.env['DATABASE_URL'] || '';
export const DATABASE_LOG_LEVEL = (process.env['DATABASE_LOG_LEVEL'] as any) || ['error', 'warn'];

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: DATABASE_LOG_LEVEL,
});

/**
 * Connects to the database and verifies the connection.
 */
export async function connectDB() {
  try {
    await prisma.$connect();
    // Optionally run a health check query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Database connection failed:', err);
    throw err;
  }
}

/**
 * Disconnects from the database.
 */
export async function disconnectDB() {
  await prisma.$disconnect();
}
