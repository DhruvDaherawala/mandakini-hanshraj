import 'server-only';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { cookies } from 'next/headers';
import { tables } from './db';
import { appOrigin, SESSION_COOKIE, SESSION_SECONDS } from './config';
import { fail, HttpError } from './errors';

const digest = (v: string) => createHash('sha256').update(v).digest('hex');
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, Buffer.from(salt, 'hex'), 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) fail(422, 'INVALID_PASSWORD', 'Use a password of 12–128 characters.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$32768$8$1$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
async function verifyPassword(password: string, encoded?: string) {
  const p = (encoded ?? '').split('$');
  const valid = p.length === 6 && p[0] === 'scrypt' && p[1] === '32768' && p[2] === '8' && p[3] === '1' && /^[a-f0-9]{32}$/.test(p[4]) && /^[a-f0-9]{128}$/.test(p[5]);
  const actual = await derive(password, valid ? p[4] : '0'.repeat(32));
  const expected = Buffer.from(valid ? p[5] : '0'.repeat(128), 'hex');
  return timingSafeEqual(actual, expected) && valid;
}
export function assertOrigin(request: Request) {
  if (request.headers.get('origin') !== appOrigin() || request.headers.get('sec-fetch-site') === 'cross-site') fail(403, 'INVALID_ORIGIN', 'This mutation requires the configured application Origin.');
}
async function rateLimit(key: string, max: number) {
  const t = await tables(), windowMs = 15 * 60 * 1000, bucket = Math.floor(Date.now() / windowMs);
  const filter = { key: `${key}:${bucket}` }, expiresAt = new Date((bucket + 1) * windowMs + 60000);
  let counter;
  try {
    counter = await t.rates.findOneAndUpdate(filter, { $inc: { count: 1 }, $setOnInsert: { _id: randomUUID(), expiresAt } }, { upsert: true, returnDocument: 'after' });
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    counter = await t.rates.findOneAndUpdate(filter, { $inc: { count: 1 } }, { returnDocument: 'after' });
  }
  if (!counter) fail(503, 'RATE_LIMIT_UNAVAILABLE', 'Please try again later.');
  if (counter.count > max) throw new HttpError(429, 'RATE_LIMITED', 'Too many login attempts. Try again later.', { 'Retry-After': String(Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000))) });
}
export async function getAdminForToken(token?: string): Promise<{ email: string } | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const t = await tables();
  const session = await t.sessions.findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const admin = await t.admins.findOne({ _id: session.adminId, active: true, sessionVersion: session.sessionVersion });
  return admin ? { email: admin.email } : null;
}
export async function requireAdmin(): Promise<{ email: string }> {
  const admin = await getAdminForToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!admin) fail(401, 'UNAUTHORIZED', 'Administrator sign-in is required.');
  return admin;
}
function cookieOptions() { return { httpOnly: true, sameSite: 'strict' as const, secure: appOrigin().startsWith('https://'), path: '/' }; }
export async function login(request: Request, input: { email: string; password: string }) {
  await rateLimit('global', 300);
  await rateLimit(`email:${digest(input.email)}`, 6);
  const trusted = process.env.TRUSTED_CLIENT_IP_HEADER?.trim();
  if (trusted) {
    if (!/^[a-z0-9-]+$/i.test(trusted)) fail(503, 'CONFIGURATION_REQUIRED', 'Invalid trusted IP header configuration.');
    const ip = request.headers.get(trusted) ?? '';
    if (!isIP(ip)) fail(400, 'INVALID_CLIENT_IP', 'The trusted proxy must provide one valid client IP.');
    await rateLimit(`ip:${digest(ip)}`, 30);
  }
  const t = await tables(), admin = await t.admins.findOne({ email: input.email });
  const correct = await verifyPassword(input.password, admin?.passwordHash);
  if (!correct || !admin?.active) fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  const jar = await cookies(), previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) await t.sessions.deleteOne({ tokenHash: digest(previous) });
  const token = randomBytes(32).toString('base64url'), now = new Date(), expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000);
  await t.sessions.insertOne({ _id: randomUUID(), tokenHash: digest(token), adminId: admin._id, sessionVersion: admin.sessionVersion, createdAt: now, expiresAt });
  jar.set(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_SECONDS, expires: expiresAt });
  return { email: admin.email };
}
export async function logout() {
  const jar = await cookies(), token = jar.get(SESSION_COOKIE)?.value;
  try { if (token) await (await tables()).sessions.deleteOne({ tokenHash: digest(token) }); }
  finally { jar.set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0, expires: new Date(0) }); }
  return { ok: true };
}

