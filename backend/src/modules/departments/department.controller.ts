import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany();
  res.json({ success: true, data: { departments } });
});

export const getDepartment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw new AppError(404, 'NOT_FOUND', 'Department not found');
  res.json({ success: true, data: { department: dept } });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await prisma.department.create({
    data: {
      name: req.body.name,
      parentDepartmentId: req.body.parentDepartmentId ?? null,
      headUserId: req.body.headUserId ?? null,
      isActive: req.body.isActive ?? true,
    },
  });
  await logActivity('DEPARTMENT_CREATE', `dept:${dept.id}`, req.user?.id, { name: dept.name });
  res.status(201).json({ success: true, data: { department: dept } });
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const dept = await prisma.department.update({
    where: { id },
    data: req.body,
  });
  await logActivity('DEPARTMENT_UPDATE', `dept:${dept.id}`, req.user?.id);
  res.json({ success: true, data: { department: dept } });
});
