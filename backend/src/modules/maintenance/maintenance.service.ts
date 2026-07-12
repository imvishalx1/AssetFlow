import mongoose from 'mongoose';
import { Maintenance } from './maintenance.model';
import { changeAssetStatus } from '../assets/asset.service';
import { validateStateTransition } from '../../services/stateMachine';
import { Asset } from '../assets/asset.model';
import { AppError } from '../../utils/AppError';
import { logActivity } from '../activityLogs/activityLog.service';

// Raise a maintenance request (PRD FR-7.1). Any authenticated user may raise.
export async function raiseMaintenanceRequest(
  input: { assetId: string; description: string; priority?: 'Low' | 'Medium' | 'High' | 'Critical'; photos?: string[] },
  actorId?: string,
) {
  const request = await Maintenance.create({
    assetId: input.assetId,
    raisedBy: actorId,
    description: input.description,
    priority: input.priority ?? 'Medium',
    photos: input.photos ?? [],
    status: 'Pending',
  });
  await logActivity('MAINTENANCE_RAISE', `asset:${input.assetId}`, actorId, { requestId: request._id });
  return request;
}

// Approve a request (PRD FR-7.2/7.3). Flips the linked asset to 'Under Maintenance'
// via the strict state machine (Pillar 3).
export async function approveMaintenanceRequest(
  requestId: string,
  technician: string | undefined,
  actorId?: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const request = await Maintenance.findById(requestId).session(session);
      if (!request) throw new AppError(404, 'NOT_FOUND', 'Maintenance request not found');
      if (request.status !== 'Pending') {
        throw new AppError(409, 'INVALID_STATE', 'Maintenance request has already been reviewed');
      }

      const asset = await Asset.findById(request.assetId).session(session);
      if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
      validateStateTransition(asset.status, 'Under Maintenance');

      request.status = 'Approved';
      request.technician = technician;
      request.assignedAt = new Date();
      await request.save({ session });

      await changeAssetStatus(request.assetId.toString(), 'Under Maintenance', 'Maintenance approved', actorId);

      await logActivity('MAINTENANCE_APPROVE', `asset:${request.assetId}`, actorId, {
        requestId: request._id,
      });
      return request;
    });
  } finally {
    await session.endSession();
  }
}

// Resolve a request (PRD FR-7.3). Flips the linked asset back to 'Available' (Pillar 3).
export async function resolveMaintenanceRequest(
  requestId: string,
  notes: string | undefined,
  actorId?: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const request = await Maintenance.findById(requestId).session(session);
      if (!request) throw new AppError(404, 'NOT_FOUND', 'Maintenance request not found');
      if (request.status === 'Pending' || request.status === 'Rejected') {
        throw new AppError(409, 'INVALID_STATE', 'Maintenance request must be approved before resolution');
      }

      const asset = await Asset.findById(request.assetId).session(session);
      if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
      validateStateTransition(asset.status, 'Available');

      request.status = 'Resolved';
      request.resolvedAt = new Date();
      await request.save({ session });

      await changeAssetStatus(request.assetId.toString(), 'Available', notes ?? 'Maintenance resolved', actorId);

      await logActivity('MAINTENANCE_RESOLVE', `asset:${request.assetId}`, actorId, {
        requestId: request._id,
      });
      return request;
    });
  } finally {
    await session.endSession();
  }
}

export async function listMaintenanceRequests() {
  return Maintenance.find().populate('assetId', 'tag name').populate('raisedBy', 'name').sort({ createdAt: -1 });
}

export async function getMaintenanceRequest(id: string) {
  const request = await Maintenance.findById(id)
    .populate('assetId', 'tag name')
    .populate('raisedBy', 'name');
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Maintenance request not found');
  return request;
}
