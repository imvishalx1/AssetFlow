import mongoose from 'mongoose';
import { AuditCycle } from './audit.model';
import { Asset } from '../assets/asset.model';
import { AppError } from '../../utils/AppError';
import { validateStateTransition } from '../../services/stateMachine';
import { logActivity } from '../activityLogs/activityLog.service';

// Builds an audit cycle with one Pending item per scoped asset.
type CreateAuditInput = {
  name: string;
  scopeType: 'Department' | 'Location';
  scopeValue: string;
  dateRange: { start: string; end: string };
  auditorIds?: string[];
  assetIds?: string[];
};

export async function createAudit(input: CreateAuditInput, actorId?: string) {
  let assetIds = input.assetIds ?? [];
  if (!assetIds.length) {
    const filter: { departmentId?: mongoose.Types.ObjectId; location?: string } = {};
    if (input.scopeType === 'Department') {
      filter.departmentId = new mongoose.Types.ObjectId(input.scopeValue);
    } else {
      filter.location = input.scopeValue;
    }
    const assets = await Asset.find(filter).select('_id');
    assetIds = assets.map((a) => a._id.toString());
  }

  const cycle = await AuditCycle.create({
    name: input.name,
    scopeType: input.scopeType,
    scopeValue: input.scopeValue,
    dateRange: { start: new Date(input.dateRange.start), end: new Date(input.dateRange.end) },
    auditors: (input.auditorIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
    status: 'Open',
    locked: false,
    items: assetIds.map((id) => ({
      assetId: new mongoose.Types.ObjectId(id),
      result: 'Pending' as const,
    })),
  });
  await logActivity('AUDIT_CREATE', `audit:${cycle._id}`, actorId);
  return cycle;
}

// Updates a single audit item result (blocks writes once locked).
export async function updateAuditItem(
  auditId: string,
  assetId: string,
  result: 'Verified' | 'Missing' | 'Damaged',
  note: string | undefined,
) {
  const cycle = await AuditCycle.findById(auditId);
  if (!cycle) throw new AppError(404, 'NOT_FOUND', 'Audit cycle not found');
  if (cycle.locked) throw new AppError(409, 'AUDIT_LOCKED', 'Audit cycle is locked');

  const item = cycle.items.find((i) => i.assetId.toString() === String(assetId));
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Asset is not part of this audit');

  item.result = result;
  item.note = note;
  await cycle.save(); // service-layer lock guard (model hook removed for TS compat)
  return cycle;
}

// Closes an audit: assets found Missing transition to Lost (Pillar 3), then the
// cycle is locked immutable.
export async function closeAudit(auditId: string, actorId?: string) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const cycle = await AuditCycle.findById(auditId).session(session);
      if (!cycle) throw new AppError(404, 'NOT_FOUND', 'Audit cycle not found');
      if (cycle.locked) throw new AppError(409, 'AUDIT_LOCKED', 'Audit cycle already closed');

      for (const item of cycle.items) {
        if (item.result === 'Missing') {
          const asset = await Asset.findById(item.assetId).session(session);
          if (asset && asset.status !== 'Lost') {
            validateStateTransition(asset.status, 'Lost');
            asset.status = 'Lost';
            asset.history.push({ type: 'AuditMissing', at: new Date() });
            await asset.save({ session });
          }
        }
      }

      cycle.status = 'Closed';
      cycle.locked = true;
      await cycle.save({ session });
      await logActivity('AUDIT_CLOSE', `audit:${cycle._id}`, actorId);
      return cycle;
    });
  } finally {
    await session.endSession();
  }
}
