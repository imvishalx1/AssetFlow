import { Asset } from '../modules/assets/asset.model';
import { env } from '../config/env';

// Auto-incrementing Asset Tag generator (e.g. AF-0001).
// Relies on a numeric `tagNumber` field kept in sync with the human-readable `tag`.
export async function generateAssetTag(): Promise<string> {
  const last = await Asset.findOne().sort({ tagNumber: -1 }).lean();
  const next = (last?.tagNumber ?? 0) + 1;
  return `${env.ASSET_TAG_PREFIX}${String(next).padStart(4, '0')}`;
}
