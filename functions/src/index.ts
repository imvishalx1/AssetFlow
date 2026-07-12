import * as firestore from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { signupSchema } from './schemas/auth';
import { validateStateTransition } from './services/stateMachine';
import { checkAllocationConflict, validateBookingOverlap } from './services/conflictEngine';

initializeApp();

export const db = getFirestore();
export const auth = getAuth();

setGlobalOptions({ region: 'us-central1', timeoutSeconds: 60 });

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Run an activity log write (non-transactional — fire-and-forget). */
async function logActivity(
  action: string,
  target: string,
  actorId: string | null,
  meta?: Record<string, unknown>,
) {
  await db.collection('activityLogs').add({ actorId, action, target, meta: meta ?? null });
}

/** Get a user's display name from Firestore, or fallback string. */
async function getUserName(uid: string): Promise<string> {
  try {
    const snap = await db.collection('users').doc(uid).get();
    return (snap.data() as { name?: string } | undefined)?.name ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/** Get an asset's tag and name from Firestore. */
async function getAssetMeta(assetId: string): Promise<{ tag: string; name: string }> {
  const snap = await db.collection('assets').doc(assetId).get();
  if (!snap.exists) return { tag: '', name: 'Unknown' };
  const d = snap.data()!;
  return { tag: (d as { tag: string }).tag, name: (d as { name: string }).name };
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 2 — Authentication & RBAC
// ─────────────────────────────────────────────────────────────────────────

export const signup = onCall<{ name?: string; email?: string; password?: string }>(
  async (request) => {
    const { name, email, password } = request.data;
    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', 'Validation failed', {
        issues: parsed.error.issues,
      });
    }
    const normalizedEmail = parsed.data.email.toLowerCase();
    try {
      const userRecord = await auth.createUser({
        email: normalizedEmail,
        password: parsed.data.password,
        displayName: parsed.data.name,
      });
      await auth.setCustomUserClaims(userRecord.uid, { role: 'Employee', departmentId: null });
      await db.collection('users').doc(userRecord.uid).set({
        name: parsed.data.name,
        email: normalizedEmail,
        role: 'Employee',
        departmentId: null,
        status: 'Active',
      });
      await db.collection('activityLogs').add({
        actorId: userRecord.uid,
        action: 'USER_SIGNUP',
        target: `user:${userRecord.uid}`,
        meta: { email: normalizedEmail },
      });
      return { success: true, data: { uid: userRecord.uid } };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'An account with this email already exists');
      }
      throw new HttpsError('internal', err.message ?? 'Signup failed');
    }
  },
);

export const promoteUser = onCall<{ uid?: string; role?: string }>(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in');
  if (callerAuth.token.role !== 'Admin') {
    throw new HttpsError('permission-denied', 'SELF_ELEVATION_DENIED: Only Admins can promote users');
  }
  const { uid, role } = request.data;
  if (!uid || typeof uid !== 'string') throw new HttpsError('invalid-argument', 'uid is required');
  if (role !== 'Asset Manager' && role !== 'Department Head') {
    throw new HttpsError('invalid-argument', 'Invalid role. Must be Asset Manager or Department Head.');
  }
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');
  const currentData = userDoc.data()!;
  await auth.setCustomUserClaims(uid, { role, departmentId: currentData.departmentId ?? null });
  await db.collection('users').doc(uid).update({ role });
  await logActivity('USER_PROMOTE', `user:${uid}`, callerAuth.uid, { role });
  return { success: true, data: { uid, role } };
});

// ─────────────────────────────────────────────────────────────────────────
// PHASE 3 — Business Logic
// ─────────────────────────────────────────────────────────────────────────

// ── Allocations ───────────────────────────────────────────────────────────

export const allocateAsset = onCall<{ assetId?: string; userId?: string; expectedReturnDate?: string }>(
  async (request) => {
    const callerAuth = request.auth;
    if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in');
    const { assetId, userId, expectedReturnDate } = request.data;
    if (!assetId || !userId) throw new HttpsError('invalid-argument', 'assetId and userId are required');

    const result = await db.runTransaction(async (tx) => {
      // 1. Conflict check (reads asset + active allocation inside tx)
      await checkAllocationConflict(tx, assetId);

      // 2. Re-read asset within tx (safe — checkAllocationConflict only reads)
      const assetRef = db.collection('assets').doc(assetId);
      const assetSnap = await tx.get(assetRef);
      const asset = assetSnap.data()!;

      // 3. Validate state transition
      validateStateTransition(asset.status, 'Allocated');

      // 4. Read denormalized data
      const userName = await getUserName(userId);
      const { tag, name: assetName } = await getAssetMeta(assetId);

      // 5. Write allocation doc
      const allocRef = db.collection('allocations').doc();
      tx.set(allocRef, {
        assetId,
        assetTag: tag,
        assetName,
        userId,
        userName,
        departmentId: asset.departmentId ?? null,
        expectedReturnDate: expectedReturnDate ? Timestamp.fromDate(new Date(expectedReturnDate)) : null,
        status: 'Active',
        checkInNotes: null,
        allocatedAt: Timestamp.now(),
        returnedAt: null,
      });

      // 6. Update asset status
      tx.update(assetRef, { status: 'Allocated' });

      return { allocationId: allocRef.id };
    });

    await logActivity('ASSET_ALLOCATE', `asset:${assetId}`, callerAuth.uid, { userId, allocationId: result.allocationId });
    return { success: true, data: result };
  },
);

export const returnAsset = onCall<{ allocationId?: string; checkInNotes?: string }>(
  async (request) => {
    const callerAuth = request.auth;
    if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in');
    const { allocationId, checkInNotes } = request.data;
    if (!allocationId) throw new HttpsError('invalid-argument', 'allocationId is required');

    const result = await db.runTransaction(async (tx) => {
      const allocRef = db.collection('allocations').doc(allocationId);
      const allocSnap = await tx.get(allocRef);
      if (!allocSnap.exists) throw new HttpsError('not-found', 'Allocation not found');
      const alloc = allocSnap.data()!;
      if (alloc.status !== 'Active') {
        throw new HttpsError('failed-precondition', 'INVALID_STATE', 'Allocation is not active');
      }

      const assetRef = db.collection('assets').doc(alloc.assetId);
      const assetSnap = await tx.get(assetRef);
      if (!assetSnap.exists) throw new HttpsError('not-found', 'Asset not found');
      const asset = assetSnap.data()!;
      validateStateTransition(asset.status, 'Available');

      tx.update(allocRef, { status: 'Returned', returnedAt: Timestamp.now(), checkInNotes: checkInNotes ?? null });
      tx.update(assetRef, { status: 'Available' });

      return { assetId: alloc.assetId };
    });

    await logActivity('ASSET_RETURN', `asset:${result.assetId}`, callerAuth.uid);
    return { success: true, data: result };
  },
);

export const requestTransfer = onCall<{ allocationId?: string; toUserId?: string; note?: string }>(
  async (request) => {
    const callerAuth = request.auth;
    if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in');
    const { allocationId, toUserId, note } = request.data;
    if (!allocationId || !toUserId) {
      throw new HttpsError('invalid-argument', 'allocationId and toUserId are required');
    }

    const allocSnap = await db.collection('allocations').doc(allocationId).get();
    if (!allocSnap.exists) throw new HttpsError('not-found', 'Allocation not found');
    const alloc = allocSnap.data()!;
    if (alloc.status !== 'Active') {
      throw new HttpsError('failed-precondition', 'INVALID_STATE', 'Allocation is not active');
    }

    const { tag, name: assetName } = await getAssetMeta(alloc.assetId);
    const fromUserName = await getUserName(alloc.userId);
    const toUserName = await getUserName(toUserId);

    const transferRef = db.collection('transfers').doc();
    await transferRef.set({
      assetId: alloc.assetId,
      assetTag: tag,
      assetName,
      fromUserId: alloc.userId,
      fromUserName,
      toUserId,
      toUserName,
      requestedBy: callerAuth.uid,
      status: 'Requested',
      note: note ?? null,
      reviewedBy: null,
      reviewedAt: null,
    });

    await logActivity('TRANSFER_REQUEST', `asset:${alloc.assetId}`, callerAuth.uid);
    return { success: true, data: { transferId: transferRef.id } };
  },
);

export const reviewTransfer = onCall<{ transferId?: string; decision?: string; note?: string }>(
  async (request) => {
    const callerAuth = request.auth;
    if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in');
    const { transferId, decision, note } = request.data;
    if (!transferId || !decision) throw new HttpsError('invalid-argument', 'transferId and decision are required');
    if (decision !== 'Approved' && decision !== 'Rejected') {
      throw new HttpsError('invalid-argument', 'decision must be Approved or Rejected');
    }

    const result = await db.runTransaction(async (tx) => {
      const transferRef = db.collection('transfers').doc(transferId);
      const transferSnap = await tx.get(transferRef);
      if (!transferSnap.exists) throw new HttpsError('not-found', 'Transfer not found');
      const transfer = transferSnap.data()!;
      if (transfer.status !== 'Requested') {
        throw new HttpsError('failed-precondition', 'INVALID_STATE', 'Transfer has already been reviewed');
      }

      if (decision === 'Rejected') {
        tx.update(transferRef, { status: 'Rejected', reviewedBy: callerAuth.uid, reviewedAt: Timestamp.now(), note: note ?? null });
        return { decision: 'Rejected', assetId: transfer.assetId };
      }

      // Approved: close old allocation, open new one
      const oldAllocSnap = await tx.get(
        db.collection('allocations').where('assetId', '==', transfer.assetId).where('status', '==', 'Active').limit(1),
      );
      if (!oldAllocSnap.empty) {
        const oldAllocId = oldAllocSnap.docs[0].id;
        tx.update(db.collection('allocations').doc(oldAllocId), { status: 'Transferred', returnedAt: Timestamp.now() });
      }

      // Create new allocation for the recipient
      const newAllocRef = db.collection('allocations').doc();
      tx.set(newAllocRef, {
        assetId: transfer.assetId,
        assetTag: transfer.assetTag,
        assetName: transfer.assetName,
        userId: transfer.toUserId,
        userName: transfer.toUserName,
        departmentId: null,
        expectedReturnDate: null,
        status: 'Active',
        checkInNotes: null,
        allocatedAt: Timestamp.now(),
        returnedAt: null,
      });

      tx.update(transferRef, { status: 'Approved', reviewedBy: callerAuth.uid, reviewedAt: Timestamp.now(), note: note ?? null });

      return { decision: 'Approved', assetId: transfer.assetId, newAllocationId: newAllocRef.id };
    });

    await logActivity('TRANSFER_APPROVE', `asset:${result.assetId}`, callerAuth.uid);
    return { success: true, data: result };
  },
);

// ── Bookings ──────────────────────────────────────────────────────────────

export const createBooking = onCall<{
  resourceId?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
}>(
  async (request) => {
    const callerAuth = request.auth;
    if (!callerAuth) throw new HttpsError('unauthenticated', 'You must be logged in');
    const { resourceId, title, startTime, endTime } = request.data;
    if (!resourceId || !title || !startTime || !endTime) {
      throw new HttpsError('invalid-argument', 'resourceId, title, startTime, and endTime are required');
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const result = await db.runTransaction(async (tx) => {
      // 1. Overlap check
      await validateBookingOverlap(tx, resourceId, startDate, endDate);

      // 2. Verify resource exists and is bookable
      const assetRef = db.collection('assets').doc(resourceId);
      const assetSnap = await tx.get(assetRef);
      if (!assetSnap.exists) throw new HttpsError('not-found', 'Resource not found');
      const asset = assetSnap.data()!;
      if (!asset.isBookable) {
        throw new HttpsError('failed-precondition', 'Selected asset is not bookable');
      }

      // 3. Denormalized data
      const userName = await getUserName(callerAuth.uid);
      const { tag, name: assetName } = await getAssetMeta(resourceId);

      // 4. Write booking
      const bookingRef = db.collection('bookings').doc();
      tx.set(bookingRef, {
        resourceId,
        resourceTag: tag,
        resourceName: assetName,
        userId: callerAuth.uid,
        userName,
        title,
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        status: 'Upcoming',
      });

      return { bookingId: bookingRef.id };
    });

    await logActivity('BOOKING_CREATE', `resource:${resourceId}`, callerAuth.uid);
    return { success: true, data: result };
  },
);

// ── Automated Triggers (Firestore-triggered) ────────────────────────────

/**
 * When a maintenance request is updated:
 * - Approved → flip linked asset status to 'Under Maintenance'
 * - Resolved → flip linked asset status to 'Available'
 * - Rejected → no asset status change needed
 */
export const onMaintenanceUpdated = onDocumentUpdated(
  'maintenanceRequests/{docId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status) return; // no meaningful change

    const assetId = after.assetId as string;

    if (after.status === 'Approved' || after.status === 'Technician Assigned' || after.status === 'In Progress') {
      // Flip asset to Under Maintenance
      await db.collection('assets').doc(assetId).update({ status: 'Under Maintenance' });
    } else if (after.status === 'Resolved') {
      // Flip asset back to Available
      await db.collection('assets').doc(assetId).update({ status: 'Available' });
    }
  },
);

/**
 * When an audit cycle is set to Closed, lock it.
 * The Firestore doc update of `locked: true` is combined with setting
 * the `status` to `Closed`.
 */
export const onAuditCycleUpdated = onDocumentUpdated(
  'auditCycles/{docId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status) return;

    if (after.status === 'Closed') {
      await event.data?.after?.ref.update({ locked: true });
    }
  },
);

// ── Scheduled Overdue-Return Check ─────────────────────────────────────

/** Runs daily. Finds active allocations past their expected return date. */
export const checkOverdueReturns = onSchedule('every day 09:00', async () => {
  const now = Timestamp.now();
  const overdueSnap = await db
    .collection('allocations')
    .where('status', '==', 'Active')
    .where('expectedReturnDate', '<', now)
    .get();

  const promises: Promise<unknown>[] = [];
  overdueSnap.forEach((doc) => {
    const data = doc.data();
    promises.push(
      logActivity('OVERDUE_RETURN', `allocation:${doc.id}`, null, {
        assetId: data.assetId,
        userId: data.userId,
        expectedReturnDate: data.expectedReturnDate?.toDate()?.toISOString(),
      }),
    );
  });

  await Promise.all(promises);
});
