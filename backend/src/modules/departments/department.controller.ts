import { Request, Response } from 'express';
import { Department } from './department.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await Department.find()
    .populate('headUserId', 'name email')
    .populate('parentDepartmentId', 'name');
  res.json({ success: true, data: { departments } });
});

export const getDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await Department.findById(req.params.id)
    .populate('headUserId', 'name email')
    .populate('parentDepartmentId', 'name');
  if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found');
  res.json({ success: true, data: { department: dept } });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await Department.create(req.body);
  await logActivity('DEPARTMENT_CREATE', `dept:${dept._id}`, req.user?.id, { name: dept.name });
  res.status(201).json({ success: true, data: { department: dept } });
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found');
  await logActivity('DEPARTMENT_UPDATE', `dept:${dept._id}`, req.user?.id);
  res.json({ success: true, data: { department: dept } });
});
