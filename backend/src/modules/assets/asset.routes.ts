import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { roleGuard } from '../../middleware/roleGuard';
import { entityId } from '../../utils/validators';
import * as controller from './asset.controller';
import { createAssetSchema, updateAssetStatusSchema } from './asset.schema';

const router = Router();

// Asset register is readable by all authenticated users.
router.use(roleGuard('Admin', 'AssetManager', 'DepartmentHead', 'Employee'));

router.get('/', asyncHandler(controller.listAssets));
router.get('/:id', validate(z.object({ id: entityId }), 'params'), asyncHandler(controller.getAsset));

// Creation + lifecycle changes are Admin / Asset Manager only.
router.post(
  '/',
  roleGuard('Admin', 'AssetManager'),
  validate(createAssetSchema),
  asyncHandler(controller.createAsset),
);
router.patch(
  '/:id/status',
  roleGuard('Admin', 'AssetManager'),
  validate(z.object({ id: entityId }), 'params'),
  validate(updateAssetStatusSchema),
  asyncHandler(controller.updateAssetStatus),
);

export default router;
