import mongoose from 'mongoose';
import { Asset } from './asset.model';
import { generateAssetTag } from '../../utils/assetTagGenerator';
import { validateStateTransition } from '../../services/stateMachine';
import { logActivity } from '../activityLogs/activityLog.service';
import { AppError } from '../../utils/AppError';

// Registers an asset inside a transaction: auto-tag generation and the initial
// document write are atomic, closing the read-max-then-increment race.
export async function registerAsset(
  input: Record<string, unknown>,
  actorId?: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const tag = await generateAssetTag(session);
      const asset = new Asset({
        ...input,
        tag,
        tagNumber: parseInt(tag.split('-')[1], 10),
        status: 'Available',
        history: [{ type: 'Registered', by: actorId, at: new Date() }],
      });
      await asset.save({ session });
      await logActivity('ASSET_REGISTER', `asset:${asset._id}`, actorId, { tag: asset.tag });
      return asset;
    });
  } finally {
    await session.endSession();
  }
}

// Lifecycle state change with 7-stage guard (Pillar 3).
export async function changeAssetStatus(
  assetId: string,
  nextStatus: string,
  note: string | undefined,
  actorId?: string,
) {
  const asset = await Asset.findById(assetId);
  if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
  validateStateTransition(asset.status, nextStatus as never);
  asset.status = nextStatus as never;
  asset.history.push({ type: 'Status', note, by: actorId, at: new Date() });
  await asset.save();
  await logActivity('ASSET_STATUS', `asset:${asset._id}`, actorId, { status: nextStatus });
  return asset;
}
