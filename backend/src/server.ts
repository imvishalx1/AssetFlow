import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { startCronJobs } from './services/cron.service';
import logger from './config/logger';

export function initSockets(server: import('http').Server): SocketServer {
  const io = new SocketServer(server, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
      credentials: true,
    },
  });

  // Clients join role-based rooms (e.g. 'AssetManager') so the server can
  // target real-time alerts by role.
  io.on('connection', (socket) => {
    socket.on('join', (room: string) => {
      if (typeof room === 'string' && room.length <= 50) socket.join(room);
    });
    socket.on('leave', (room: string) => {
      if (typeof room === 'string') socket.leave(room);
    });
  });

  return io;
}

async function start(): Promise<void> {
  await connectDB();
  startCronJobs();
  const app = createApp();
  const server = createServer(app);
  const io = initSockets(server);
  server.on('error', (err: NodeJS.ErrnoException) => {
    logger.error('Server failed to start', { error: err.message, code: err.code });
    process.exit(1);
  });
  server.listen(env.PORT, () => {
    logger.info(`🚀 AssetFlow API listening on port ${env.PORT}`);
    logger.info('🔌 Socket.io real-time server initialized');
    void io;
  });
}

start().catch((err) => {
  logger.error('Startup failed', { error: (err as Error).message });
  process.exit(1);
});
