import { z } from 'zod';
import { mongoId } from '../../utils/validators';

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  parentDepartmentId: mongoId.optional(),
  headUserId: mongoId.optional(),
  isActive: z.boolean().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();
