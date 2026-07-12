import { Response } from 'express';
import { env } from '../config/env';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SEVEN_DAYS,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken');
}

// Parses the Cookie header defensively — malformed %-encoding must not throw a 500.
export function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) {
        try {
          cookies[k] = decodeURIComponent(v);
        } catch {
          cookies[k] = v;
        }
      }
    }
  });
  return cookies;
}
