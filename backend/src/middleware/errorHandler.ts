import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';

// Central error handler -> standard JSON shape: { success:false, error:{code,message,fields?} }
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    _next(err);
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', fields: err.flatten() },
    });
    return;
  }

  if (err instanceof AppError) {
    const errorObj: Record<string, unknown> = { code: err.code, message: err.message };
    if (err.fields) errorObj.fields = err.fields;
    if (err.meta) Object.assign(errorObj, err.meta);
    res.status(err.statusCode).json({ success: false, error: errorObj });
    return;
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
