import { z } from 'zod';
import { mongoId } from '../../utils/validators';

export const raiseSchema = z.object({
  assetId: mongoId,
  description: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  photos: z.array(z.string()).optional(),
});

export const approveSchema = z.object({
  technician: z.string().optional(),
});

export const resolveSchema = z.object({
  notes: z.string().optional(),
});
