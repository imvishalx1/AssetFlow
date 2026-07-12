import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../utils/asyncHandler';

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();

  const [totalAssets, byStatus, byCondition, activeAllocations, upcomingBookings, openMaintenance, overdueAllocations, costAgg] =
    await Promise.all([
      prisma.asset.count(),
      prisma.asset.groupBy({ by: ['status'], _count: true }),
      prisma.asset.groupBy({ by: ['condition'], _count: true }),
      prisma.allocation.count({ where: { status: 'Active' } }),
      prisma.booking.count({ where: { status: { in: ['Upcoming', 'Ongoing'] } } }),
      prisma.maintenanceRequest.count({
        where: { status: { in: ['Pending', 'Approved', 'TechnicianAssigned', 'InProgress'] } },
      }),
      prisma.allocation.count({
        where: { status: 'Active', expectedReturnDate: { lt: now } },
      }),
      prisma.asset.aggregate({ _sum: { acquisitionCost: true } }),
    ]);

  const totalAcquisitionCost = costAgg._sum.acquisitionCost ?? 0;

  res.json({
    success: true,
    data: {
      totalAssets,
      byStatus: byStatus.map((s) => ({ _id: s.status, count: s._count })),
      byCondition: byCondition.map((c) => ({ _id: c.condition, count: c._count })),
      activeAllocations,
      upcomingBookings,
      openMaintenance,
      overdueAllocations,
      totalAcquisitionCost,
    },
  });
});
