import { Request, Response } from 'express';
import { Booking } from './booking.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { createBooking } from './booking.service';
import { logActivity } from '../activityLogs/activityLog.service';

// Any authenticated user can view + create bookings (resource sharing feature).
export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.resourceId) filter.resourceId = req.query.resourceId;
  if (req.query.status) filter.status = req.query.status;

  const bookings = await Booking.find(filter)
    .populate('resourceId', 'tag name')
    .populate('userId', 'name email');
  res.json({ success: true, data: { bookings } });
});

export const createBookingHandler = asyncHandler(async (req: Request, res: Response) => {
  const booking = await createBooking({ ...req.body, userId: req.user?.id ?? '' }, req.user?.id);
  res.status(201).json({ success: true, data: { booking } });
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: 'Cancelled' },
    { new: true },
  );
  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  await logActivity('BOOKING_CANCEL', `booking:${booking._id}`, req.user?.id);
  res.json({ success: true, data: { booking } });
});
