import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { mongoId } from '../../utils/validators';
import * as controller from './department.controller';
import { createDepartmentSchema, updateDepartmentSchema } from './department.schema';

const router = Router();

// Organization Setup is Admin-only (Pillar 1).
router.use(roleGuard('Admin'));

router.get('/', asyncHandler(controller.listDepartments));
router.get('/:id', validate(z.object({ id: mongoId }), 'params'), asyncHandler(controller.getDepartment));
router.post('/', validate(createDepartmentSchema), asyncHandler(controller.createDepartment));
router.patch(
  '/:id',
  validate(z.object({ id: mongoId }), 'params'),
  validate(updateDepartmentSchema),
  asyncHandler(controller.updateDepartment),
);

export default router;
