import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany();
  res.json({ success: true, data: { categories } });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) throw new AppError(404, 'NOT_FOUND', 'Category not found');
  res.json({ success: true, data: { category: cat } });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const cat = await prisma.category.create({ data: { name: req.body.name, customFields: req.body.customFields ?? undefined } });
  await logActivity('CATEGORY_CREATE', `cat:${cat.id}`, req.user?.id);
  res.status(201).json({ success: true, data: { category: cat } });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const cat = await prisma.category.update({ where: { id }, data: req.body });
  await logActivity('CATEGORY_UPDATE', `cat:${cat.id}`, req.user?.id);
  res.json({ success: true, data: { category: cat } });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.category.delete({ where: { id } });
  await logActivity('CATEGORY_DELETE', `cat:${id}`, req.user?.id);
  res.json({ success: true, data: { message: 'Category deleted' } });
});
