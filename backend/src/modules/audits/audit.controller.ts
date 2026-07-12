import { Request, Response } from 'express';
import { AuditCycle } from './audit.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { createAudit, updateAuditItem, closeAudit } from './audit.service';

export const listAudits = asyncHandler(async (_req: Request, res: Response) => {
  const cycles = await AuditCycle.find().populate('auditors', 'name');
  res.json({ success: true, data: { cycles } });
});

export const getAudit = asyncHandler(async (req: Request, res: Response) => {
  const cycle = await AuditCycle.findById(req.params.id).populate('items.assetId', 'tag name');
  if (!cycle) throw new AppError(404, 'NOT_FOUND', 'Audit cycle not found');
  res.json({ success: true, data: { cycle } });
});

export const createAuditHandler = asyncHandler(async (req: Request, res: Response) => {
  const cycle = await createAudit(req.body, req.user?.id);
  res.status(201).json({ success: true, data: { cycle } });
});

export const updateAuditItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const cycle = await updateAuditItem(
    req.params.id as string,
    req.params.assetId as string,
    req.body.result,
    req.body.note,
  );
  res.json({ success: true, data: { cycle } });
});

export const closeAuditHandler = asyncHandler(async (req: Request, res: Response) => {
  const cycle = await closeAudit(req.params.id as string, req.user?.id);
  res.json({ success: true, data: { cycle } });
});
