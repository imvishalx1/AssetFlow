import { Request, Response } from 'express';
import { User, IUser } from '../users/user.model';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { logActivity } from '../activityLogs/activityLog.service';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import {
  hashPassword,
  comparePassword,
  hashToken,
  compareToken,
} from './auth.service';
import { setRefreshCookie, clearRefreshCookie } from '../../utils/cookies';

function toSafeUser(u: IUser) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    departmentId: u.departmentId ? String(u.departmentId) : null,
    status: u.status,
    createdAt: u.createdAt,
  };
}

function tokenPayload(u: IUser) {
  return {
    userId: String(u._id),
    role: u.role,
    departmentId: u.departmentId ? String(u.departmentId) : null,
  };
}

// Issues a refresh token, stores only its bcrypt hash, and sets the HttpOnly cookie.
async function issueRefreshSession(res: Response, userId: string): Promise<string> {
  const refreshToken = signRefreshToken({ userId });
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();
  setRefreshCookie(res, refreshToken);
  return refreshToken;
}

// POST /api/v1/auth/signup  — Pillar 1: Employee-only, no self-elevation.
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (req.body.role && req.body.role !== 'Employee') {
    throw new AppError(
      403,
      'SELF_ELEVATION_DENIED',
      'Role cannot be set during signup. You may only register as an Employee.',
    );
  }

  const normalizedEmail = String(email).toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'Employee' });

  await issueRefreshSession(res, String(user._id)); // establish refresh session on signup
  await logActivity('USER_SIGNUP', `user:${user._id}`, user._id, { email: normalizedEmail });

  const accessToken = signAccessToken(tokenPayload(user));
  res.status(201).json({ success: true, data: { user: toSafeUser(user), accessToken } });
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  await issueRefreshSession(res, String(user._id));
  await logActivity('USER_LOGIN', `user:${user._id}`, user._id);

  const accessToken = signAccessToken(tokenPayload(user));
  res.json({ success: true, data: { user: toSafeUser(user), accessToken } });
});

// POST /api/v1/auth/refresh — atomic conditional rotation (revokes only current session).
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token expired or invalid');
  }

  const user = await User.findById(payload.userId);
  if (!user || !user.refreshTokenHash) throw new AppError(401, 'UNAUTHORIZED', 'Session not found');

  const ok = await compareToken(token, user.refreshTokenHash);
  if (!ok) throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');

  const newRefresh = signRefreshToken({ userId: String(user._id) });
  const newHash = await hashToken(newRefresh);

  // Only rotate if the presented token still matches the stored hash (no lost updates).
  const updated = await User.updateOne(
    { _id: user._id, refreshTokenHash: user.refreshTokenHash },
    { refreshTokenHash: newHash },
  );
  if (updated.matchedCount === 0) {
    throw new AppError(401, 'UNAUTHORIZED', 'Session invalidated');
  }

  setRefreshCookie(res, newRefresh);
  const accessToken = signAccessToken(tokenPayload(user));
  res.json({ success: true, data: { accessToken } });
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.userId);
      if (user) {
        user.refreshTokenHash = null;
        await user.save();
      }
    } catch {
      /* ignore invalid token on logout */
    }
  }
  clearRefreshCookie(res);
  res.json({ success: true, data: { message: 'Logged out' } });
});

// GET /api/v1/auth/me
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).populate('departmentId', 'name');
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json({ success: true, data: { user: toSafeUser(user) } });
});
