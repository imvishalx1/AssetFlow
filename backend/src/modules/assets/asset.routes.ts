import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { mongoId } from '../../utils/validators';
import * as controller from './asset.controller';
import { createAssetSchema, updateAssetStatusSchema } from './asset.schema';

const router = Router();

// Asset register is readable by management roles (Employees use their own allocation view).
router.use(roleGuard('Admin', 'Asset Manager', 'Department Head'));

router.get('/', asyncHandler(controller.listAssets));
router.get('/:id', validate(z.object({ id: mongoId }), 'params'), asyncHandler(controller.getAsset));

// Creation + lifecycle changes are Admin / Asset Manager only.
router.post(
  '/',
  roleGuard('Admin', 'Asset Manager'),
  validate(createAssetSchema),
  asyncHandler(controller.createAsset),
);
router.patch(
  '/:id/status',
  roleGuard('Admin', 'Asset Manager'),
  validate(z.object({ id: mongoId }), 'params'),
  validate(updateAssetStatusSchema),
  asyncHandler(controller.updateAssetStatus),
);

export default router;
