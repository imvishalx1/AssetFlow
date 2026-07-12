import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const where: Record<string, unknown> = {};
  if (req.query.resourceId) where.resourceId = req.query.resourceId;
  if (req.query.status) where.status = req.query.status;
  const bookings = await prisma.booking.findMany({ where, orderBy: { startTime: 'asc' } });
  res.json({ success: true, data: { bookings } });
});

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const { resourceId, title, startTime, endTime } = req.body;
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (start >= end) throw new AppError(400, 'INVALID_TIME_SLOT', 'Start must be before end');
  const conflicts = await prisma.booking.findMany({ where: { resourceId, status: { in: ['Upcoming', 'Ongoing'] }, startTime: { lt: end }, endTime: { gt: start } } });
  if (conflicts.length) throw new AppError(409, 'BOOKING_OVERLAP', 'Time slot overlaps with existing booking');
  const booking = await prisma.booking.create({
    data: { resourceId, userId: req.user!.id, title, startTime: start, endTime: end, status: 'Upcoming' },
  });
  await logActivity('BOOKING_CREATE', `resource:${resourceId}`, req.user?.id);
  res.status(201).json({ success: true, data: { booking } });
});

export const createBookingHandler = createBooking;

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.booking.update({ where: { id }, data: { status: 'Cancelled' } });
  res.json({ success: true, data: { booking: { id, status: 'Cancelled' } } });
});
