import { Request, Response, NextFunction } from 'express';

// Wraps async route handlers so thrown/rejected errors reach the error middleware.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => Promise<unknown> {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
