import mongoose from 'mongoose';
import { Booking } from './booking.model';
import { validateBookingOverlap } from '../../services/conflictEngine';
import { logActivity } from '../activityLogs/activityLog.service';

// Creates a booking inside a transaction. The overlap check + document write are
// atomic, closing the booking TOCTOU race (Pillar 2b). The isBookable invariant
// is enforced by the model's pre-save hook.
export async function createBooking(
  input: { resourceId: string; title: string; startTime: string; endTime: string; userId: string },
  actorId?: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const start = new Date(input.startTime);
      const end = new Date(input.endTime);
      await validateBookingOverlap(input.resourceId, start, end, undefined, session);

      const booking = new Booking({
        resourceId: input.resourceId,
        userId: input.userId,
        title: input.title,
        startTime: start,
        endTime: end,
        status: 'Upcoming',
      });
      await booking.save({ session }); // pre-save hook validates isBookable
      await logActivity('BOOKING_CREATE', `booking:${booking._id}`, actorId);
      return booking;
    });
  } finally {
    await session.endSession();
  }
}
