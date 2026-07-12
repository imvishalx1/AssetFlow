import { Request, Response } from 'express';
import { User } from './user.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

// Employee Directory — Admin/Asset Manager/Department Head can list users.
// Department Heads are scoped to their own department only.
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.user?.role === 'Department Head' && req.user.departmentId) {
    filter.departmentId = req.user.departmentId;
  }
  const users = await User.find(filter).populate('departmentId', 'name').select('-passwordHash');
  res.json({ success: true, data: { users } });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).populate('departmentId', 'name').select('-passwordHash');
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json({ success: true, data: { user } });
});

// Admin-only role promotion (Pillar 1). Only to Department Head / Asset Manager.
export const promoteUser = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role: 'Department Head' | 'Asset Manager' };
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select(
    '-passwordHash',
  );
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  await logActivity('USER_PROMOTE', `user:${user._id}`, req.user?.id, { role });
  res.json({ success: true, data: { user } });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select(
    '-passwordHash',
  );
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  await logActivity('USER_UPDATE', `user:${user._id}`, req.user?.id);
  res.json({ success: true, data: { user } });
});
