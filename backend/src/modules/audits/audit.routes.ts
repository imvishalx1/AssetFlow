import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { mongoId } from '../../utils/validators';
import * as controller from './audit.controller';
import { createAuditSchema, auditItemSchema } from './audit.schema';

const router = Router();

// Audits are Admin / Asset Manager only.
router.use(roleGuard('Admin', 'Asset Manager'));

router.get('/', asyncHandler(controller.listAudits));
router.get('/:id', validate(z.object({ id: mongoId }), 'params'), asyncHandler(controller.getAudit));
router.post('/', validate(createAuditSchema), asyncHandler(controller.createAuditHandler));
router.patch(
  '/:id/items/:assetId',
  validate(z.object({ id: mongoId, assetId: mongoId }), 'params'),
  validate(auditItemSchema),
  asyncHandler(controller.updateAuditItemHandler),
);
router.post(
  '/:id/close',
  validate(z.object({ id: mongoId }), 'params'),
  asyncHandler(controller.closeAuditHandler),
);

export default router;
