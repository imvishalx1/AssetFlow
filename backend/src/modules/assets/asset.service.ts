import { prisma } from '../../lib/prisma';
import { validateStateTransition } from '../../services/stateMachine';
import { logActivity } from '../activityLogs/activityLog.service';
import { AppError } from '../../utils/AppError';

const TAG_PREFIX = 'AF-';

export async function generateAssetTag(): Promise<string> {
  const result = await prisma.asset.aggregate({ _max: { tagNumber: true } });
  const nextNumber = (result._max.tagNumber ?? 0) + 1;
  return `${TAG_PREFIX}${String(nextNumber).padStart(4, '0')}`;
}

export async function registerAsset(
  input: Record<string, unknown>,
  actorId?: string,
) {
  const tag = await generateAssetTag();
  const tagMatch = tag.match(/(\d+)\s*$/);
  const tagNumber = tagMatch ? parseInt(tagMatch[1], 10) : 0;

  const asset = await prisma.asset.create({
    data: {
      tag,
      tagNumber,
      name: input.name as string,
      categoryId: input.categoryId as string,
      serialNumber: (input.serialNumber as string) ?? null,
      acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate as string) : null,
      acquisitionCost: (input.acquisitionCost as number) ?? 0,
      condition: (input.condition as string) ?? 'New',
      location: (input.location as string) ?? null,
      status: 'Available',
      isBookable: (input.isBookable as boolean) ?? false,
      departmentId: (input.departmentId as string) ?? null,
    },
  });

  // Write initial history event
  await prisma.assetHistoryEvent.create({
    data: {
      assetId: asset.id,
      eventType: 'Registered',
      detail: { by: actorId },
    },
  });

  await logActivity('ASSET_REGISTER', `asset:${asset.id}`, actorId, { tag: asset.tag });
  return asset;
}

export async function changeAssetStatus(
  assetId: string,
  nextStatus: string,
  note: string | undefined,
  actorId?: string,
) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
  validateStateTransition(asset.status as never, nextStatus as never);

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: { status: nextStatus as never },
  });

  await prisma.assetHistoryEvent.create({
    data: {
      assetId,
      eventType: 'Status',
      detail: { note, by: actorId, toStatus: nextStatus },
    },
  });

  await logActivity('ASSET_STATUS', `asset:${assetId}`, actorId, { status: nextStatus });
  return updated;
}
