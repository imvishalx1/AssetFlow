import { createServer } from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { startCronJobs } from './services/cron.service';
import logger from './config/logger';

async function start(): Promise<void> {
  await connectDB();
  startCronJobs();
  const app = createApp();
  const server = createServer(app);
  server.listen(env.PORT, () => {
    logger.info(`🚀 AssetFlow API listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  logger.error('Startup failed', { error: (err as Error).message });
  process.exit(1);
});
