import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listMaintenance = asyncHandler(async (_req: Request, res: Response) => {
  const requests = await prisma.maintenanceRequest.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { requests } });
});

export const getMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const request = await prisma.maintenanceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Maintenance request not found');
  res.json({ success: true, data: { request } });
});

export const raiseMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { assetId, description, priority } = req.body;
  const request = await prisma.maintenanceRequest.create({
    data: { assetId, raisedBy: req.user!.id, description, priority: priority ?? 'Medium', photos: [], status: 'Pending' },
  });
  await logActivity('MAINTENANCE_RAISE', `asset:${assetId}`, req.user?.id);
  res.status(201).json({ success: true, data: { request } });
});

export const updateMaintenanceStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status, technician } = req.body;
  const data: Record<string, unknown> = { status };
  if (technician) data.technician = technician;
  if (status === 'InProgress' || status === 'TechnicianAssigned') data.assignedAt = new Date();
  if (status === 'Resolved') data.resolvedAt = new Date();
  const request = await prisma.maintenanceRequest.update({ where: { id }, data });
  if (status === 'Approved' || status === 'InProgress') {
    await prisma.asset.updateMany({ where: { id: request.assetId }, data: { status: 'UnderMaintenance' as never } });
  }
  if (status === 'Resolved') {
    await prisma.asset.updateMany({ where: { id: request.assetId }, data: { status: 'Available' as never } });
  }
  await logActivity('MAINTENANCE_STATUS', `maintenance:${id}`, req.user?.id, { status });
  res.json({ success: true, data: { request } });
});

export const approveMaintenance = updateMaintenanceStatus;
export const resolveMaintenance = updateMaintenanceStatus;
