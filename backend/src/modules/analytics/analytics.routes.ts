import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { roleGuard } from '../../middleware/roleGuard';
import { getSummary } from './analytics.controller';

const router = Router();

router.use(roleGuard('Admin', 'AssetManager', 'DepartmentHead'));
router.get('/summary', asyncHandler(getSummary));

export default router;
