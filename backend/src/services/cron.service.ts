import * as cron from 'node-cron';
import logger from '../config/logger';
import { Allocation } from '../modules/allocations/allocation.model';
import { sendEmail } from './email.service';

// Scheduled overdue-allocation reminders. (Pillar: real cron kept per plan.)
export function startCronJobs(): void {
  cron.schedule('5 0 * * *', async () => {
    try {
      const now = new Date();
      const overdue = await Allocation.find({ status: 'Active', expectedReturnDate: { $lt: now } })
        .populate('userId', 'name email')
        .populate('assetId', 'tag name');
      for (const a of overdue) {
        const user = a.userId as unknown as { email?: string; name?: string };
        const asset = a.assetId as unknown as { tag?: string; name?: string };
        if (user?.email) {
          await sendEmail(
            user.email,
            'AssetFlow: Overdue return reminder',
            `Asset ${asset?.tag ?? ''} (${asset?.name ?? ''}) was expected back on ${a.expectedReturnDate}. Please return it.`,
          );
        }
      }
      logger.info('Overdue-allocation check complete', { count: overdue.length });
    } catch (err) {
      logger.error('Overdue-allocation cron failed', { error: (err as Error).message });
    }
  });
  logger.info('Cron jobs started');
}
