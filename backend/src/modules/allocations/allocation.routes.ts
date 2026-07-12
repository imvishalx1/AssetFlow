import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { mongoId } from '../../utils/validators';
import * as controller from './allocation.controller';
import {
  allocateSchema,
  returnSchema,
  transferRequestSchema,
  transferReviewSchema,
} from './allocation.schema';

const router = Router();

router.use(roleGuard('Admin', 'AssetManager', 'DepartmentHead'));

router.get('/', asyncHandler(controller.listAllocations));
router.post('/', validate(allocateSchema), asyncHandler(controller.allocate));
router.post(
  '/:id/return',
  validate(z.object({ id: mongoId }), 'params'),
  validate(returnSchema),
  asyncHandler(controller.returnAllocation),
);
router.post(
  '/:id/transfer',
  validate(z.object({ id: mongoId }), 'params'),
  validate(transferRequestSchema),
  asyncHandler(controller.requestTransferHandler),
);

// Transfers are mounted under /transfers.
const transferRouter = Router();
transferRouter.use(roleGuard('Admin', 'AssetManager', 'DepartmentHead'));
transferRouter.get('/', asyncHandler(controller.listTransfers));
transferRouter.post(
  '/:id/review',
  validate(z.object({ id: mongoId }), 'params'),
  validate(transferReviewSchema),
  asyncHandler(controller.reviewTransferHandler),
);

export { transferRouter };
export default router;
