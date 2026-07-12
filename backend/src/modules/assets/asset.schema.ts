import { z } from 'zod';
import { mongoId } from '../../utils/validators';

export const createAssetSchema = z.object({
  name: z.string().min(1),
  categoryId: mongoId,
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().optional(), // ISO date string; converted to Date
  acquisitionCost: z.number().int().min(0), // Pillar 4: integer only, analytics/ranking
  condition: z.enum(['New', 'Good', 'Fair', 'Poor']).optional(),
  location: z.string().optional(),
  isBookable: z.boolean().optional(),
  departmentId: mongoId.optional(),
});

export const updateAssetStatusSchema = z.object({
  status: z.enum([
    'Available',
    'Allocated',
    'Reserved',
    'Under Maintenance',
    'Lost',
    'Retired',
    'Disposed',
  ]),
  note: z.string().optional(),
});
