import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

// bcrypt silently ignores bytes beyond 72; pre-hash longer inputs so a prefix
// can never collide with the full password (Finding: prevent bcrypt truncation).
function normalize(plain: string): string {
  return plain.length > 72 ? crypto.createHash('sha256').update(plain).digest('hex') : plain;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(normalize(plain), SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalize(plain), hash);
}

// Refresh tokens are stored hashed (bcrypt) — never the raw token.
export function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, SALT_ROUNDS);
}

export function compareToken(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
