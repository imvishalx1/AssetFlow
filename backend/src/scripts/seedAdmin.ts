import { connectDB } from '../config/db';
import { User } from '../modules/users/user.model';
import { hashPassword } from '../modules/auth/auth.service';
import { env } from '../config/env';
import logger from '../config/logger';

async function seed(): Promise<void> {
  await connectDB();

  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    logger.info('Seed admin already exists — nothing to do', { email });
    process.exit(0);
  }

  const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
  await User.create({
    name: env.SEED_ADMIN_NAME,
    email,
    passwordHash,
    role: 'Admin',
  });

  // Avoid logging the administrator's email or database id (Finding: do not log seed admin identity).
  logger.info('✅ Seed admin created');
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed', { error: (err as Error).message });
  process.exit(1);
});
