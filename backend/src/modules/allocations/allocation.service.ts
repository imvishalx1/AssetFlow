import mongoose from 'mongoose';
import { Allocation } from './allocation.model';
import { Transfer } from './transfer.model';
import { Asset } from '../assets/asset.model';
import { AppError } from '../../utils/AppError';
import { checkAllocationConflict } from '../../services/conflictEngine';
import { validateStateTransition } from '../../services/stateMachine';
import { logActivity } from '../activityLogs/activityLog.service';

// Allocate an asset (Pillar 2a). Conflict check + asset state change are atomic.
export async function allocateAsset(
  input: { assetId: string; userId: string; expectedReturnDate?: string },
  actorId?: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      await checkAllocationConflict(input.assetId, session);
      const asset = await Asset.findById(input.assetId).session(session);
      if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
      validateStateTransition(asset.status, 'Allocated');

      const allocation = new Allocation({
        assetId: input.assetId,
        userId: input.userId,
        departmentId: asset.departmentId,
        expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
        status: 'Active',
      });
      await allocation.save({ session });

      asset.status = 'Allocated';
      asset.history.push({ type: 'Allocated', by: actorId, at: new Date() });
      await asset.save({ session });

      await logActivity('ASSET_ALLOCATE', `asset:${asset._id}`, actorId, { userId: input.userId });
      return allocation;
    });
  } finally {
    await session.endSession();
  }
}

// Return an allocated asset (Pillar 3 status back to Available).
export async function returnAsset(
  allocationId: string,
  checkInNotes: string | undefined,
  actorId?: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const allocation = await Allocation.findById(allocationId).session(session);
      if (!allocation) throw new AppError(404, 'NOT_FOUND', 'Allocation not found');
      if (allocation.status !== 'Active') {
        throw new AppError(409, 'INVALID_STATE', 'Allocation is not active');
      }
      const asset = await Asset.findById(allocation.assetId).session(session);
      if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
      validateStateTransition(asset.status, 'Available');

      allocation.status = 'Returned';
      allocation.returnedAt = new Date();
      allocation.checkInNotes = checkInNotes;
      await allocation.save({ session });

      asset.status = 'Available';
      asset.history.push({ type: 'Returned', by: actorId, at: new Date() });
      await asset.save({ session });

      await logActivity('ASSET_RETURN', `asset:${asset._id}`, actorId);
      return allocation;
    });
  } finally {
    await session.endSession();
  }
}

// Request a transfer of an active allocation to another user (Pillar 2a fallback).
export async function requestTransfer(
  allocationId: string,
  toUserId: string,
  note: string | undefined,
  actorId?: string,
) {
  const allocation = await Allocation.findById(allocationId);
  if (!allocation) throw new AppError(404, 'NOT_FOUND', 'Allocation not found');
  if (allocation.status !== 'Active') {
    throw new AppError(409, 'INVALID_STATE', 'Allocation is not active');
  }
  const transfer = await Transfer.create({
    assetId: allocation.assetId,
    fromUserId: allocation.userId,
    toUserId,
    requestedBy: actorId,
    note,
    status: 'Requested',
  });
  await logActivity('TRANSFER_REQUEST', `asset:${allocation.assetId}`, actorId);
  return transfer;
}

// Approve/Reject a transfer. On approval, the old allocation is closed and a new
// one opened; the asset stays Allocated (Pillar 3).
export async function reviewTransfer(
  transferId: string,
  decision: 'Approved' | 'Rejected',
  note: string | undefined,
  actorId?: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const transfer = await Transfer.findById(transferId).session(session);
      if (!transfer) throw new AppError(404, 'NOT_FOUND', 'Transfer not found');
      if (transfer.status !== 'Requested') {
        throw new AppError(409, 'INVALID_STATE', 'Transfer has already been reviewed');
      }

      if (decision === 'Rejected') {
        transfer.status = 'Rejected';
        transfer.reviewedBy = actorId ? new mongoose.Types.ObjectId(actorId) : undefined;
        transfer.reviewedAt = new Date();
        await transfer.save({ session });
        return transfer;
      }

      const oldAlloc = await Allocation.findOne({
        assetId: transfer.assetId,
        userId: transfer.fromUserId,
        status: 'Active',
      }).session(session);
      if (oldAlloc) {
        oldAlloc.status = 'Transferred';
        oldAlloc.returnedAt = new Date();
        await oldAlloc.save({ session });
      }

      const asset = await Asset.findById(transfer.assetId).session(session);
      if (asset) {
        asset.history.push({ type: 'Transferred', by: actorId, at: new Date() });
        await asset.save({ session });
      }

      const newAlloc = new Allocation({
        assetId: transfer.assetId,
        userId: transfer.toUserId,
        departmentId: asset?.departmentId ?? null,
        status: 'Active',
      });
      await newAlloc.save({ session });

      transfer.status = 'Approved';
      transfer.reviewedBy = actorId ? new mongoose.Types.ObjectId(actorId) : undefined;
      transfer.reviewedAt = new Date();
      await transfer.save({ session });

      await logActivity('TRANSFER_APPROVE', `asset:${transfer.assetId}`, actorId);
      return transfer;
    });
  } finally {
    await session.endSession();
  }
}
