import { Request, Response } from 'express';
import { Category } from './category.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find();
  res.json({ success: true, data: { categories } });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
  res.json({ success: true, data: { category } });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.create(req.body);
  await logActivity('CATEGORY_CREATE', `category:${category._id}`, req.user?.id, { name: category.name });
  res.status(201).json({ success: true, data: { category } });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
  await logActivity('CATEGORY_UPDATE', `category:${category._id}`, req.user?.id);
  res.json({ success: true, data: { category } });
});
