import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import logger from '../config/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 465,
      secure: true,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

// Sends an email; if SMTP is unconfigured, logs a stub instead of failing.
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.info('[email:stub]', { to, subject });
    return;
  }
  try {
    await t.sendMail({ from: env.EMAIL_FROM ?? 'alerts@assetflow.com', to, subject, text });
  } catch (err) {
    logger.error('Email send failed', { error: (err as Error).message, to });
  }
}
