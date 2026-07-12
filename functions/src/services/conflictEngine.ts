import * as firestore from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '..';

/**
 * Check for double-allocation conflict INSIDE a Firestore transaction.
 *
 * Reads the asset doc within the transaction. If the asset is already
 * Allocated, throws an HttpsError('failed-precondition', 'ALLOCATION_CONFLICT')
 * with the current holder's name in `details` so the frontend can offer a
 * Transfer Request (matching the old 409 ALLOCATION_CONFLICT shape).
 *
 * Must be called before any writes in the transaction.
 */
export async function checkAllocationConflict(
  transaction: firestore.Transaction,
  assetId: string,
): Promise<void> {
  const assetRef = db.collection('assets').doc(assetId);
  const assetSnap = await transaction.get(assetRef);

  if (!assetSnap.exists) {
    throw new HttpsError('not-found', 'Asset not found');
  }

  const asset = assetSnap.data()!;

  if (asset.status === 'Allocated') {
    // Find the active allocation to get the current holder's name.
    const allocSnap = await transaction.get(
      db.collection('allocations').where('assetId', '==', assetId).where('status', '==', 'Active').limit(1),
    );

    let holderName = 'another user';
    if (!allocSnap.empty) {
      const alloc = allocSnap.docs[0].data();
      holderName = (alloc as { userName?: string }).userName ?? 'another user';
    }

    throw new HttpsError(
      'failed-precondition',
      'ALLOCATION_CONFLICT',
      `Asset is currently held by ${holderName}. Initiate a Transfer Request instead.`,
    );
  }
}

/**
 * Validate booking overlap INSIDE a Firestore transaction.
 *
 * Queries all bookings for `resourceId` with status in [Upcoming, Ongoing],
 * then applies the overlap condition:
 *   existing.startTime < requestedEnd && existing.endTime > requestedStart
 *
 * Boundary-touching slots (existing ends at 10:00, new starts at 10:00) are
 * permitted.
 *
 * Must be called before any writes in the transaction.
 */
export async function validateBookingOverlap(
  transaction: firestore.Transaction,
  resourceId: string,
  startTime: Date,
  endTime: Date,
  ignoreBookingId?: string,
): Promise<void> {
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new HttpsError('invalid-argument', 'Booking start/end time must be valid dates');
  }
  if (startTime >= endTime) {
    throw new HttpsError('invalid-argument', 'Booking start time must be before end time');
  }

  // Query all bookings for this resource with active statuses
  const bookingsSnap = await transaction.get(
    db
      .collection('bookings')
      .where('resourceId', '==', resourceId)
      .where('status', 'in', ['Upcoming', 'Ongoing']),
  );

  for (const doc of bookingsSnap.docs) {
    if (ignoreBookingId && doc.id === ignoreBookingId) continue;

    const booking = doc.data() as {
      startTime: FirebaseFirestore.Timestamp;
      endTime: FirebaseFirestore.Timestamp;
      title?: string;
    };

    const existingStart = booking.startTime.toDate();
    const existingEnd = booking.endTime.toDate();

    // Overlap condition: existing.start < requestedEnd AND existing.end > requestedStart
    if (existingStart < endTime && existingEnd > startTime) {
      throw new HttpsError(
        'already-exists',
        'BOOKING_OVERLAP',
        'This shared resource is already booked for overlapping times.',
      );
    }
  }
}
