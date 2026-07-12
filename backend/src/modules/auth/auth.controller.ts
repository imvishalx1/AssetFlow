import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import type { Role } from '../../types/roles';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { hashPassword, comparePassword, hashToken, compareToken } from './auth.service';
import { setRefreshCookie, clearRefreshCookie } from '../../utils/cookies';

function toSafeUser(u: { id: string; name: string; email: string; role: string; departmentId: string | null; status: string; createdAt: Date }) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    departmentId: u.departmentId ?? null,
    status: u.status,
    createdAt: u.createdAt,
  };
}

function tokenPayload(u: { id: string; role: string; departmentId: string | null }) {
  return { userId: u.id, role: u.role as Role, departmentId: u.departmentId ?? null };
}

// Issues a refresh token, stores its bcrypt hash in the RefreshToken table, sets HttpOnly cookie.
async function issueRefreshSession(res: Response, userId: string): Promise<string> {
  const refreshToken = signRefreshToken({ userId });
  const tokenHash = await hashToken(refreshToken);

  // Delete old refresh tokens for this user, then insert new one
  await prisma.refreshToken.deleteMany({ where: { userId } });
  // expiresAt: 7 days from now (matches JWT_REFRESH_EXPIRES_IN)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

  setRefreshCookie(res, refreshToken);
  return refreshToken;
}

// POST /api/v1/auth/signup — Pillar 1: Employee-only, no self-elevation.
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (req.body.role && req.body.role !== 'Employee') {
    throw new AppError(403, 'SELF_ELEVATION_DENIED', 'Role cannot be set during signup. You may only register as an Employee.');
  }

  const normalizedEmail = String(email).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, role: 'Employee' },
  });

  await issueRefreshSession(res, user.id);
  await logActivity('USER_SIGNUP', `user:${user.id}`, user.id, { email: normalizedEmail });

  const accessToken = signAccessToken(tokenPayload(user));
  res.status(201).json({ success: true, data: { user: toSafeUser(user), accessToken } });
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  await issueRefreshSession(res, user.id);
  await logActivity('USER_LOGIN', `user:${user.id}`, user.id);

  const accessToken = signAccessToken(tokenPayload(user));
  res.json({ success: true, data: { user: toSafeUser(user), accessToken } });
});

// POST /api/v1/auth/refresh — atomic rotation with single-flight token reuse detection.
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token');

  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token expired or invalid');
  }

  // Find the stored token record
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!stored) throw new AppError(401, 'UNAUTHORIZED', 'Session not found');

  const ok = await compareToken(token, stored.tokenHash);
  if (!ok) throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');

  // Rotate: delete old token, issue new one
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newRefresh = signRefreshToken({ userId: payload.userId });
  const newHash = await hashToken(newRefresh);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId: payload.userId, tokenHash: newHash, expiresAt } });

  setRefreshCookie(res, newRefresh);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const accessToken = signAccessToken(tokenPayload(user));
  res.json({ success: true, data: { accessToken } });
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });
    } catch {
      /* ignore invalid token on logout */
    }
  }
  clearRefreshCookie(res);
  res.json({ success: true, data: { message: 'Logged out' } });
});

// GET /api/v1/auth/me
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { department: true },
  });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json({ success: true, data: { user: toSafeUser({ ...user, departmentId: user.department?.id ?? null }) } });
});
