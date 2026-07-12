import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.user?.role === 'DepartmentHead' && req.user.departmentId) where.departmentId = req.user.departmentId;
  const users = await prisma.user.findMany({ where, select: { id: true, name: true, email: true, role: true, departmentId: true, status: true } });
  res.json({ success: true, data: { users } });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, departmentId: true, status: true } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json({ success: true, data: { user } });
});

export const promoteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { role } = req.body as { role: 'DepartmentHead' | 'AssetManager' };
  const user = await prisma.user.update({ where: { id }, data: { role } });
  await logActivity('USER_PROMOTE', `user:${id}`, req.user?.id, { role });
  res.json({ success: true, data: { user } });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = await prisma.user.update({ where: { id }, data: req.body });
  await logActivity('USER_UPDATE', `user:${id}`, req.user?.id);
  res.json({ success: true, data: { user } });
});
