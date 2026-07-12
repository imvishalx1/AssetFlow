import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { registerAsset, changeAssetStatus } from './asset.service';

export const listAssets = asyncHandler(async (req: Request, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.user?.role === 'DepartmentHead' && req.user.departmentId) {
    where.departmentId = req.user.departmentId;
  }
  if (req.query.status) where.status = req.query.status;
  if (req.query.categoryId) where.categoryId = req.query.categoryId;
  if (req.query.q) where.name = { contains: String(req.query.q), mode: 'insensitive' };

  const assets = await prisma.asset.findMany({ where, include: { category: { select: { id: true, name: true } } } });
  res.json({ success: true, data: { assets } });
});

export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const asset = await prisma.asset.findUnique({ where: { id }, include: { category: { select: { id: true, name: true } } } });
  if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');
  res.json({ success: true, data: { asset } });
});

export const createAsset = asyncHandler(async (req: Request, res: Response) => {
  const asset = await registerAsset(req.body, req.user?.id);
  res.status(201).json({ success: true, data: { asset } });
});

export const updateAssetStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body as { status: string; note?: string };
  const asset = await changeAssetStatus(req.params.id as string, status, note, req.user?.id);
  res.json({ success: true, data: { asset } });
});
