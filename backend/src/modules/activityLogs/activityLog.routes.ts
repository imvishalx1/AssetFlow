import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { roleGuard } from '../../middleware/roleGuard';
import { listLogs } from './activityLog.controller';

const router = Router();

// The activity log is immutable; only management roles may read it.
router.use(roleGuard('Admin', 'AssetManager'));
router.get('/', asyncHandler(listLogs));

export default router;
