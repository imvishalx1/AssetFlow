import { prisma } from '../lib/prisma';
import logger from './logger';

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected (Neon via Prisma)');
  } catch (err) {
    logger.error('❌ Database connection error', { error: (err as Error).message });
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}
