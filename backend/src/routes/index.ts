import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import authRoutes from '../modules/auth/auth.routes';
import departmentRoutes from '../modules/departments/department.routes';
import categoryRoutes from '../modules/categories/category.routes';
import userRoutes from '../modules/users/user.routes';
import assetRoutes from '../modules/assets/asset.routes';
import allocationRoutes, { transferRouter } from '../modules/allocations/allocation.routes';
import bookingRoutes from '../modules/bookings/booking.routes';
import auditRoutes from '../modules/audits/audit.routes';
import maintenanceRoutes from '../modules/maintenance/maintenance.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import activityLogRoutes from '../modules/activityLogs/activityLog.routes';

const router = Router();

router.use('/auth', authRoutes);

// Public /auth routes must stay unauthenticated. All remaining domain routers
// require a valid access token; mount requireAuth globally AFTER /auth so that
// req.user is populated before any roleGuard runs.
router.use(requireAuth);

router.use('/departments', departmentRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/assets', assetRoutes);
router.use('/allocations', allocationRoutes);
router.use('/transfers', transferRouter);
router.use('/bookings', bookingRoutes);
router.use('/audits', auditRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/activity-logs', activityLogRoutes);

export default router;
