import mongoose from 'mongoose';
import { env } from './env';
import logger from './logger';

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI);
    logger.info('✅ MongoDB connected', { uri: env.MONGODB_URI.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    logger.error('❌ MongoDB connection error', { error: (err as Error).message });
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
