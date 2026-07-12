import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './maintenance.service';

export const listMaintenance = asyncHandler(async (_req: Request, res: Response) => {
  const requests = await service.listMaintenanceRequests();
  res.json({ success: true, data: { requests } });
});

export const getMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const request = await service.getMaintenanceRequest(req.params.id as string);
  res.json({ success: true, data: { request } });
});

export const raiseMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    assetId: string;
    description: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    photos?: string[];
  };
  const request = await service.raiseMaintenanceRequest(body, req.user?.id);
  res.status(201).json({ success: true, data: { request } });
});

export const approveMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { technician } = req.body as { technician?: string };
  const request = await service.approveMaintenanceRequest(req.params.id as string, technician, req.user?.id);
  res.json({ success: true, data: { request } });
});

export const resolveMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const { notes } = req.body as { notes?: string };
  const request = await service.resolveMaintenanceRequest(req.params.id as string, notes, req.user?.id);
  res.json({ success: true, data: { request } });
});
