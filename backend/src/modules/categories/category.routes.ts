import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { mongoId } from '../../utils/validators';
import * as controller from './category.controller';
import { createCategorySchema, updateCategorySchema } from './category.schema';

const router = Router();

// Org Setup is Admin-only (Pillar 1).
router.use(roleGuard('Admin'));

router.get('/', asyncHandler(controller.listCategories));
router.get('/:id', validate(z.object({ id: mongoId }), 'params'), asyncHandler(controller.getCategory));
router.post('/', validate(createCategorySchema), asyncHandler(controller.createCategory));
router.patch(
  '/:id',
  validate(z.object({ id: mongoId }), 'params'),
  validate(updateCategorySchema),
  asyncHandler(controller.updateCategory),
);

export default router;
