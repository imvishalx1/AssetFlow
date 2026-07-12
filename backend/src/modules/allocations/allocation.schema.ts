import { z } from 'zod';
import { mongoId } from '../../utils/validators';

export const allocateSchema = z.object({
  assetId: mongoId,
  userId: mongoId.optional(), // defaults to the requesting user
  expectedReturnDate: z.string().optional(),
});

export const returnSchema = z.object({
  checkInNotes: z.string().optional(),
});

export const transferRequestSchema = z.object({
  toUserId: mongoId,
  note: z.string().optional(),
});

export const transferReviewSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
  note: z.string().optional(),
});
