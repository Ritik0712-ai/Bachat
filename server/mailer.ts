import mongoose from 'mongoose';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Resend } from 'resend';
import type { ClientSession } from 'mongoose';
import { TokenModel } from './db.js';
import { config } from './config.js';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const capturedMail: { to: string; kind: string; url: string }[] = [];
export async function makeToken(
  userId: mongoose.Types.ObjectId,
  kind: 'verify_email' | 'reset_password',
  session: ClientSession,
) {
  await TokenModel.updateMany(
    { userId, kind, consumedAt: null },
    { $set: { consumedAt: new Date() } },
    { session },
  );
  const token = randomBytes(32).toString('hex');
  await TokenModel.create(
    [
      {
        userId,
        kind,
        tokenHash: hashToken(token),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (kind === 'verify_email' ? 86400000 : 1800000)),
      },
    ],
    { session },
  );
  return token;
}
export async function sendAccountMail(
  to: string,
  kind: 'verify_email' | 'reset_password',
  token: string,
) {
  const route = kind === 'verify_email' ? 'verify-email' : 'reset-password',
    url = config.origin + '/' + route + '#token=' + token;
  if (!config.production && !config.resend) {
    capturedMail.push({ to, kind, url });
    await mkdir('.data/mail', { recursive: true });
    await writeFile(
      '.data/mail/' + Date.now() + '-' + randomBytes(4).toString('hex') + '.json',
      JSON.stringify({ to, kind, url }, null, 2),
      { mode: 0o600 },
    );
    return;
  }
  try {
    const mail = new Resend(config.resend);
    const result = await mail.emails.send({
      from: config.mailFrom,
      to,
      subject: kind === 'verify_email' ? 'Verify your Bachat email' : 'Reset your Bachat password',
      text: `${kind === 'verify_email' ? 'Verify your email' : 'Reset your password'} using this link:\n\n${url}\n\nIf you did not request this, you can ignore this message.`,
    });
    if (result.error) throw new Error('MAIL_DELIVERY_REJECTED');
  } catch {
    console.error(JSON.stringify({ code: 'MAIL_DELIVERY_FAILED', kind }));
  }
}
