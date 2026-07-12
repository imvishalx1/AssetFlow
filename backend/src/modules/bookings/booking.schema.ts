import { z } from 'zod';
import { mongoId } from '../../utils/validators';

export const createBookingSchema = z.object({
  resourceId: mongoId,
  title: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
});
