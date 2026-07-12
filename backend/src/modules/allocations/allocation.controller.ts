import { Request, Response } from 'express';
import { Allocation } from './allocation.model';
import { Transfer } from './transfer.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  allocateAsset,
  returnAsset,
  requestTransfer,
  reviewTransfer,
} from './allocation.service';

export const listAllocations = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.user?.role === 'Department Head' && req.user.departmentId) {
    filter.departmentId = req.user.departmentId;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assetId) filter.assetId = req.query.assetId;

  const allocations = await Allocation.find(filter)
    .populate('assetId', 'tag name')
    .populate('userId', 'name email');
  res.json({ success: true, data: { allocations } });
});

export const allocate = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.body.userId as string) ?? req.user?.id;
  if (!userId) throw new AppError(400, 'BAD_REQUEST', 'userId is required');
  const allocation = await allocateAsset(
    {
      assetId: req.body.assetId,
      userId,
      expectedReturnDate: req.body.expectedReturnDate,
    },
    req.user?.id,
  );
  res.status(201).json({ success: true, data: { allocation } });
});

export const returnAllocation = asyncHandler(async (req: Request, res: Response) => {
  const allocation = await returnAsset(req.params.id as string, req.body.checkInNotes, req.user?.id);
  res.json({ success: true, data: { allocation } });
});

export const requestTransferHandler = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await requestTransfer(
    req.params.id as string,
    req.body.toUserId,
    req.body.note,
    req.user?.id,
  );
  res.status(201).json({ success: true, data: { transfer } });
});

export const listTransfers = asyncHandler(async (_req: Request, res: Response) => {
  const transfers = await Transfer.find()
    .populate('assetId', 'tag name')
    .populate('fromUserId', 'name')
    .populate('toUserId', 'name');
  res.json({ success: true, data: { transfers } });
});

export const reviewTransferHandler = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await reviewTransfer(
    req.params.id as string,
    req.body.decision,
    req.body.note,
    req.user?.id,
  );
  res.json({ success: true, data: { transfer } });
});
