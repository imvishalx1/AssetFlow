import { Asset } from '../modules/assets/asset.model';
import { env } from '../config/env';
import mongoose from 'mongoose';

// Auto-incrementing Asset Tag generator (e.g. AF-0001).
// Relies on a numeric `tagNumber` field kept in sync with the human-readable `tag`.
// Accepts an optional session so it can run inside a transaction (closes the
// read-max-then-increment race when used with registerAsset's transaction).
export async function generateAssetTag(session?: mongoose.ClientSession): Promise<string> {
  let query = Asset.findOne().sort({ tagNumber: -1 }).lean();
  if (session) query = query.session(session);
  const last = await query;
  const next = (last?.tagNumber ?? 0) + 1;
  return `${env.ASSET_TAG_PREFIX}${String(next).padStart(4, '0')}`;
}
