import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

type Target = 'body' | 'query' | 'params';

// Zod validation factory. On success, replaces req[target] with the parsed data.
// Overwriting params/body with the validated value also narrows their types
// (Express types params as `string | string[]` by default).
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', result.error.flatten()),
      );
    }
    if (target === 'body' || target === 'params') {
      (req as unknown as Record<string, unknown>)[target] = result.data;
    }
    next();
  };
}
