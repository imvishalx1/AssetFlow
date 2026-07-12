import { Asset } from '../modules/assets/asset.model';
import { Allocation } from '../modules/allocations/allocation.model';
import { Booking } from '../modules/bookings/booking.model';
import { AppError } from '../utils/AppError';

// ── Conflict Engine 1: Double-Allocation Prevention (Pillar 2a) ──────────
// If the asset is already Allocated, block and surface the current holder so
// the UI can offer a Transfer Request instead.
export async function checkAllocationConflict(assetId: string): Promise<void> {
  const asset = await Asset.findById(assetId);
  if (!asset) throw new AppError(404, 'NOT_FOUND', 'Asset not found');

  if (asset.status === 'Allocated') {
    const active = await Allocation.findOne({ assetId, status: 'Active' }).populate('userId', 'name email');
    const holderName = (active?.userId as { name?: string } | undefined)?.name ?? 'another user';
    throw new AppError(
      409,
      'ALLOCATION_CONFLICT',
      `Asset is currently held by ${holderName}. Initiate a Transfer Request instead.`,
      undefined,
      { holder: holderName },
    );
  }
}

// ── Conflict Engine 2: Resource Booking Overlap Validation (Pillar 2b) ───
// Overlap condition: existing.start < requestedEnd AND existing.end > requestedStart.
// Boundary-touching slots (existing ends at 10:00, new starts at 10:00) are allowed.
export async function validateBookingOverlap(
  resourceId: string,
  startTime: Date | string,
  endTime: Date | string,
  ignoreBookingId?: string,
): Promise<void> {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError(400, 'INVALID_TIME_SLOT', 'Booking start/end time must be valid ISO dates');
  }
  if (start >= end) {
    throw new AppError(400, 'INVALID_TIME_SLOT', 'Booking start time must be before end time');
  }

  const query: Record<string, unknown> = {
    resourceId,
    status: { $in: ['Upcoming', 'Ongoing'] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };
  if (ignoreBookingId) query._id = { $ne: ignoreBookingId };

  const overlapping = await Booking.findOne(query);
  if (overlapping) {
    throw new AppError(
      409,
      'BOOKING_OVERLAP',
      'This shared resource is already booked for overlapping times.',
      undefined,
      { conflictWindow: { start: overlapping.startTime, end: overlapping.endTime } },
    );
  }
}
