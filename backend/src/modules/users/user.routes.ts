import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { mongoId } from '../../utils/validators';
import * as controller from './user.controller';
import { promoteSchema, updateUserSchema } from './user.schema';

const router = Router();

// Employee Directory is visible to management roles.
router.use(roleGuard('Admin', 'Asset Manager', 'Department Head'));

router.get('/', asyncHandler(controller.listUsers));
router.get('/:id', validate(z.object({ id: mongoId }), 'params'), asyncHandler(controller.getUser));

// Admin-only promotion (Pillar 1). No endpoint grants the Admin role.
router.patch(
  '/:id/promote',
  roleGuard('Admin'),
  validate(z.object({ id: mongoId }), 'params'),
  validate(promoteSchema),
  asyncHandler(controller.promoteUser),
);
router.patch(
  '/:id',
  validate(z.object({ id: mongoId }), 'params'),
  validate(updateUserSchema),
  asyncHandler(controller.updateUser),
);

export default router;
