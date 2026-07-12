import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';
import { parseCookies } from './utils/cookies';

// Minimal cookie parser (avoids extra dependency) — populates req.cookies.
function cookieParser(req: Request, _res: Response, next: NextFunction): void {
  const cookies = req.headers.cookie ? parseCookies(req.headers.cookie) : {};
  (req as Request & { cookies: Record<string, string> }).cookies = cookies;
  next();
}

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: [...env.CORS_ORIGINS.split(',').map((s) => s.trim()), env.CLIENT_URL],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(mongoSanitize());
  app.use(cookieParser);
  if (env.NODE_ENV === 'development') app.use(morgan('dev'));

  const globalLimiter = rateLimit({ windowMs: 60_000, max: 150 });
  app.use('/api', globalLimiter);

  const authLimiter = rateLimit({ windowMs: 60_000, max: 10, skipSuccessfulRequests: true });
  app.use('/api/v1/auth', authLimiter);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/v1', apiRouter);

  if (env.SENTRY_DSN) {
    Sentry.init({ dsn: env.SENTRY_DSN });
    Sentry.setupExpressErrorHandler(app);
  }
  app.use(errorHandler);

  return app;
}
