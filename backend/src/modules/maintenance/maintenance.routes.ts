import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { mongoId } from '../../utils/validators';
import * as controller from './maintenance.controller';
import { raiseSchema, approveSchema, resolveSchema } from './maintenance.schema';

const router = Router();

// Any authenticated user may raise a request; management views the list.
router.post('/', validate(raiseSchema), asyncHandler(controller.raiseMaintenance));
router.get('/', asyncHandler(controller.listMaintenance));
router.get('/:id', validate(z.object({ id: mongoId }), 'params'), asyncHandler(controller.getMaintenance));

// Approval + resolution are Asset Manager (and Admin) only (PRD FR-7.2, Pillar 1).
router.post(
  '/:id/approve',
  roleGuard('Admin', 'Asset Manager'),
  validate(z.object({ id: mongoId }), 'params'),
  validate(approveSchema),
  asyncHandler(controller.approveMaintenance),
);
router.post(
  '/:id/resolve',
  roleGuard('Admin', 'Asset Manager'),
  validate(z.object({ id: mongoId }), 'params'),
  validate(resolveSchema),
  asyncHandler(controller.resolveMaintenance),
);

export default router;
