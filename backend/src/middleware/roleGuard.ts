import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/roles';
import { AppError } from '../utils/AppError';

// Enforces that the authenticated user holds one of the allowed roles.
export function roleGuard(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(
        new AppError(403, 'FORBIDDEN', `This action requires one of: ${allowed.join(', ')}`),
      );
    }
    next();
  };
}
