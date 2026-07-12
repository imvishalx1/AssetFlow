import { z } from 'zod';
import { mongoId } from '../../utils/validators';

// Promotion is restricted to Department Head / Asset Manager only (Pillar 1:
// no self-elevation, no promotion to Admin via the API).
export const promoteSchema = z.object({
  role: z.enum(['Department Head', 'Asset Manager']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  departmentId: mongoId.optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});
