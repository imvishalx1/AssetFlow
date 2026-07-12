import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './user.service';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await service.listUsers(req.user?.role, req.user?.departmentId);
  res.json({ success: true, data: { users } });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.getUserById(req.params.id as string);
  res.json({ success: true, data: { user } });
});

export const promoteUser = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role: 'DepartmentHead' | 'AssetManager' };
  const user = await service.promoteUser(req.params.id as string, role, req.user?.id);
  res.json({ success: true, data: { user } });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.updateUser(req.params.id as string, req.body, req.user?.id);
  res.json({ success: true, data: { user } });
});
