import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listAllocations = asyncHandler(async (req: Request, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.user?.role === 'DepartmentHead' && req.user.departmentId) where.departmentId = req.user.departmentId;
  if (req.query.status) where.status = req.query.status;
  if (req.query.assetId) where.assetId = req.query.assetId;
  const allocations = await prisma.allocation.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { allocations } });
});

export const listTransfers = asyncHandler(async (_req: Request, res: Response) => {
  const transfers = await prisma.transfer.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { transfers } });
});

export const createAllocation = asyncHandler(async (req: Request, res: Response) => {
  const { assetId, userId, expectedReturnDate } = req.body;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
  if (asset.status === 'Allocated') throw new AppError(409, 'ALLOCATION_CONFLICT', 'Asset already allocated');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const allocation = await prisma.allocation.create({
    data: { assetId, userId, expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null, status: 'Active' },
  });
  await prisma.asset.update({ where: { id: assetId }, data: { status: 'Allocated' } });
  await logActivity('ASSET_ALLOCATE', `asset:${assetId}`, req.user?.id, { userId });
  res.status(201).json({ success: true, data: { allocation } });
});

export const returnAllocation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const alloc = await prisma.allocation.findUnique({ where: { id } });
  if (!alloc) throw new AppError(404, 'NOT_FOUND', 'Allocation not found');
  if (alloc.status !== 'Active') throw new AppError(409, 'INVALID_STATE', 'Not active');
  await prisma.allocation.update({ where: { id }, data: { status: 'Returned', checkInNotes: req.body.checkInNotes ?? null } });
  await prisma.asset.update({ where: { id: alloc.assetId }, data: { status: 'Available' } });
  await logActivity('ASSET_RETURN', `asset:${alloc.assetId}`, req.user?.id);
  res.json({ success: true, data: { allocation: { id } } });
});

export const requestTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { toUserId, note } = req.body;
  const id = req.params.id as string;
  const alloc = await prisma.allocation.findUnique({ where: { id } });
  if (!alloc) throw new AppError(404, 'NOT_FOUND', 'Allocation not found');
  const transfer = await prisma.transfer.create({
    data: { assetId: alloc.assetId, fromUserId: alloc.userId, toUserId, requestedBy: req.user!.id, status: 'Requested', note: note ?? null },
  });
  await logActivity('TRANSFER_REQUEST', `asset:${alloc.assetId}`, req.user?.id);
  res.status(201).json({ success: true, data: { transfer } });
});

export const reviewTransfer = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { decision } = req.body;
  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) throw new AppError(404, 'NOT_FOUND', 'Transfer not found');
  if (decision === 'Approved') {
    await prisma.allocation.updateMany({ where: { assetId: transfer.assetId, status: 'Active' }, data: { status: 'Transferred' } });
    await prisma.allocation.create({ data: { assetId: transfer.assetId, userId: transfer.toUserId, status: 'Active' } });
  }
  await prisma.transfer.update({ where: { id }, data: { status: decision, reviewedBy: req.user!.id, reviewedAt: new Date() } });
  await logActivity('TRANSFER_APPROVE', `asset:${transfer.assetId}`, req.user?.id);
  res.json({ success: true, data: { transfer: { id, status: decision } } });
});

// Aliases for route compatibility
export const allocate = createAllocation;
export const requestTransferHandler = requestTransfer;
export const reviewTransferHandler = reviewTransfer;
