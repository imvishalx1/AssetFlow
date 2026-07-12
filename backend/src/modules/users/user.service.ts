import { User } from './user.model';
import { AppError } from '../../utils/AppError';
import { mongoId } from '../../utils/validators';
import { logActivity } from '../activityLogs/activityLog.service';

// Employee Directory — Admin/Asset Manager/Department Head can list users.
// Department Heads are scoped to their own department only.
export async function listUsers(role?: string, departmentId?: string | null) {
  const filter: Record<string, unknown> = {};
  if (role === 'Department Head' && departmentId) {
    filter.departmentId = departmentId;
  }
  return User.find(filter).populate('departmentId', 'name').select('-passwordHash');
}

export async function getUserById(id: string) {
  const user = await User.findById(id).populate('departmentId', 'name').select('-passwordHash');
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return user;
}

// Admin-only role promotion (Pillar 1). Only to Department Head / Asset Manager.
export async function promoteUser(id: string, role: 'Department Head' | 'Asset Manager', actorId?: string) {
  if (!mongoId.safeParse(id).success) throw new AppError(404, 'NOT_FOUND', 'User not found');
  const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  await logActivity('USER_PROMOTE', `user:${user._id}`, actorId, { role });
  return user;
}

export async function updateUser(id: string, updates: Record<string, unknown>, actorId?: string) {
  if (!mongoId.safeParse(id).success) throw new AppError(404, 'NOT_FOUND', 'User not found');
  const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash');
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  await logActivity('USER_UPDATE', `user:${user._id}`, actorId);
  return user;
}
