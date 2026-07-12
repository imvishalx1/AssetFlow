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
