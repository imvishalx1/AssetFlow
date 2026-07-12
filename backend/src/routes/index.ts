import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import departmentRoutes from '../modules/departments/department.routes';
import categoryRoutes from '../modules/categories/category.routes';
import userRoutes from '../modules/users/user.routes';
import assetRoutes from '../modules/assets/asset.routes';
import allocationRoutes, { transferRouter } from '../modules/allocations/allocation.routes';
import bookingRoutes from '../modules/bookings/booking.routes';
import auditRoutes from '../modules/audits/audit.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import activityLogRoutes from '../modules/activityLogs/activityLog.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/departments', departmentRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/assets', assetRoutes);
router.use('/allocations', allocationRoutes);
router.use('/transfers', transferRouter);
router.use('/bookings', bookingRoutes);
router.use('/audits', auditRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/activity-logs', activityLogRoutes);

export default router;
