import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listAudits = asyncHandler(async (_req: Request, res: Response) => {
  const cycles = await prisma.auditCycle.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { cycles } });
});

export const getAudit = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const cycle = await prisma.auditCycle.findUnique({ where: { id }, include: { checklistItems: true } });
  if (!cycle) throw new AppError(404, 'NOT_FOUND', 'Audit cycle not found');
  res.json({ success: true, data: { cycle } });
});

export const createAudit = asyncHandler(async (req: Request, res: Response) => {
  const { name, scopeType, scopeValue, dateRange, auditorIds } = req.body;
  const cycle = await prisma.auditCycle.create({
    data: { name, scopeType, scopeValue, dateRange, auditors: auditorIds ?? [], status: 'Open', locked: false, createdBy: req.user!.id },
  });
  await logActivity('AUDIT_CREATE', `audit:${cycle.id}`, req.user?.id);
  res.status(201).json({ success: true, data: { cycle } });
});

export const updateAuditItem = asyncHandler(async (req: Request, res: Response) => {
  const { id, assetId } = req.params as { id: string; assetId: string };
  const { result, note } = req.body;
  await prisma.checklistItem.upsert({
    where: { id: `${id}_${assetId}` },
    create: { auditCycleId: id, assetId, result, note: note ?? null },
    update: { result, note: note ?? null },
  });
  res.json({ success: true, data: { message: 'Updated' } });
});

export const closeAudit = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const cycle = await prisma.auditCycle.findUnique({ where: { id } });
  if (!cycle) throw new AppError(404, 'NOT_FOUND', 'Audit cycle not found');
  if (cycle.locked) throw new AppError(409, 'ALREADY_LOCKED', 'Already closed');
  await prisma.auditCycle.update({ where: { id }, data: { status: 'Closed', locked: true } });
  await logActivity('AUDIT_CLOSE', `audit:${id}`, req.user?.id);
  res.json({ success: true, data: { cycle: { id, status: 'Closed', locked: true } } });
});

export const createAuditHandler = createAudit;
export const closeAuditHandler = closeAudit;
export const updateAuditItemHandler = updateAuditItem;
