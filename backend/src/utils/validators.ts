import { z } from 'zod';

export const mongoId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
