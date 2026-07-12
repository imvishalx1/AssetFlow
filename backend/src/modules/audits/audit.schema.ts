import { z } from 'zod';
import { mongoId } from '../../utils/validators';

export const createAuditSchema = z.object({
  name: z.string().min(1),
  scopeType: z.enum(['Department', 'Location']),
  scopeValue: z.string().min(1),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  auditorIds: z.array(mongoId).optional(),
  assetIds: z.array(mongoId).optional(),
});

export const auditItemSchema = z.object({
  result: z.enum(['Verified', 'Missing', 'Damaged']),
  note: z.string().optional(),
});
