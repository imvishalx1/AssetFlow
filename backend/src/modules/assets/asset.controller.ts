import { Request, Response } from 'express';
import { Asset } from './asset.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { registerAsset, changeAssetStatus } from './asset.service';

export const listAssets = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  // Department Heads are scoped to their own department's assets.
  if (req.user?.role === 'Department Head' && req.user.departmentId) {
    filter.departmentId = req.user.departmentId;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.q) filter.name = { $regex: String(req.query.q), $options: 'i' };

  const assets = await Asset.find(filter).populate('categoryId', 'name key');
  res.json({ success: true, data: { assets } });
});

export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await Asset.findById(req.params.id).populate('categoryId', 'name key');
  if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
  res.json({ success: true, data: { asset } });
});

export const createAsset = asyncHandler(async (req: Request, res: Response) => {
  const data: Record<string, unknown> = { ...req.body };
  if (data.acquisitionDate) data.acquisitionDate = new Date(data.acquisitionDate as string);
  const asset = await registerAsset(data, req.user?.id);
  res.status(201).json({ success: true, data: { asset } });
});

export const updateAssetStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body as { status: string; note?: string };
  const asset = await changeAssetStatus(req.params.id as string, status, note, req.user?.id);
  res.json({ success: true, data: { asset } });
});
