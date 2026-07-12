import { ActivityLog } from './activityLog.model';
import logger from '../../config/logger';

// Immutable audit trail writer. Failures are logged but never break the request.
export async function logActivity(
  action: string,
  target: string,
  actorId?: unknown,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await ActivityLog.create({ action, target, actorId: actorId ? String(actorId) : null, meta });
  } catch (err) {
    logger.error('Failed to write activity log', { error: (err as Error).message, action, target });
  }
}
