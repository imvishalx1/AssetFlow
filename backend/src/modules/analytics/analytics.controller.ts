import { Request, Response } from 'express';
import { Asset } from '../assets/asset.model';
import { Allocation } from '../allocations/allocation.model';
import { Booking } from '../bookings/booking.model';
import { Maintenance } from '../maintenance/maintenance.model';
import { asyncHandler } from '../../utils/asyncHandler';

// Read-only aggregate dashboard. All figures derive from the integer
// acquisitionCost field (analytics/ranking only — Pillar 4: no accounting).
export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const [totalAssets, byStatus, byCondition, activeAllocations, upcomingBookings, openMaintenance, overdueAllocations] =
    await Promise.all([
      Asset.countDocuments(),
      Asset.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $group: { _id: '$condition', count: { $sum: 1 } } }]),
      Allocation.countDocuments({ status: 'Active' }),
      Booking.countDocuments({ status: { $in: ['Upcoming', 'Ongoing'] } }),
      Maintenance.countDocuments({
        status: { $in: ['Pending', 'Approved', 'Technician Assigned', 'In Progress'] },
      }),
      Allocation.countDocuments({ status: 'Active', expectedReturnDate: { $lt: new Date() } }),
    ]);

  const costAgg = await Asset.aggregate([{ $group: { _id: null, sum: { $sum: '$acquisitionCost' } } }]);
  const totalAcquisitionCost = costAgg[0]?.sum ?? 0;

  res.json({
    success: true,
    data: {
      totalAssets,
      byStatus,
      byCondition,
      activeAllocations,
      upcomingBookings,
      openMaintenance,
      overdueAllocations,
      totalAcquisitionCost,
    },
  });
});
