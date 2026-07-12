import { Request, Response } from 'express';
import { ActivityLog } from './activityLog.model';
import { asyncHandler } from '../../utils/asyncHandler';

// Read-only endpoint for the immutable activity audit trail.
export const listLogs = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.action) filter.action = req.query.action;

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 50));

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: { logs, total, page, limit } });
});
